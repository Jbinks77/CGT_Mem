from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import logging

from app.database import init_db
from app.api import commands, search, documentation, stats, scripts, download

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting Smart Command Memory API")
    # Create tables
    await init_db()
    logger.info("Database ready")
    # Pre-load embedding model
    from app.services.embeddings import get_model
    get_model()
    logger.info("Embedding model ready")
    yield
    logger.info("Shutting down")


app = FastAPI(
    title="Smart Command Memory",
    description="Capture, enrich, and search shell commands",
    version="1.0.0",
    lifespan=lifespan,
)

from app.config import get_settings as _get_settings
_settings = _get_settings()

app.add_middleware(
    CORSMiddleware,
    allow_origins=_settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(commands.router, prefix="/api", tags=["commands"])
app.include_router(search.router, prefix="/api", tags=["search"])
app.include_router(documentation.router, prefix="/api", tags=["documentation"])
app.include_router(stats.router, prefix="/api", tags=["stats"])
app.include_router(scripts.router, prefix="/api", tags=["scripts"])
app.include_router(download.router, prefix="/api", tags=["download"])


@app.get("/api/health")
async def health():
    return {"status": "ok"}
