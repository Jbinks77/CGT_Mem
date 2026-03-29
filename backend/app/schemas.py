from pydantic import BaseModel
from datetime import datetime


class CommandIngest(BaseModel):
    command: str
    shell: str
    hostname: str
    username: str | None = None
    os: str | None = None
    cwd: str | None = None
    exit_code: int | None = None
    duration_ms: int | None = None
    command_type: str = "command"
    timestamp: datetime | None = None


class CommandResponse(BaseModel):
    id: int
    command: str
    command_normalized: str | None
    shell: str
    username: str | None
    cwd: str | None
    exit_code: int | None
    duration_ms: int | None
    is_sensitive: bool
    created_at: datetime

    class Config:
        from_attributes = True


class DocEntryResponse(BaseModel):
    id: int
    command_normalized: str
    description: str | None
    section: str
    category: str | None
    tags: list[str]
    synonyms: list[str]
    is_sensitive: bool
    usage_count: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class SearchResult(BaseModel):
    id: int
    command_normalized: str
    description: str | None
    section: str
    category: str | None
    tags: list[str]
    score: float


class SearchResponse(BaseModel):
    query: str
    results: list[SearchResult]
    total: int


class DocEntryUpdate(BaseModel):
    description: str | None = None
    section: str | None = None
    category: str | None = None
    tags: list[str] | None = None
    synonyms: list[str] | None = None
    is_sensitive: bool | None = None


class StatsResponse(BaseModel):
    total_commands: int
    total_docs: int
    total_hosts: int
    by_section: dict[str, int]
    by_category: dict[str, int]
    recent_commands: int


class HostResponse(BaseModel):
    id: int
    hostname: str
    os: str | None
    first_seen: datetime
    last_seen: datetime

    class Config:
        from_attributes = True
