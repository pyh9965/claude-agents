"""Brave Search Image Collector - Brave Search API Integration"""

import httpx
import os
from pathlib import Path
from typing import List, Optional
from .base import BaseCollector, CollectorResult


class BraveSearchCollector(BaseCollector):
    """Brave Search API를 통한 이미지 검색 수집기"""

    API_URL = "https://api.search.brave.com/res/v1/images/search"

    def __init__(self, api_key: Optional[str] = None):
        """
        BraveSearchCollector 초기화

        Args:
            api_key: Brave Search API 키 (없으면 환경변수에서 로드)
        """
        self.api_key = api_key or os.getenv("BRAVE_API_KEY")
        if not self.api_key:
            raise ValueError("BRAVE_API_KEY 환경변수가 설정되지 않았습니다.")
        self.client = httpx.AsyncClient(timeout=30.0)

    async def search(self, query: str, count: int = 10) -> List[dict]:
        """Brave Image Search API 호출

        Args:
            query: 검색어
            count: 결과 수 (최대 100)

        Returns:
            이미지 정보 리스트
        """
        headers = {
            "Accept": "application/json",
            "X-Subscription-Token": self.api_key
        }
        params = {
            "q": query,
            "count": min(count, 100),
            "safesearch": "off"
        }

        try:
            response = await self.client.get(
                self.API_URL,
                headers=headers,
                params=params
            )

            if response.status_code != 200:
                return []

            data = response.json()
            results = data.get("results", [])

            images = []
            for img in results:
                props = img.get("properties", {})
                images.append({
                    "url": props.get("url") or img.get("thumbnail", {}).get("src"),
                    "thumbnail_url": img.get("thumbnail", {}).get("src"),
                    "width": props.get("width", 0),
                    "height": props.get("height", 0),
                    "title": img.get("title", ""),
                    "source": "brave",
                    "attribution": f"Image from {img.get('source', 'web')}"
                })

            return images

        except Exception as e:
            print(f"[BraveSearch] 검색 실패: {e}")
            return []

    async def collect(
        self,
        keywords: List[str],
        max_images: int = 5,
        **kwargs
    ) -> CollectorResult:
        """이미지 수집

        Args:
            keywords: 검색 키워드 리스트
            max_images: 최대 이미지 수

        Returns:
            CollectorResult
        """
        if not keywords:
            return CollectorResult(
                success=False,
                images=[],
                error="키워드가 제공되지 않았습니다"
            )

        # 키워드 조합하여 검색
        query = " ".join(keywords)
        images = await self.search(query, max_images * 2)  # 여유있게 검색

        if not images:
            return CollectorResult(
                success=False,
                images=[],
                error=f"이미지를 찾을 수 없습니다: {query}"
            )

        # URL이 있는 이미지만 필터링
        valid_images = [img for img in images if img.get("url")][:max_images]

        return CollectorResult(
            success=True,
            images=valid_images,
            error=None
        )

    async def download(self, url: str, output_path: str) -> bool:
        """이미지 다운로드

        Args:
            url: 이미지 URL
            output_path: 저장 경로

        Returns:
            성공 여부
        """
        try:
            response = await self.client.get(url, follow_redirects=True)

            if response.status_code == 200:
                # 디렉토리 생성
                Path(output_path).parent.mkdir(parents=True, exist_ok=True)

                with open(output_path, "wb") as f:
                    f.write(response.content)
                return True

            return False

        except Exception as e:
            print(f"[BraveSearch] 다운로드 실패: {e}")
            return False

    async def close(self):
        """HTTP 클라이언트 종료"""
        await self.client.aclose()

    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        await self.close()
