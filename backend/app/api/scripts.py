from fastapi import APIRouter, Depends, BackgroundTasks
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
import threading, asyncio

from app.database import get_db, async_session
from app.models import DocumentationEntry
from app.schemas import DocEntryResponse
from app.services.embeddings import generate_embedding, build_embedding_text
from app.services.ai_commenter import comment_script, get_script_status

router = APIRouter()

# Langue par section
SECTION_LANG = {
    "linux":      "bash",
    "windows":    "powershell",
    "automation": "python",
}


class ScriptPayload(BaseModel):
    title: str
    script: str
    description: str = ""
    tags: list[str] = []
    section: str = "linux"


def _trigger_script_ai(doc_id: int, script: str, language: str) -> None:
    """Lance le commentaire IA dans un thread séparé."""
    def thread_fn():
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)

        async def do_update(new_script: str):
            async with async_session() as db:
                result = await db.execute(
                    select(DocumentationEntry).where(DocumentationEntry.id == doc_id)
                )
                doc = result.scalar_one_or_none()
                if doc:
                    doc.description = new_script
                    await db.commit()

        def sync_db_update(new_script: str):
            loop.run_until_complete(do_update(new_script))

        comment_script(doc_id, script, language, sync_db_update)
        loop.close()

    threading.Thread(target=thread_fn, daemon=True).start()


@router.post("/scripts", response_model=DocEntryResponse)
async def add_script(payload: ScriptPayload, background_tasks: BackgroundTasks, db: AsyncSession = Depends(get_db)):
    normalized = payload.title.strip()
    language = SECTION_LANG.get(payload.section, "bash")

    # Upsert
    existing = await db.execute(
        select(DocumentationEntry).where(DocumentationEntry.command_normalized == normalized)
    )
    doc = existing.scalar_one_or_none()

    # Embedding enrichi avec le contenu du script
    emb_text = build_embedding_text({
        "command_normalized": normalized,
        "description": payload.description or payload.title,
        "tags": payload.tags,
        "synonyms": [],
        "category": "script",
    })
    emb_text += " " + payload.script[:500]
    embedding = generate_embedding(emb_text)

    if doc:
        # Stocke le script dans description pour qu'il soit visible en recherche
        doc.description = payload.script
        doc.section = payload.section
        doc.tags = payload.tags
        doc.embedding = embedding
        doc.usage_count = (doc.usage_count or 0) + 1
    else:
        doc = DocumentationEntry(
            command_normalized=normalized,
            description=payload.script,   # stocke le script brut, l'IA le commentera
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

    # Lance le commentaire IA en arrière-plan
    background_tasks.add_task(_trigger_script_ai, doc.id, payload.script, language)

    return doc


@router.get("/scripts/{doc_id}/ai-status")
async def script_ai_status(doc_id: int):
    return {"doc_id": doc_id, "status": get_script_status(doc_id)}
