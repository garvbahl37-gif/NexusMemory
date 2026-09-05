"""Vercel entrypoint.

Vercel serves everything under /api from this file, so the application is
mounted at that prefix — mounting (rather than a root_path) is what strips
"/api" before FastAPI routes the request.
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "backend"))

from fastapi import FastAPI  # noqa: E402
from main import app as nexus  # noqa: E402

app = FastAPI(docs_url=None, redoc_url=None)
app.mount("/api", nexus)
