from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy import Column, String, Integer, Float, Boolean, DateTime, Text, JSON
from datetime import datetime
import uuid

from .config import get_settings


class Base(DeclarativeBase):
    pass


class Project(Base):
    __tablename__ = "projects"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(255), nullable=False)
    description = Column(Text)
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)


class SearchTask(Base):
    __tablename__ = "search_tasks"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id = Column(String, nullable=True)
    keyword = Column(String(500), nullable=False)
    start_date = Column(String)
    end_date = Column(String)
    max_results = Column(Integer, default=100)
    status = Column(String(50), default="pending")
    total_found = Column(Integer, default=0)
    total_crawled = Column(Integer, default=0)
    total_analyzed = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.now)
    completed_at = Column(DateTime, nullable=True)


class BlogPost(Base):
    __tablename__ = "blog_posts"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    task_id = Column(String, nullable=False)
    url = Column(String(2048), unique=True, nullable=False)
    title = Column(String(500))
    author = Column(String(255))
    content = Column(Text)
    post_date = Column(String)
    images = Column(JSON)
    crawled_at = Column(DateTime, default=datetime.now)


class Analysis(Base):
    __tablename__ = "analyses"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    post_id = Column(String, nullable=False)
    url = Column(String(2048))
    sentiment_score = Column(Float)
    sentiment_label = Column(String(50))
    keywords = Column(JSON)
    summary = Column(Text)
    content_type = Column(String(100))
    is_ad = Column(Boolean, default=False)
    quality_score = Column(Integer)
    analyzed_at = Column(DateTime, default=datetime.now)


class Database:
    """비동기 데이터베이스 클래스"""

    def __init__(self, database_url: str = None):
        settings = get_settings()
        self.database_url = database_url or settings.database_url
        self.engine = create_async_engine(self.database_url, echo=False)
        self.async_session = async_sessionmaker(
            self.engine, class_=AsyncSession, expire_on_commit=False
        )

    async def init_db(self):
        """데이터베이스 테이블 생성"""
        async with self.engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)

    async def get_session(self) -> AsyncSession:
        """세션 반환"""
        async with self.async_session() as session:
            yield session

    async def close(self):
        """연결 종료"""
        await self.engine.dispose()


# 싱글톤 인스턴스
_db_instance: Database = None


def get_database() -> Database:
    global _db_instance
    if _db_instance is None:
        _db_instance = Database()
    return _db_instance
