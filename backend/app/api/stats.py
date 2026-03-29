from fastapi import APIRouter, Depends
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime, timedelta, timezone

from app.database import get_db
from app.models import CommandEvent, DocumentationEntry, Host
from app.schemas import StatsResponse, HostResponse

router = APIRouter()


@router.get("/stats", response_model=StatsResponse)
async def get_stats(db: AsyncSession = Depends(get_db)):
    total_cmds = await db.scalar(select(func.count(CommandEvent.id))) or 0
    total_docs = await db.scalar(select(func.count(DocumentationEntry.id))) or 0
    total_hosts = await db.scalar(select(func.count(Host.id))) or 0

    # By section
    section_rows = await db.execute(
        select(DocumentationEntry.section, func.count(DocumentationEntry.id))
        .group_by(DocumentationEntry.section)
    )
    by_section = {row[0]: row[1] for row in section_rows}

    # By category
    cat_rows = await db.execute(
        select(DocumentationEntry.category, func.count(DocumentationEntry.id))
        .where(DocumentationEntry.category.isnot(None))
        .group_by(DocumentationEntry.category)
    )
    by_category = {row[0]: row[1] for row in cat_rows}

    # Recent (last 24h) - use string comparison for SQLite
    now = datetime.now(timezone.utc)
    yesterday = (now - timedelta(hours=24)).isoformat()
    recent = await db.scalar(
        select(func.count(CommandEvent.id)).where(
            CommandEvent.created_at >= yesterday
        )
    ) or 0

    return StatsResponse(
        total_commands=total_cmds,
        total_docs=total_docs,
        total_hosts=total_hosts,
        by_section=by_section,
        by_category=by_category,
        recent_commands=recent,
    )


@router.get("/hosts", response_model=list[HostResponse])
async def list_hosts(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Host).order_by(Host.last_seen.desc()))
    return result.scalars().all()
