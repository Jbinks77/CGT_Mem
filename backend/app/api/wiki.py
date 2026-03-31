"""
Wiki — rich text documents (TipTap JSON stored as text).
Full CRUD: create, list, get, update, delete.
"""

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel
from typing import Optional
import threading

from app.database import get_db, async_session
from app.models import WikiDocument
from app.services.ai_commenter import comment_wiki_content, get_wiki_status

router = APIRouter()


# ─── Schemas ─────────────────────────────────────────────────────────────────

class WikiDocCreate(BaseModel):
    title: str
    content: str = ""
    cover_color: str = "#6c63ff"
    tags: list[str] = []
    section: str = ""


class WikiDocUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    cover_color: Optional[str] = None
    tags: Optional[list[str]] = None
    section: Optional[str] = None


class WikiDocOut(BaseModel):
    id: int
    title: str
    content: str
    cover_color: str
    tags: list[str]
    section: str
    created_at: str
    updated_at: str

    model_config = {"from_attributes": True}

    @classmethod
    def from_orm_safe(cls, obj: WikiDocument) -> "WikiDocOut":
        return cls(
            id=obj.id,
            title=obj.title,
            content=obj.content or "",
            cover_color=obj.cover_color or "#6c63ff",
            tags=obj.tags or [],
            section=obj.section or "",
            created_at=obj.created_at.isoformat() if obj.created_at else "",
            updated_at=obj.updated_at.isoformat() if obj.updated_at else "",
        )


# ─── Helper : background AI task (sync thread → own async session) ────────────

def _has_code_block(content: str) -> bool:
    """Retourne True si le JSON TipTap contient au moins un codeBlock."""
    return '"codeBlock"' in (content or "")


def _spawn_ai_wiki(doc_id: int, content: str) -> None:
    """Lance le commentaire IA dans un thread séparé avec sa propre session DB."""
    import asyncio

    async def _run():
        async with async_session() as db:
            async def update_content(new_content: str):
                result = await db.execute(select(WikiDocument).where(WikiDocument.id == doc_id))
                doc = result.scalar_one_or_none()
                if doc:
                    doc.content = new_content
                    await db.commit()

            comment_wiki_content(doc_id, content, lambda nc: asyncio.get_event_loop().run_until_complete(update_content(nc)))

    # Exécute dans un nouveau event loop dans ce thread
    loop = asyncio.new_event_loop()

    async def _run_with_update():
        async with async_session() as db:
            def sync_update(new_content: str):
                async def _do():
                    result = await db.execute(select(WikiDocument).where(WikiDocument.id == doc_id))
                    doc = result.scalar_one_or_none()
                    if doc:
                        doc.content = new_content
                        await db.commit()
                loop.run_until_complete(_do())

            await loop.run_in_executor(None, comment_wiki_content, doc_id, content, sync_update)

    loop.run_until_complete(_run_with_update())
    loop.close()


def _trigger_wiki_ai(doc_id: int, content: str) -> None:
    """Démarre le thread IA si le contenu contient du code."""
    if not _has_code_block(content):
        return

    import asyncio

    def thread_fn():
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)

        async def do_update(new_content: str):
            async with async_session() as db:
                result = await db.execute(select(WikiDocument).where(WikiDocument.id == doc_id))
                doc = result.scalar_one_or_none()
                if doc:
                    doc.content = new_content
                    await db.commit()

        def sync_db_update(new_content: str):
            loop.run_until_complete(do_update(new_content))

        comment_wiki_content(doc_id, content, sync_db_update)
        loop.close()

    threading.Thread(target=thread_fn, daemon=True).start()


# ─── Routes ──────────────────────────────────────────────────────────────────

@router.get("/wiki")
async def list_docs(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(WikiDocument).order_by(WikiDocument.updated_at.desc())
    )
    docs = result.scalars().all()
    return [WikiDocOut.from_orm_safe(d) for d in docs]


@router.post("/wiki", status_code=201)
async def create_doc(payload: WikiDocCreate, background_tasks: BackgroundTasks, db: AsyncSession = Depends(get_db)):
    doc = WikiDocument(**payload.model_dump())
    db.add(doc)
    await db.commit()
    await db.refresh(doc)
    # Déclenche l'annotation IA en arrière-plan
    background_tasks.add_task(_trigger_wiki_ai, doc.id, payload.content)
    return WikiDocOut.from_orm_safe(doc)


@router.get("/wiki/{doc_id}/ai-status")
async def wiki_ai_status(doc_id: int):
    return {"doc_id": doc_id, "status": get_wiki_status(doc_id)}


@router.get("/wiki/{doc_id}")
async def get_doc(doc_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(WikiDocument).where(WikiDocument.id == doc_id)
    )
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    return WikiDocOut.from_orm_safe(doc)


@router.patch("/wiki/{doc_id}")
async def update_doc(doc_id: int, payload: WikiDocUpdate, background_tasks: BackgroundTasks, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(WikiDocument).where(WikiDocument.id == doc_id)
    )
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    for k, v in payload.model_dump(exclude_none=True).items():
        setattr(doc, k, v)
    await db.commit()
    await db.refresh(doc)
    # Re-commenter si le contenu a changé et contient du code
    if payload.content is not None:
        background_tasks.add_task(_trigger_wiki_ai, doc.id, payload.content)
    return WikiDocOut.from_orm_safe(doc)


@router.delete("/wiki/{doc_id}")
async def delete_doc(doc_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(WikiDocument).where(WikiDocument.id == doc_id)
    )
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    await db.delete(doc)
    await db.commit()
    return {"status": "deleted"}
