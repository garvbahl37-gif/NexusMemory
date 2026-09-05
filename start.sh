#!/usr/bin/env bash
set -e

# Chat runs on whichever hosted key is present — OLLAMA_API_KEY or
# GROQ_API_KEY. Embeddings follow EMBEDDING_PROVIDER; in a container they can
# also run in-process, which is what requirements-local.txt is for.
if [ -z "$OLLAMA_API_KEY" ] && [ -z "$GROQ_API_KEY" ]; then
    echo "WARNING: no chat provider configured."
    echo "         Set OLLAMA_API_KEY (https://ollama.com/settings/keys) or"
    echo "         GROQ_API_KEY (https://console.groq.com), or run: ollama serve"
fi

cd backend
exec uvicorn main:app --host 0.0.0.0 --port "${PORT:-7860}"
