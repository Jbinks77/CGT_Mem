from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.schemas import SearchResponse, SearchResult
from app.services.search import hybrid_search

router = APIRouter()


@router.get("/search", response_model=SearchResponse)
async def search(
    q: str = Query(..., min_length=1, description="Search query"),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    results = await hybrid_search(db, q, limit)

    return SearchResponse(
        query=q,
        results=[
            SearchResult(
                id=r["id"],
                command_normalized=r["command_normalized"],
                description=r["description"],
                section=r["section"],
                category=r["category"],
                tags=r["tags"] or [],
                score=float(r["score"] or 0),
            )
            for r in results
        ],
        total=len(results),
    )
