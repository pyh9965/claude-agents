from fastapi import APIRouter, HTTPException, BackgroundTasks
from typing import List, Optional
from loguru import logger

from ...models import TaskCreate, TaskResponse, TaskStatus
from ...services.orchestrator import get_orchestrator

router = APIRouter()


@router.post("/", response_model=TaskResponse)
async def create_task(
    task_input: TaskCreate,
    background_tasks: BackgroundTasks
):
    """새 검색/분석 작업 생성"""
    orchestrator = get_orchestrator()

    # 작업 생성
    task = await orchestrator.create_task(task_input)

    # 백그라운드에서 작업 실행
    background_tasks.add_task(
        orchestrator.run_task,
        task.id,
        task_input.crawl_content,
        task_input.analyze_content
    )

    return task


@router.get("/{task_id}", response_model=TaskResponse)
async def get_task(task_id: str):
    """작업 상태 조회"""
    orchestrator = get_orchestrator()
    task = await orchestrator.get_task_status(task_id)

    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    return task


@router.get("/{task_id}/posts")
async def get_task_posts(task_id: str, limit: int = 100, offset: int = 0):
    """작업의 게시글 목록 조회"""
    from sqlalchemy import select
    from ...core.database import get_database, BlogPost

    db = get_database()
    async with db.async_session() as session:
        result = await session.execute(
            select(BlogPost)
            .where(BlogPost.task_id == task_id)
            .offset(offset)
            .limit(limit)
        )
        posts = result.scalars().all()

        return {
            "task_id": task_id,
            "posts": [
                {
                    "id": p.id,
                    "url": p.url,
                    "title": p.title,
                    "author": p.author,
                    "post_date": p.post_date,
                    "has_content": bool(p.content)
                }
                for p in posts
            ],
            "total": len(posts)
        }


@router.get("/{task_id}/analyses")
async def get_task_analyses(task_id: str, limit: int = 100, offset: int = 0):
    """작업의 분석 결과 조회"""
    from sqlalchemy import select
    from ...core.database import get_database, BlogPost, Analysis

    db = get_database()
    async with db.async_session() as session:
        # task의 posts 가져오기
        posts_result = await session.execute(
            select(BlogPost.id).where(BlogPost.task_id == task_id)
        )
        post_ids = [p[0] for p in posts_result.all()]

        # analyses 가져오기
        result = await session.execute(
            select(Analysis)
            .where(Analysis.post_id.in_(post_ids))
            .offset(offset)
            .limit(limit)
        )
        analyses = result.scalars().all()

        return {
            "task_id": task_id,
            "analyses": [
                {
                    "id": a.id,
                    "url": a.url,
                    "sentiment_score": a.sentiment_score,
                    "sentiment_label": a.sentiment_label,
                    "keywords": a.keywords,
                    "summary": a.summary,
                    "content_type": a.content_type,
                    "is_ad": a.is_ad,
                    "quality_score": a.quality_score
                }
                for a in analyses
            ],
            "total": len(analyses)
        }
