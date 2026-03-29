import logging
from functools import lru_cache
from sentence_transformers import SentenceTransformer
from app.config import get_settings

logger = logging.getLogger(__name__)

_model = None


def get_model() -> SentenceTransformer:
    global _model
    if _model is None:
        settings = get_settings()
        logger.info(f"Loading embedding model: {settings.embedding_model}")
        _model = SentenceTransformer(settings.embedding_model)
        logger.info("Embedding model loaded")
    return _model


def generate_embedding(text: str) -> list[float]:
    """Generate a 384-dim embedding for the given text."""
    model = get_model()
    embedding = model.encode(text, normalize_embeddings=True)
    return embedding.tolist()


def build_embedding_text(entry: dict) -> str:
    """Build rich text for embedding from a documentation entry."""
    parts = [
        entry.get("command_normalized", ""),
        entry.get("description", ""),
        " ".join(entry.get("tags", [])),
        " ".join(entry.get("synonyms", [])),
        entry.get("category", ""),
    ]
    return " | ".join(p for p in parts if p)
