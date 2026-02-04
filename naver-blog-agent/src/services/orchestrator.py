import asyncio
from typing import List, Optional, Dict, Any
from datetime import datetime
from loguru import logger

from ..agents import SearchAgent, HybridCrawlerAgent, AnalysisAgent, RSSCrawlerAgent
from ..models import (
    SearchInput, BlogPostMeta, BlogContent, AnalysisResult,
    TaskStatus, TaskCreate, TaskResponse
)
from ..core.database import Database, get_database, SearchTask, BlogPost, Analysis
from sqlalchemy import select


class Orchestrator:
    """에이전트 조율 및 워크플로우 관리"""

    def __init__(self, config: Dict[str, Any] = None):
        self.config = config or {}
        self.search_agent = SearchAgent(config)
        self.crawler_agent = HybridCrawlerAgent(config)
        self.analysis_agent = AnalysisAgent(config)
        self.rss_agent = RSSCrawlerAgent(config)
        self.db = get_database()
        self._initialized = False

    async def initialize(self):
        """초기화"""
        if self._initialized:
            return

        await self.db.init_db()
        await self.search_agent.initialize()
        await self.crawler_agent.initialize()
        await self.analysis_agent.initialize()
        await self.rss_agent.initialize()
        self._initialized = True
        logger.info("Orchestrator initialized")

    async def cleanup(self):
        """정리"""
        await self.search_agent.cleanup()
        await self.crawler_agent.cleanup()
        await self.analysis_agent.cleanup()
        await self.rss_agent.cleanup()
        self._initialized = False

    async def create_task(self, task_input: TaskCreate) -> TaskResponse:
        """새 작업 생성"""
        async with self.db.async_session() as session:
            task = SearchTask(
                keyword=task_input.keyword,
                start_date=str(task_input.start_date) if task_input.start_date else None,
                end_date=str(task_input.end_date) if task_input.end_date else None,
                max_results=task_input.max_results,
                status=TaskStatus.PENDING.value
            )
            session.add(task)
            await session.commit()
            await session.refresh(task)

            return TaskResponse(
                id=task.id,
                status=TaskStatus.PENDING,
                keyword=task.keyword,
                created_at=task.created_at
            )

    async def run_task(
        self,
        task_id: str,
        crawl_content: bool = True,
        analyze_content: bool = True,
        progress_callback: callable = None
    ) -> TaskResponse:
        """전체 워크플로우 실행"""

        if not self._initialized:
            await self.initialize()

        async with self.db.async_session() as session:
            # 작업 조회
            result = await session.execute(
                select(SearchTask).where(SearchTask.id == task_id)
            )
            task = result.scalar_one_or_none()

            if not task:
                raise ValueError(f"Task not found: {task_id}")

            try:
                # 1. 검색 단계
                logger.info(f"[{task_id}] 검색 시작: {task.keyword}")
                task.status = TaskStatus.SEARCHING.value
                await session.commit()

                if progress_callback:
                    await progress_callback(TaskStatus.SEARCHING, 10, "검색 중...")

                search_input = SearchInput(
                    keyword=task.keyword,
                    start_date=datetime.strptime(task.start_date, "%Y-%m-%d").date() if task.start_date else None,
                    end_date=datetime.strptime(task.end_date, "%Y-%m-%d").date() if task.end_date else None,
                    max_results=task.max_results
                )

                search_result = await self.search_agent.run(search_input)

                if not search_result.success:
                    raise Exception(f"검색 실패: {search_result.error}")

                posts_meta: List[BlogPostMeta] = search_result.data
                task.total_found = len(posts_meta)
                await session.commit()

                logger.info(f"[{task_id}] 검색 완료: {len(posts_meta)}개 발견")

                # DB에 검색 결과 저장
                for meta in posts_meta:
                    post = BlogPost(
                        task_id=task_id,
                        url=meta.link,
                        title=meta.title.replace("<b>", "").replace("</b>", ""),
                        author=meta.bloggername,
                        post_date=meta.postdate
                    )
                    session.add(post)

                await session.commit()

                # 2. 수집 단계
                if crawl_content and posts_meta:
                    logger.info(f"[{task_id}] 콘텐츠 수집 시작")
                    task.status = TaskStatus.CRAWLING.value
                    await session.commit()

                    if progress_callback:
                        await progress_callback(TaskStatus.CRAWLING, 30, "콘텐츠 수집 중...")

                    urls = [meta.link for meta in posts_meta]
                    crawl_result = await self.crawler_agent.crawl(urls)

                    if crawl_result.success:
                        contents: List[BlogContent] = crawl_result.data
                        task.total_crawled = len(contents)

                        # DB 업데이트
                        for content in contents:
                            result = await session.execute(
                                select(BlogPost).where(BlogPost.url == content.url)
                            )
                            post = result.scalar_one_or_none()
                            if post:
                                post.content = content.content
                                post.crawled_at = content.crawled_at

                        await session.commit()
                        logger.info(f"[{task_id}] 수집 완료: {len(contents)}개")
                else:
                    contents = []

                # 3. 분석 단계
                if analyze_content and contents:
                    logger.info(f"[{task_id}] 분석 시작")
                    task.status = TaskStatus.ANALYZING.value
                    await session.commit()

                    if progress_callback:
                        await progress_callback(TaskStatus.ANALYZING, 60, "AI 분석 중...")

                    analyzed_count = 0
                    for i, content in enumerate(contents):
                        try:
                            analysis_result = await self.analysis_agent.analyze(content)

                            if analysis_result.success:
                                analysis_data: AnalysisResult = analysis_result.data

                                # 해당 post 찾기
                                result = await session.execute(
                                    select(BlogPost).where(BlogPost.url == content.url)
                                )
                                post = result.scalar_one_or_none()

                                if post:
                                    analysis = Analysis(
                                        post_id=post.id,
                                        url=content.url,
                                        sentiment_score=analysis_data.sentiment_score,
                                        sentiment_label=analysis_data.sentiment_label.value,
                                        keywords=analysis_data.keywords,
                                        summary=analysis_data.summary,
                                        content_type=analysis_data.content_type.value,
                                        is_ad=analysis_data.is_ad,
                                        quality_score=analysis_data.quality_score
                                    )
                                    session.add(analysis)
                                    analyzed_count += 1

                            # 진행률 업데이트
                            if progress_callback and i % 5 == 0:
                                progress = 60 + (i / len(contents)) * 30
                                await progress_callback(
                                    TaskStatus.ANALYZING,
                                    progress,
                                    f"분석 중... ({i+1}/{len(contents)})"
                                )

                        except Exception as e:
                            logger.warning(f"분석 실패 ({content.url}): {str(e)}")

                    task.total_analyzed = analyzed_count
                    await session.commit()
                    logger.info(f"[{task_id}] 분석 완료: {analyzed_count}개")

                # 4. 완료
                task.status = TaskStatus.COMPLETED.value
                task.completed_at = datetime.now()
                await session.commit()

                if progress_callback:
                    await progress_callback(TaskStatus.COMPLETED, 100, "완료!")

                logger.info(f"[{task_id}] 작업 완료")

                return TaskResponse(
                    id=task.id,
                    status=TaskStatus.COMPLETED,
                    keyword=task.keyword,
                    total_found=task.total_found,
                    total_crawled=task.total_crawled,
                    total_analyzed=task.total_analyzed,
                    created_at=task.created_at,
                    completed_at=task.completed_at
                )

            except Exception as e:
                logger.error(f"[{task_id}] 작업 실패: {str(e)}")
                task.status = TaskStatus.FAILED.value
                await session.commit()
                raise

    async def get_task_status(self, task_id: str) -> Optional[TaskResponse]:
        """작업 상태 조회"""
        async with self.db.async_session() as session:
            result = await session.execute(
                select(SearchTask).where(SearchTask.id == task_id)
            )
            task = result.scalar_one_or_none()

            if not task:
                return None

            return TaskResponse(
                id=task.id,
                status=TaskStatus(task.status),
                keyword=task.keyword,
                total_found=task.total_found or 0,
                total_crawled=task.total_crawled or 0,
                total_analyzed=task.total_analyzed or 0,
                created_at=task.created_at,
                completed_at=task.completed_at
            )

    async def quick_search(
        self,
        keyword: str,
        max_results: int = 100
    ) -> List[BlogPostMeta]:
        """빠른 검색 (DB 저장 없이)"""
        if not self._initialized:
            await self.initialize()

        search_input = SearchInput(keyword=keyword, max_results=max_results)
        result = await self.search_agent.run(search_input)

        if result.success:
            return result.data
        return []

    async def quick_analyze(
        self,
        url: str
    ) -> Optional[AnalysisResult]:
        """빠른 분석 (단일 URL, DB 저장 없이)"""
        if not self._initialized:
            await self.initialize()

        # 수집
        crawl_result = await self.crawler_agent.crawl([url])
        if not crawl_result.success or not crawl_result.data:
            return None

        content = crawl_result.data[0]

        # 분석
        analysis_result = await self.analysis_agent.analyze(content)
        if analysis_result.success:
            return analysis_result.data

        return None


# 싱글톤 인스턴스
_orchestrator_instance: Orchestrator = None


def get_orchestrator(config: Dict[str, Any] = None) -> Orchestrator:
    global _orchestrator_instance
    if _orchestrator_instance is None:
        _orchestrator_instance = Orchestrator(config)
    return _orchestrator_instance
