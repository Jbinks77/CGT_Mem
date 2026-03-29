from fastapi import APIRouter, Depends, BackgroundTasks
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import CommandEvent, Host, DocumentationEntry
from app.schemas import CommandIngest, CommandResponse
from app.services.secrets import mask_secrets, normalize_command
from app.services.enrichment import enrich_command
from app.services.embeddings import generate_embedding, build_embedding_text

router = APIRouter()


@router.post("/commands/ingest", response_model=CommandResponse)
async def ingest_command(
    payload: CommandIngest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
):
    # Mask secrets
    masked_command, is_sensitive = mask_secrets(payload.command)
    normalized = normalize_command(payload.command)

    # Upsert host
    host_result = await db.execute(
        select(Host).where(Host.hostname == payload.hostname)
    )
    host = host_result.scalar_one_or_none()
    if host is None:
        host = Host(hostname=payload.hostname, os=payload.os)
        db.add(host)
        await db.flush()
    else:
        host.last_seen = payload.timestamp
        if payload.os:
            host.os = payload.os

    # Create command event
    event = CommandEvent(
        command=masked_command,
        command_normalized=normalized,
        shell=payload.shell,
        username=payload.username,
        host_id=host.id,
        cwd=payload.cwd,
        exit_code=payload.exit_code,
        duration_ms=payload.duration_ms,
        command_type=payload.command_type,
        is_sensitive=is_sensitive,
        raw_command=masked_command,
    )
    db.add(event)
    await db.commit()
    await db.refresh(event)

    # Enrich in background
    background_tasks.add_task(
        _enrich_and_store, event.id, normalized, payload.shell, payload.os
    )

    return event


async def _enrich_and_store(event_id: int, normalized: str, shell: str, os_name: str | None):
    """Enrich the command and create/update documentation entry."""
    from app.database import async_session

    async with async_session() as db:
        # Check if doc already exists
        existing = await db.execute(
            select(DocumentationEntry).where(
                DocumentationEntry.command_normalized == normalized
            )
        )
        doc = existing.scalar_one_or_none()

        if doc:
            doc.usage_count = (doc.usage_count or 1) + 1
            await db.commit()
            return

        # Enrich
        enrichment = await enrich_command(normalized, shell, os_name)

        # Generate embedding
        embedding_text = build_embedding_text({
            "command_normalized": normalized,
            **enrichment,
        })
        embedding = generate_embedding(embedding_text)

        doc = DocumentationEntry(
            command_normalized=normalized,
            description=enrichment.get("description"),
            section=enrichment.get("section", "linux"),
            category=enrichment.get("category"),
            tags=enrichment.get("tags", []),
            synonyms=enrichment.get("synonyms", []),
            is_sensitive=enrichment.get("is_sensitive", False),
            embedding=embedding,
        )
        db.add(doc)
        await db.commit()
