"""Stock Image Collector - Unsplash & Pexels Integration"""

import httpx
import os
from typing import List, Optional
from .base import BaseCollector, CollectorResult


class StockImageCollector(BaseCollector):
    """Unsplash/Pexels 스톡 이미지 통합 수집기"""

    UNSPLASH_URL = "https://api.unsplash.com/search/photos"
    PEXELS_URL = "https://api.pexels.com/v1/search"

    def __init__(
        self,
        unsplash_key: Optional[str] = None,
        pexels_key: Optional[str] = None
    ):
        """StockImageCollector 초기화

        Args:
            unsplash_key: Unsplash API 키 (없으면 환경변수 사용)
            pexels_key: Pexels API 키 (없으면 환경변수 사용)
        """
        self.unsplash_key = unsplash_key or os.getenv("UNSPLASH_ACCESS_KEY")
        self.pexels_key = pexels_key or os.getenv("PEXELS_API_KEY")
        self.client = httpx.AsyncClient(timeout=30.0)

    async def _translate_to_english(self, korean_keywords: List[str]) -> str:
        """한국어 키워드를 영어로 변환

        자주 사용되는 음식/장소명 매핑 테이블 사용
        매핑에 없는 경우 원본 사용 (이미 영어일 수 있음)

        Args:
            korean_keywords: 한국어 키워드 리스트

        Returns:
            영어로 변환된 검색 쿼리 문자열
        """
        # 자주 사용되는 한국어-영어 매핑 테이블
        mapping = {
            # 한식 음식
            "김치찌개": "kimchi stew",
            "김치": "kimchi",
            "삼겹살": "Korean BBQ pork belly",
            "비빔밥": "bibimbap",
            "된장찌개": "soybean paste stew",
            "불고기": "bulgogi",
            "떡볶이": "tteokbokki",
            "치킨": "Korean fried chicken",
            "라면": "Korean ramen",
            "순두부": "soft tofu stew",
            "갈비": "Korean short ribs",
            "냉면": "cold noodles",
            "국수": "Korean noodles",
            "파전": "Korean pancake",
            "찜닭": "braised chicken",
            "보쌈": "boiled pork wraps",
            "족발": "pork trotters",
            "곱창": "grilled intestines",
            "삼계탕": "ginseng chicken soup",
            "설렁탕": "ox bone soup",
            "해물탕": "seafood stew",
            "제육볶음": "spicy pork stir fry",
            "잡채": "glass noodles",

            # 일식 음식
            "규동": "gyudon beef bowl",
            "돈까스": "tonkatsu pork cutlet",
            "초밥": "sushi",
            "라멘": "ramen",
            "우동": "udon",
            "덮밥": "rice bowl",
            "오코노미야키": "okonomiyaki",
            "타코야키": "takoyaki",
            "텐동": "tempura rice bowl",

            # 기타 음식
            "파스타": "pasta",
            "피자": "pizza",
            "햄버거": "burger",
            "스테이크": "steak",
            "샐러드": "salad",
            "커피": "coffee",
            "케이크": "cake",
            "빵": "bread",
            "와플": "waffle",
            "팬케이크": "pancake",

            # 음식 카테고리
            "맛집": "restaurant",
            "한식": "Korean food",
            "일식": "Japanese food",
            "중식": "Chinese food",
            "양식": "Western food",
            "분식": "Korean street food",
            "카페": "cafe",
            "디저트": "dessert",
            "베이커리": "bakery",
            "레스토랑": "restaurant",

            # 장소
            "서울": "Seoul",
            "강남": "Gangnam Seoul",
            "홍대": "Hongdae Seoul",
            "명동": "Myeongdong Seoul",
            "이태원": "Itaewon Seoul",
            "부산": "Busan",
            "제주": "Jeju Island",
            "인천": "Incheon",
            "대전": "Daejeon",
            "광주": "Gwangju",

            # 일반 단어
            "음식": "food",
            "요리": "cooking",
            "인테리어": "interior",
            "분위기": "atmosphere",
            "풍경": "landscape",
            "여행": "travel",
            "관광": "tourism",
            "자연": "nature",
            "도시": "city",
            "거리": "street",
        }

        translated = []
        for kw in korean_keywords:
            # 매핑 테이블에서 검색
            if kw in mapping:
                translated.append(mapping[kw])
            else:
                # 매핑에 없으면 원본 사용 (이미 영어일 수 있음)
                translated.append(kw)

        # 공백으로 조인하여 검색 쿼리 생성
        return " ".join(translated)

    async def search_unsplash(self, query: str, per_page: int = 5) -> List[dict]:
        """Unsplash 이미지 검색

        Args:
            query: 검색어 (영어)
            per_page: 결과 수 (1-30)

        Returns:
            이미지 정보 리스트 [{"url", "download_url", "width", "height", "attribution", "source"}]
        """
        if not self.unsplash_key:
            return []

        headers = {"Authorization": f"Client-ID {self.unsplash_key}"}
        params = {
            "query": query,
            "per_page": min(per_page, 30),  # Unsplash 최대 30
            "orientation": "landscape"  # 가로형 우선
        }

        try:
            response = await self.client.get(
                self.UNSPLASH_URL,
                headers=headers,
                params=params
            )

            if response.status_code != 200:
                return []

            result = response.json()
            images = []

            for photo in result.get("results", []):
                images.append({
                    "url": photo["urls"]["regular"],  # 1080px width (블로그 최적)
                    "download_url": photo["urls"]["full"],  # 원본 (필요시)
                    "width": photo["width"],
                    "height": photo["height"],
                    "attribution": f"Photo by {photo['user']['name']} on Unsplash",
                    "photographer": photo['user']['name'],
                    "source": "unsplash"
                })

            return images

        except Exception as e:
            # 네트워크 오류, 타임아웃 등
            return []

    async def search_pexels(self, query: str, per_page: int = 5) -> List[dict]:
        """Pexels 이미지 검색

        Args:
            query: 검색어 (영어)
            per_page: 결과 수 (1-80)

        Returns:
            이미지 정보 리스트 [{"url", "download_url", "width", "height", "attribution", "source"}]
        """
        if not self.pexels_key:
            return []

        headers = {"Authorization": self.pexels_key}
        params = {
            "query": query,
            "per_page": min(per_page, 80),  # Pexels 최대 80
            "orientation": "landscape"  # 가로형 우선
        }

        try:
            response = await self.client.get(
                self.PEXELS_URL,
                headers=headers,
                params=params
            )

            if response.status_code != 200:
                return []

            result = response.json()
            images = []

            for photo in result.get("photos", []):
                images.append({
                    "url": photo["src"]["large"],  # 940px width (블로그 최적)
                    "download_url": photo["src"]["original"],  # 원본
                    "width": photo["width"],
                    "height": photo["height"],
                    "attribution": f"Photo by {photo['photographer']} on Pexels",
                    "photographer": photo['photographer'],
                    "source": "pexels"
                })

            return images

        except Exception as e:
            # 네트워크 오류, 타임아웃 등
            return []

    async def collect(self, keywords: List[str], max_images: int = 5) -> CollectorResult:
        """스톡 이미지 수집 (Unsplash 우선, Pexels Fallback)

        전략:
        1. 한국어 키워드를 영어로 변환
        2. Unsplash에서 우선 검색 (고품질 이미지)
        3. 이미지 부족 시 Pexels에서 추가 검색
        4. 결과 통합하여 반환

        Args:
            keywords: 검색 키워드 (한국어/영어 모두 가능)
            max_images: 최대 이미지 수

        Returns:
            CollectorResult (success, images, error)
        """
        if not keywords:
            return CollectorResult(
                success=False,
                images=[],
                error="키워드가 제공되지 않았습니다"
            )

        # 한국어 → 영어 번역
        query = await self._translate_to_english(keywords)

        # 1차: Unsplash 검색 (고품질 이미지)
        images = await self.search_unsplash(query, max_images)

        # 2차: 이미지 부족 시 Pexels 추가
        if len(images) < max_images:
            remaining = max_images - len(images)
            pexels_images = await self.search_pexels(query, remaining)
            images.extend(pexels_images)

        # 결과 검증
        if not images:
            return CollectorResult(
                success=False,
                images=[],
                error=f"스톡 이미지를 찾을 수 없습니다: {query} (원본: {', '.join(keywords)})"
            )

        return CollectorResult(
            success=True,
            images=images[:max_images],  # 최대 개수 제한
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
                # 디렉토리 생성 (없는 경우)
                os.makedirs(os.path.dirname(output_path), exist_ok=True)

                # 파일 저장
                with open(output_path, "wb") as f:
                    f.write(response.content)

                return True

            return False

        except Exception as e:
            # 네트워크 오류, 파일 쓰기 오류 등
            return False

    async def close(self):
        """HTTP 클라이언트 종료

        리소스 정리를 위해 사용 후 반드시 호출 필요
        """
        await self.client.aclose()

    async def __aenter__(self):
        """비동기 컨텍스트 매니저 진입"""
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """비동기 컨텍스트 매니저 종료"""
        await self.close()
