#!/usr/bin/env bash
set -e

MODEL="${OLLAMA_MODEL:-llama3}"
EMBED_MODEL="${OLLAMA_EMBEDDING_MODEL:-nomic-embed-text}"

echo "==> Starting Ollama server..."
ollama serve &

# Wait for Ollama's HTTP API to come up
echo "==> Waiting for Ollama to be ready..."
until curl -sf http://localhost:11434/api/tags >/dev/null 2>&1; do
    sleep 1
done
echo "==> Ollama is up."

# Pull models in the BACKGROUND so the web port opens quickly.
# (On a free Space with ephemeral storage this re-runs on every cold boot.)
(
    echo "==> Pulling models (first boot can take several minutes)..."
    ollama pull "$MODEL"
    ollama pull "$EMBED_MODEL"
    echo "==> Models ready: $MODEL, $EMBED_MODEL"
) &

# Start the FastAPI app in the foreground on HF's required port.
cd backend
exec uvicorn main:app --host 0.0.0.0 --port 7860
