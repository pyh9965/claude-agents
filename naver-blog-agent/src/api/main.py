from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from loguru import logger

from ..core.config import get_settings
from ..services.orchestrator import get_orchestrator
from ..utils.logger import setup_logger
from .routes import tasks, search, analysis


@asynccontextmanager
async def lifespan(app: FastAPI):
    """앱 생명주기 관리"""
    # 시작
    settings = get_settings()
    setup_logger(log_level="DEBUG" if settings.debug else "INFO")
    logger.info("Starting Naver Blog Agent API...")

    orchestrator = get_orchestrator()
    await orchestrator.initialize()

    yield

    # 종료
    logger.info("Shutting down...")
    await orchestrator.cleanup()


def create_app() -> FastAPI:
    """FastAPI 앱 생성"""
    settings = get_settings()

    app = FastAPI(
        title="Naver Blog Analysis Agent API",
        description="네이버 블로그 검색 및 분석 에이전트 시스템",
        version="0.1.0",
        lifespan=lifespan,
        docs_url="/docs",
        redoc_url="/redoc",
    )

    # CORS 설정
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # 라우터 등록
    app.include_router(tasks.router, prefix="/api/v1/tasks", tags=["Tasks"])
    app.include_router(search.router, prefix="/api/v1/search", tags=["Search"])
    app.include_router(analysis.router, prefix="/api/v1/analysis", tags=["Analysis"])

    @app.get("/")
    async def root():
        return {
            "name": settings.app_name,
            "version": "0.1.0",
            "status": "running"
        }

    @app.get("/health")
    async def health():
        return {"status": "healthy"}

    return app


app = create_app()
