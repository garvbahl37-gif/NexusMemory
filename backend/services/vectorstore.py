"""Vector storage.

Vectors live in one Postgres table, queried directly with pgvector. Reaching
them through a vector-store abstraction cost roughly 80 MB of dependencies for
what amounts to four SQL statements, and buried the per-client scoping that
memory recall depends on — so the SQL is written out here instead.

SQLite uses the same table and scores in Python. That is fast enough for a
local dev database and means local development needs no vector engine at all.
"""
import json
import logging
import math
import uuid
from dataclasses import dataclass, field

from sqlalchemy import text

from config import settings
from database import engine, IS_POSTGRES
from services.embeddings_provider import get_embeddings

logger = logging.getLogger(__name__)

TABLE = "nexus_vectors"
DIMS = settings.EMBEDDING_DIMENSIONS

_schema_ready = False
_vector_type: str | None = None


@dataclass
class Hit:
    """One retrieved chunk. `score` is cosine similarity, so 1.0 is identical."""

    id: str
    content: str
    metadata: dict = field(default_factory=dict)
    score: float = 0.0
    embedding: list[float] | None = None


# ── Schema ────────────────────────────────────────────────────────────────────


def _resolve_vector_type(conn) -> str:
    """Qualify the vector type with the schema the extension actually lives in.

    Supabase installs pgvector into `extensions` rather than `public`, and the
    search_path is not guaranteed to include it.
    """
    row = conn.execute(
        text(
            "SELECT n.nspname FROM pg_extension e "
            "JOIN pg_namespace n ON n.oid = e.extnamespace "
            "WHERE e.extname = 'vector'"
        )
    ).first()
    schema = row[0] if row else "public"
    return "vector" if schema == "public" else f"{schema}.vector"


def ensure_schema() -> None:
    """Create the vector table once per process."""
    global _schema_ready, _vector_type
    if _schema_ready:
        return

    if IS_POSTGRES:
        # A least-privilege application role cannot CREATE EXTENSION, and on a
        # managed Postgres pgvector is usually installed already — so try, and
        # let _resolve_vector_type be the thing that decides if it is there.
        try:
            with engine.begin() as conn:
                conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
        except Exception as e:
            logger.info(f"Skipping CREATE EXTENSION vector: {e}")

        with engine.begin() as conn:
            _vector_type = _resolve_vector_type(conn)
            conn.execute(
                text(
                    f"""
                    CREATE TABLE IF NOT EXISTS {TABLE} (
                        id         TEXT PRIMARY KEY,
                        collection TEXT NOT NULL,
                        client_id  TEXT,
                        content    TEXT NOT NULL,
                        meta       JSONB NOT NULL DEFAULT '{{}}'::jsonb,
                        embedding  {_vector_type}({DIMS}) NOT NULL
                    )
                    """
                )
            )
            conn.execute(
                text(
                    f"CREATE INDEX IF NOT EXISTS {TABLE}_collection_idx "
                    f"ON {TABLE} (collection)"
                )
            )
            conn.execute(
                text(
                    f"CREATE INDEX IF NOT EXISTS {TABLE}_client_idx "
                    f"ON {TABLE} (client_id)"
                )
            )
        # The ANN index is an optimisation, not a requirement — an exact scan
        # returns the same rows, just slower, so never fail startup over it.
        try:
            with engine.begin() as conn:
                conn.execute(
                    text(
                        f"CREATE INDEX IF NOT EXISTS {TABLE}_embedding_idx ON {TABLE} "
                        f"USING hnsw (embedding vector_cosine_ops)"
                    )
                )
        except Exception as e:
            logger.warning(f"Vector index not created (queries still work): {e}")
    else:
        with engine.begin() as conn:
            conn.execute(
                text(
                    f"""
                    CREATE TABLE IF NOT EXISTS {TABLE} (
                        id         TEXT PRIMARY KEY,
                        collection TEXT NOT NULL,
                        client_id  TEXT,
                        content    TEXT NOT NULL,
                        meta       TEXT NOT NULL DEFAULT '{{}}',
                        embedding  TEXT NOT NULL
                    )
                    """
                )
            )

    _schema_ready = True
    logger.info(f"Vector table ready ({'pgvector' if IS_POSTGRES else 'sqlite'})")


# ── Writing ───────────────────────────────────────────────────────────────────


def _encode(vector: list[float]) -> str:
    return "[" + ",".join(f"{v:.7f}" for v in vector) + "]"


def add_texts(
    collection: str,
    texts: list[str],
    metadatas: list[dict] | None = None,
    ids: list[str] | None = None,
    client_id: str | None = None,
) -> list[str]:
    """Embed and store texts. Returns the ids written."""
    if not texts:
        return []

    ensure_schema()
    metadatas = metadatas or [{} for _ in texts]
    ids = ids or [str(uuid.uuid4()) for _ in texts]
    vectors = get_embeddings().embed_documents(texts)

    vtype = _vector_type or "vector"
    if IS_POSTGRES:
        stmt = text(
            f"INSERT INTO {TABLE} (id, collection, client_id, content, meta, embedding) "
            f"VALUES (:id, :collection, :client_id, :content, CAST(:meta AS jsonb), "
            f"CAST(:embedding AS {vtype})) "
            f"ON CONFLICT (id) DO UPDATE SET content = EXCLUDED.content, "
            f"meta = EXCLUDED.meta, embedding = EXCLUDED.embedding"
        )
    else:
        stmt = text(
            f"INSERT OR REPLACE INTO {TABLE} "
            f"(id, collection, client_id, content, meta, embedding) "
            f"VALUES (:id, :collection, :client_id, :content, :meta, :embedding)"
        )

    with engine.begin() as conn:
        for _id, content, meta, vector in zip(ids, texts, metadatas, vectors):
            conn.execute(
                stmt,
                {
                    "id": _id,
                    "collection": collection,
                    "client_id": client_id,
                    "content": content,
                    "meta": json.dumps(meta or {}),
                    "embedding": _encode(vector),
                },
            )

    logger.info(f"Stored {len(ids)} vectors in '{collection}'")
    return ids


# ── Reading ───────────────────────────────────────────────────────────────────


def _cosine(a: list[float], b: list[float]) -> float:
    dot = sum(x * y for x, y in zip(a, b))
    na = math.sqrt(sum(x * x for x in a)) or 1.0
    nb = math.sqrt(sum(x * x for x in b)) or 1.0
    return dot / (na * nb)


def _mmr(
    query: list[float],
    candidates: list[Hit],
    k: int,
    lambda_mult: float = 0.7,
) -> list[Hit]:
    """Greedy maximal marginal relevance: relevance traded off against overlap.

    Keeps retrieved chunks from being four paraphrases of the same paragraph.
    """
    selected: list[Hit] = []
    pool = list(candidates)

    while pool and len(selected) < k:
        best, best_score = None, -1e9
        for hit in pool:
            redundancy = max(
                (_cosine(hit.embedding, s.embedding) for s in selected),
                default=0.0,
            )
            score = lambda_mult * hit.score - (1 - lambda_mult) * redundancy
            if score > best_score:
                best, best_score = hit, score
        selected.append(best)
        pool.remove(best)

    return selected


def search(
    collection: str,
    query: str,
    k: int = 4,
    client_id: str | None = None,
    use_mmr: bool = False,
    lambda_mult: float = 0.7,
) -> list[Hit]:
    """Nearest chunks in `collection`, optionally scoped to one client."""
    ensure_schema()

    query_vector = get_embeddings().embed_query(query)
    # MMR needs a wider net to have anything to diversify between.
    fetch_k = k * 3 if use_mmr else k

    if IS_POSTGRES:
        vtype = _vector_type or "vector"
        rows = _search_postgres(collection, query_vector, fetch_k, client_id, vtype, use_mmr)
    else:
        rows = _search_sqlite(collection, query_vector, fetch_k, client_id)

    if use_mmr and len(rows) > k:
        rows = _mmr(query_vector, rows, k, lambda_mult)

    return rows[:k]


def _search_postgres(collection, query_vector, fetch_k, client_id, vtype, want_vectors):
    embedding_col = ", embedding::text AS emb" if want_vectors else ""
    sql = text(
        f"""
        SELECT id, content, meta::text AS meta,
               1 - (embedding <=> CAST(:q AS {vtype})) AS score{embedding_col}
        FROM {TABLE}
        WHERE collection = :collection
          AND (CAST(:client_id AS text) IS NULL OR client_id = CAST(:client_id AS text))
        ORDER BY embedding <=> CAST(:q AS {vtype})
        LIMIT :k
        """
    )
    with engine.connect() as conn:
        result = conn.execute(
            sql,
            {
                "q": _encode(query_vector),
                "collection": collection,
                "client_id": client_id,
                "k": fetch_k,
            },
        ).mappings().all()

    return [
        Hit(
            id=r["id"],
            content=r["content"],
            metadata=json.loads(r["meta"] or "{}"),
            score=float(r["score"]),
            embedding=json.loads(r["emb"]) if want_vectors else None,
        )
        for r in result
    ]


def _search_sqlite(collection, query_vector, fetch_k, client_id):
    sql = text(
        f"SELECT id, content, meta, embedding FROM {TABLE} "
        f"WHERE collection = :collection "
        f"AND (:client_id IS NULL OR client_id = :client_id)"
    )
    with engine.connect() as conn:
        rows = conn.execute(
            sql, {"collection": collection, "client_id": client_id}
        ).mappings().all()

    hits = []
    for r in rows:
        vector = json.loads(r["embedding"])
        hits.append(
            Hit(
                id=r["id"],
                content=r["content"],
                metadata=json.loads(r["meta"] or "{}"),
                score=_cosine(query_vector, vector),
                embedding=vector,
            )
        )
    hits.sort(key=lambda h: h.score, reverse=True)
    return hits[:fetch_k]


# ── Deleting ──────────────────────────────────────────────────────────────────


def delete_ids(ids: list[str]) -> None:
    if not ids:
        return
    ensure_schema()
    with engine.begin() as conn:
        for _id in ids:
            conn.execute(text(f"DELETE FROM {TABLE} WHERE id = :id"), {"id": _id})


def drop_collection(collection: str) -> bool:
    """Remove every vector in a collection (a deleted document, typically)."""
    try:
        ensure_schema()
        with engine.begin() as conn:
            conn.execute(
                text(f"DELETE FROM {TABLE} WHERE collection = :c"),
                {"c": collection},
            )
        logger.info(f"Dropped collection '{collection}'")
        return True
    except Exception as e:
        logger.error(f"Could not drop collection '{collection}': {e}")
        return False
