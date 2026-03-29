from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, ForeignKey, JSON
from sqlalchemy.sql import func
from app.database import Base


class Host(Base):
    __tablename__ = "hosts"
    id = Column(Integer, primary_key=True)
    hostname = Column(String(255), unique=True, nullable=False)
    os = Column(String(100))
    first_seen = Column(DateTime, server_default=func.now())
    last_seen = Column(DateTime, server_default=func.now())


class CommandEvent(Base):
    __tablename__ = "command_events"
    id = Column(Integer, primary_key=True)
    command = Column(Text, nullable=False)
    command_normalized = Column(Text)
    shell = Column(String(50), nullable=False)
    username = Column(String(255))
    host_id = Column(Integer, ForeignKey("hosts.id"))
    cwd = Column(Text)
    exit_code = Column(Integer)
    duration_ms = Column(Integer)
    command_type = Column(String(20), default="command")
    is_sensitive = Column(Boolean, default=False)
    raw_command = Column(Text)
    created_at = Column(DateTime, server_default=func.now())


class DocumentationEntry(Base):
    __tablename__ = "documentation_entries"
    id = Column(Integer, primary_key=True)
    command_normalized = Column(Text, unique=True, nullable=False)
    description = Column(Text)
    section = Column(String(50), nullable=False)
    category = Column(String(100))
    tags = Column(JSON, default=[])          # stored as JSON array
    synonyms = Column(JSON, default=[])      # stored as JSON array
    is_sensitive = Column(Boolean, default=False)
    usage_count = Column(Integer, default=1)
    embedding = Column(JSON)                 # stored as JSON float array
    last_seen = Column(DateTime, server_default=func.now())
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())


class WikiDocument(Base):
    __tablename__ = "wiki_documents"
    id = Column(Integer, primary_key=True)
    title = Column(String(500), nullable=False)
    content = Column(Text, default="")   # TipTap JSON (stringified)
    cover_color = Column(String(20), default="#6c63ff")
    tags = Column(JSON, default=[])
    section = Column(String(100), default="")
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
