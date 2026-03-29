from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import DocumentationEntry
from app.schemas import DocEntryResponse, DocEntryUpdate

router = APIRouter()

VALID_SECTIONS = ("linux", "windows", "automation")


@router.get("/documentation", response_model=list[DocEntryResponse])
async def list_documentation(
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(DocumentationEntry).order_by(DocumentationEntry.usage_count.desc())
    )
    return result.scalars().all()


@router.get("/documentation/entry/{entry_id}", response_model=DocEntryResponse)
async def get_entry(
    entry_id: int,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(DocumentationEntry).where(DocumentationEntry.id == entry_id)
    )
    entry = result.scalar_one_or_none()
    if not entry:
        raise HTTPException(404, "Entry not found")
    return entry


@router.patch("/documentation/entry/{entry_id}", response_model=DocEntryResponse)
async def update_entry(
    entry_id: int,
    payload: DocEntryUpdate,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(DocumentationEntry).where(DocumentationEntry.id == entry_id)
    )
    entry = result.scalar_one_or_none()
    if not entry:
        raise HTTPException(404, "Entry not found")

    if payload.description is not None:
        entry.description = payload.description
    if payload.section is not None:
        if payload.section not in VALID_SECTIONS:
            raise HTTPException(400, "Section must be linux, windows, or automation")
        entry.section = payload.section
    if payload.category is not None:
        entry.category = payload.category
    if payload.tags is not None:
        entry.tags = payload.tags
    if payload.synonyms is not None:
        entry.synonyms = payload.synonyms
    if payload.is_sensitive is not None:
        entry.is_sensitive = payload.is_sensitive

    await db.commit()
    await db.refresh(entry)
    return entry


@router.get("/documentation/{section}", response_model=list[DocEntryResponse])
async def list_by_section(
    section: str,
    db: AsyncSession = Depends(get_db),
):
    if section not in VALID_SECTIONS:
        raise HTTPException(404, "Section must be linux, windows, or automation")

    result = await db.execute(
        select(DocumentationEntry)
        .where(DocumentationEntry.section == section)
        .order_by(DocumentationEntry.usage_count.desc())
    )
    return result.scalars().all()
