from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import DocumentationEntry
from app.schemas import DocEntryResponse
from app.services.embeddings import generate_embedding, build_embedding_text

router = APIRouter()


class ScriptPayload(BaseModel):
    title: str
    script: str
    description: str = ""
    tags: list[str] = []
    section: str = "linux"


@router.post("/scripts", response_model=DocEntryResponse)
async def add_script(payload: ScriptPayload, db: AsyncSession = Depends(get_db)):
    # Use title as the normalized command key
    normalized = payload.title.strip()

    # Upsert
    existing = await db.execute(
        select(DocumentationEntry).where(DocumentationEntry.command_normalized == normalized)
    )
    doc = existing.scalar_one_or_none()

    # Build embedding on the full script content
    emb_text = build_embedding_text({
        "command_normalized": normalized,
        "description": payload.description or payload.title,
        "tags": payload.tags,
        "synonyms": [],
        "category": "script",
    })
    # Append script content for richer semantic search
    emb_text += " " + payload.script[:500]
    embedding = generate_embedding(emb_text)

    if doc:
        doc.description = payload.description or doc.description
        doc.section = payload.section
        doc.tags = payload.tags
        doc.embedding = embedding
        doc.usage_count = (doc.usage_count or 0) + 1
    else:
        doc = DocumentationEntry(
            command_normalized=normalized,
            description=payload.description or payload.title,
            section=payload.section,
            category="script",
            tags=payload.tags,
            synonyms=[payload.title.lower()],
            is_sensitive=False,
            embedding=embedding,
        )
        db.add(doc)

    await db.commit()
    await db.refresh(doc)
    return doc
