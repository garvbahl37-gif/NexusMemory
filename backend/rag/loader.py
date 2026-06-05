from langchain_community.document_loaders import PyPDFLoader, TextLoader
from langchain.schema import Document
from pathlib import Path
import logging

logger = logging.getLogger(__name__)


def load_document(file_path: str) -> list[Document]:
    """
    Load a document based on file extension.
    Supports: PDF, TXT, MD
    """
    path = Path(file_path)
    extension = path.suffix.lower()

    try:
        if extension == ".pdf":
            loader = PyPDFLoader(file_path)
            documents = loader.load()
            logger.info(f"Loaded PDF: {path.name} — {len(documents)} pages")
            return documents

        elif extension in [".txt", ".md"]:
            loader = TextLoader(file_path, encoding="utf-8")
            documents = loader.load()
            logger.info(f"Loaded text file: {path.name}")
            return documents

        else:
            raise ValueError(f"Unsupported file type: {extension}")

    except Exception as e:
        logger.error(f"Failed to load document {file_path}: {e}")
        raise