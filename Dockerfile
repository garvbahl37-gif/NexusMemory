FROM python:3.11-slim

# ── System deps + Ollama ─────────────────────────────────────────────
RUN apt-get update && apt-get install -y --no-install-recommends \
        curl ca-certificates \
    && rm -rf /var/lib/apt/lists/* \
    && curl -fsSL https://ollama.com/install.sh | sh

# ── Non-root user (HF Spaces runs as uid 1000) ───────────────────────
RUN useradd -m -u 1000 user
ENV HOME=/home/user \
    PATH=/home/user/.local/bin:$PATH \
    OLLAMA_HOST=0.0.0.0:11434 \
    OLLAMA_MODELS=/home/user/.ollama/models

WORKDIR /home/user/app

# ── Python dependencies ──────────────────────────────────────────────
COPY --chown=user requirements.txt .
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -r requirements.txt

# ── Application code ─────────────────────────────────────────────────
COPY --chown=user backend/ ./backend/
COPY --chown=user start.sh ./start.sh
RUN chmod +x ./start.sh

USER user

# HF Spaces expects the app on port 7860
EXPOSE 7860

CMD ["./start.sh"]
