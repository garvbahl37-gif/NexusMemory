FROM python:3.12-slim

RUN useradd -m -u 1000 user
ENV HOME=/home/user \
    PATH=/home/user/.local/bin:$PATH \
    SENTENCE_TRANSFORMERS_HOME=/home/user/.cache/sentence-transformers

WORKDIR /home/user/app

# requirements-local.txt pulls in requirements.txt plus the extras a
# long-lived container can afford (local CPU embeddings, a local Ollama).
COPY --chown=user requirements.txt requirements-local.txt ./
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -r requirements-local.txt

COPY --chown=user backend/ ./backend/
COPY --chown=user start.sh ./start.sh
RUN chmod +x ./start.sh

USER user
EXPOSE 7860
CMD ["./start.sh"]
