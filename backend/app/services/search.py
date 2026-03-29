import numpy as np
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models import DocumentationEntry
from app.services.embeddings import generate_embedding


async def hybrid_search(db: AsyncSession, query: str, limit: int = 20) -> list[dict]:
    """Combine text search + semantic search (numpy cosine similarity)."""

    query_embedding = np.array(generate_embedding(query), dtype=np.float32)
    query_lower = query.lower()
    query_words = query_lower.split()

    # Load all doc entries
    result = await db.execute(select(DocumentationEntry))
    entries = result.scalars().all()

    scored = []
    for entry in entries:
        text_score = _text_score(entry, query_lower, query_words)
        semantic_score = _semantic_score(entry, query_embedding)
        combined = text_score * 0.4 + semantic_score * 0.6

        if combined > 0.05:
            scored.append({
                "id": entry.id,
                "command_normalized": entry.command_normalized,
                "description": entry.description,
                "section": entry.section,
                "category": entry.category,
                "tags": entry.tags or [],
                "score": round(combined, 4),
            })

    scored.sort(key=lambda x: x["score"], reverse=True)
    return scored[:limit]


def _text_score(entry: DocumentationEntry, query_lower: str, query_words: list[str]) -> float:
    score = 0.0
    cmd = (entry.command_normalized or "").lower()
    desc = (entry.description or "").lower()
    tags = [t.lower() for t in (entry.tags or [])]
    synonyms = [s.lower() for s in (entry.synonyms or [])]

    # Exact command match
    if query_lower == cmd:
        score += 1.0
    elif query_lower in cmd:
        score += 0.6
    elif cmd in query_lower:
        score += 0.4

    # Tag match
    for word in query_words:
        if word in tags:
            score += 0.3

    # Synonym match
    for syn in synonyms:
        if query_lower in syn or syn in query_lower:
            score += 0.5
            break
        # Partial word match on synonyms
        for word in query_words:
            if word in syn:
                score += 0.2
                break

    # Description match
    for word in query_words:
        if word in desc:
            score += 0.15

    return min(score, 1.0)


def _semantic_score(entry: DocumentationEntry, query_embedding: np.ndarray) -> float:
    if not entry.embedding:
        return 0.0
    entry_emb = np.array(entry.embedding, dtype=np.float32)
    # Cosine similarity (embeddings are already normalized)
    sim = float(np.dot(query_embedding, entry_emb))
    # Shift to 0-1 range (cosine sim can be negative)
    return max(0.0, sim)
