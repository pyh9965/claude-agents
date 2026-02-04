import asyncio
from typing import List, Dict, Any
from datetime import datetime
from loguru import logger

from .base import BaseAgent, AgentResult


class RSSCrawlerAgent(BaseAgent):
    """RSS 피드 기반 수집 에이전트 (차단 없음)"""

    def __init__(self, config: Dict[str, Any] = None):
        super().__init__(config)

    async def validate_input(self, input_data: Any) -> bool:
        """입력 검증"""
        if isinstance(input_data, str):
            return bool(input_data)
        elif isinstance(input_data, list):
            return len(input_data) > 0
        return False

    async def execute(self, input_data: Any) -> AgentResult[List[Dict]]:
        """RSS 수집 실행"""
        try:
            import feedparser
        except ImportError:
            return AgentResult(
                success=False,
                error="feedparser 패키지가 필요합니다: pip install feedparser"
            )

        if isinstance(input_data, str):
            # 단일 블로거
            posts = await self._fetch_blog_posts(input_data)
            return AgentResult(
                success=True,
                data=posts,
                metadata={"blog_id": input_data, "count": len(posts)}
            )

        elif isinstance(input_data, list):
            # 여러 블로거
            all_posts = await self._fetch_multiple_blogs(input_data)
            return AgentResult(
                success=True,
                data=all_posts,
                metadata={"blog_count": len(input_data), "total_posts": len(all_posts)}
            )

        return AgentResult(success=False, error="잘못된 입력 형식")

    def _get_rss_url(self, blog_id: str) -> str:
        """RSS URL 생성"""
        return f"https://rss.blog.naver.com/{blog_id}.xml"

    async def _fetch_blog_posts(self, blog_id: str) -> List[Dict]:
        """특정 블로거의 최신 게시글 목록 수집"""
        import feedparser

        rss_url = self._get_rss_url(blog_id)

        try:
            # feedparser는 동기 함수이므로 스레드에서 실행
            feed = await asyncio.to_thread(feedparser.parse, rss_url)

            posts = []
            for entry in feed.entries:
                posts.append({
                    "title": entry.get("title", ""),
                    "link": entry.get("link", ""),
                    "published": entry.get("published", ""),
                    "summary": entry.get("summary", ""),
                    "author": feed.feed.get("title", blog_id),
                    "blog_id": blog_id
                })

            logger.debug(f"RSS 수집 완료: {blog_id} - {len(posts)}개 게시글")
            return posts

        except Exception as e:
            logger.warning(f"RSS 수집 실패 ({blog_id}): {str(e)}")
            return []

    async def _fetch_multiple_blogs(
        self,
        blog_ids: List[str],
        concurrency: int = 10
    ) -> List[Dict]:
        """여러 블로거의 게시글 일괄 수집"""
        semaphore = asyncio.Semaphore(concurrency)

        async def fetch_with_limit(blog_id: str):
            async with semaphore:
                return await self._fetch_blog_posts(blog_id)

        tasks = [fetch_with_limit(blog_id) for blog_id in blog_ids]
        results = await asyncio.gather(*tasks)

        all_posts = []
        for posts in results:
            all_posts.extend(posts)

        return all_posts

    async def fetch_blog(self, blog_id: str) -> AgentResult[List[Dict]]:
        """편의 메서드: 단일 블로거 수집"""
        return await self.run(blog_id)

    async def fetch_blogs(self, blog_ids: List[str]) -> AgentResult[List[Dict]]:
        """편의 메서드: 여러 블로거 수집"""
        return await self.run(blog_ids)

    def extract_blog_id_from_url(self, url: str) -> str:
        """URL에서 블로거 ID 추출"""
        from urllib.parse import urlparse
        parsed = urlparse(url)
        path_parts = parsed.path.strip('/').split('/')
        if path_parts:
            return path_parts[0]
        return ""
