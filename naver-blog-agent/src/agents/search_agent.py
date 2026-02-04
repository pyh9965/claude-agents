import httpx
import asyncio
from typing import List, Dict, Any
from datetime import datetime, date
from loguru import logger

from .base import BaseAgent, AgentResult
from ..models import SearchInput, BlogPostMeta
from ..core.config import get_settings


class SearchAgent(BaseAgent):
    """네이버 블로그 검색 에이전트"""

    BASE_URL = "https://openapi.naver.com/v1/search/blog.json"

    def __init__(self, config: Dict[str, Any] = None):
        super().__init__(config)
        settings = get_settings()
        self.client_id = config.get("client_id") if config else None
        self.client_secret = config.get("client_secret") if config else None

        # config에 없으면 settings에서 가져오기
        if not self.client_id:
            self.client_id = settings.naver_client_id
        if not self.client_secret:
            self.client_secret = settings.naver_client_secret

        self.rate_limit = config.get("rate_limit", 10) if config else 10
        self._client: httpx.AsyncClient = None

    async def initialize(self) -> None:
        """HTTP 클라이언트 초기화"""
        self._client = httpx.AsyncClient(
            headers={
                "X-Naver-Client-Id": self.client_id,
                "X-Naver-Client-Secret": self.client_secret,
            },
            timeout=30.0
        )
        await super().initialize()

    async def cleanup(self) -> None:
        """HTTP 클라이언트 정리"""
        if self._client:
            await self._client.aclose()
        await super().cleanup()

    async def validate_input(self, input_data: SearchInput) -> bool:
        """입력 검증"""
        if not input_data.keyword:
            raise ValueError("키워드는 필수입니다.")
        if not self.client_id or not self.client_secret:
            raise ValueError("네이버 API 인증 정보가 필요합니다.")
        return True

    async def execute(self, input_data: SearchInput) -> AgentResult[List[BlogPostMeta]]:
        """검색 실행"""
        all_results: List[BlogPostMeta] = []
        start = 1
        display = 100  # 한 번에 최대 100개

        total_api_results = 0

        while len(all_results) < input_data.max_results:
            try:
                response = await self._call_api(
                    query=input_data.keyword,
                    start=start,
                    display=min(display, input_data.max_results - len(all_results)),
                    sort=input_data.sort
                )

                if not response.get("items"):
                    break

                total_api_results = response.get("total", 0)

                # 날짜 필터링
                filtered = self._filter_by_date(
                    response["items"],
                    input_data.start_date,
                    input_data.end_date
                )

                # BlogPostMeta 객체로 변환
                for item in filtered:
                    all_results.append(BlogPostMeta(
                        title=item["title"],
                        link=item["link"],
                        description=item["description"],
                        bloggername=item["bloggername"],
                        bloggerlink=item.get("bloggerlink", ""),
                        postdate=item["postdate"]
                    ))

                start += display

                # API 제한: 최대 1000개까지만 조회 가능
                if start > 1000:
                    logger.warning("네이버 API 최대 조회 한도(1000개) 도달")
                    break

                # Rate limiting
                await asyncio.sleep(1 / self.rate_limit)

            except Exception as e:
                logger.error(f"API 호출 오류: {str(e)}")
                break

        return AgentResult(
            success=True,
            data=all_results[:input_data.max_results],
            metadata={
                "total_api_results": total_api_results,
                "collected_count": len(all_results),
                "keyword": input_data.keyword
            }
        )

    async def _call_api(
        self,
        query: str,
        start: int = 1,
        display: int = 100,
        sort: str = "sim"
    ) -> Dict[str, Any]:
        """네이버 검색 API 호출"""
        params = {
            "query": query,
            "start": start,
            "display": display,
            "sort": sort
        }

        response = await self._client.get(self.BASE_URL, params=params)
        response.raise_for_status()

        return response.json()

    def _filter_by_date(
        self,
        items: List[Dict],
        start_date: date = None,
        end_date: date = None
    ) -> List[Dict]:
        """날짜 범위로 필터링"""
        if not start_date and not end_date:
            return items

        filtered = []
        for item in items:
            try:
                post_date = datetime.strptime(item["postdate"], "%Y%m%d").date()

                if start_date and post_date < start_date:
                    continue
                if end_date and post_date > end_date:
                    continue

                filtered.append(item)
            except (ValueError, KeyError):
                # 날짜 파싱 실패 시 포함
                filtered.append(item)

        return filtered

    async def search(
        self,
        keyword: str,
        start_date: date = None,
        end_date: date = None,
        max_results: int = 100,
        sort: str = "sim"
    ) -> AgentResult[List[BlogPostMeta]]:
        """편의 메서드: 직접 검색 실행"""
        input_data = SearchInput(
            keyword=keyword,
            start_date=start_date,
            end_date=end_date,
            max_results=max_results,
            sort=sort
        )
        return await self.run(input_data)
