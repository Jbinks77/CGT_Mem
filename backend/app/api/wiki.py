"""
Wiki — rich text documents (TipTap JSON stored as text).
Full CRUD: create, list, get, update, delete.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel
from typing import Optional

from app.database import get_db
from app.models import WikiDocument

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


# ─── Routes ──────────────────────────────────────────────────────────────────

@router.get("/wiki")
async def list_docs(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(WikiDocument).order_by(WikiDocument.updated_at.desc())
    )
    docs = result.scalars().all()
    return [WikiDocOut.from_orm_safe(d) for d in docs]


@router.post("/wiki", status_code=201)
async def create_doc(payload: WikiDocCreate, db: AsyncSession = Depends(get_db)):
    doc = WikiDocument(**payload.model_dump())
    db.add(doc)
    await db.commit()
    await db.refresh(doc)
    return WikiDocOut.from_orm_safe(doc)


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
async def update_doc(doc_id: int, payload: WikiDocUpdate, db: AsyncSession = Depends(get_db)):
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
