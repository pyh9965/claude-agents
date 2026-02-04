import httpx
import os
from typing import List, Optional
from dataclasses import dataclass
from .base import BaseCollector, CollectorResult

@dataclass
class PlacePhoto:
    url: str
    width: int
    height: int
    attribution: Optional[str]

class GooglePlacesCollector(BaseCollector):
    """Google Places API를 통한 실제 장소 사진 수집"""

    BASE_URL = "https://places.googleapis.com/v1"

    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or os.getenv("GOOGLE_PLACES_API_KEY") or os.getenv("GOOGLE_API_KEY")
        if not self.api_key:
            raise ValueError("GOOGLE_PLACES_API_KEY 또는 GOOGLE_API_KEY 환경변수 필요")
        self.client = httpx.AsyncClient(timeout=30.0)

    async def search_place(self, query: str, location: Optional[str] = None) -> Optional[str]:
        """텍스트 검색으로 place_id 획득

        Args:
            query: 검색어 (예: "공일부엌")
            location: 위치 (예: "만리동" 또는 "서울")

        Returns:
            place_id 또는 None
        """
        search_query = f"{query} {location}" if location else query

        url = f"{self.BASE_URL}/places:searchText"
        headers = {
            "X-Goog-Api-Key": self.api_key,
            "X-Goog-FieldMask": "places.id,places.displayName,places.photos"
        }
        data = {
            "textQuery": search_query,
            "languageCode": "ko"
        }

        response = await self.client.post(url, headers=headers, json=data)
        if response.status_code != 200:
            return None

        result = response.json()
        places = result.get("places", [])
        return places[0]["id"] if places else None

    async def get_photos(self, place_id: str, max_photos: int = 5) -> List[PlacePhoto]:
        """장소의 사진 정보 획득

        Args:
            place_id: Google Places ID
            max_photos: 최대 사진 수

        Returns:
            PlacePhoto 리스트
        """
        url = f"{self.BASE_URL}/places/{place_id}"
        headers = {
            "X-Goog-Api-Key": self.api_key,
            "X-Goog-FieldMask": "photos"
        }

        response = await self.client.get(url, headers=headers)
        if response.status_code != 200:
            return []

        result = response.json()
        photos = []

        for photo in result.get("photos", [])[:max_photos]:
            photo_name = photo.get("name")
            if photo_name:
                photo_url = f"{self.BASE_URL}/{photo_name}/media?key={self.api_key}&maxWidthPx=1200"

                attributions = photo.get("authorAttributions", [])
                attribution = attributions[0].get("displayName") if attributions else None

                photos.append(PlacePhoto(
                    url=photo_url,
                    width=photo.get("widthPx", 0),
                    height=photo.get("heightPx", 0),
                    attribution=attribution
                ))

        return photos

    async def collect(self, keywords: List[str], max_images: int = 5,
                     location: Optional[str] = None) -> CollectorResult:
        """장소 이미지 수집

        Args:
            keywords: 검색 키워드 (첫 번째가 장소명)
            max_images: 최대 이미지 수
            location: 위치 정보

        Returns:
            CollectorResult
        """
        if not keywords:
            return CollectorResult(success=False, images=[], error="키워드 없음")

        query = keywords[0]

        try:
            place_id = await self.search_place(query, location)
            if not place_id:
                return CollectorResult(success=False, images=[],
                                       error=f"장소를 찾을 수 없음: {query}")

            photos = await self.get_photos(place_id, max_images)
            if not photos:
                return CollectorResult(success=False, images=[],
                                       error=f"사진을 찾을 수 없음: {query}")

            images = [
                {
                    "url": p.url,
                    "width": p.width,
                    "height": p.height,
                    "attribution": p.attribution,
                    "source": "google"
                }
                for p in photos
            ]

            return CollectorResult(success=True, images=images)

        except Exception as e:
            return CollectorResult(success=False, images=[], error=str(e))

    async def download(self, url: str, output_path: str) -> bool:
        """이미지 다운로드"""
        try:
            response = await self.client.get(url, follow_redirects=True)
            if response.status_code == 200:
                with open(output_path, "wb") as f:
                    f.write(response.content)
                return True
        except Exception:
            pass
        return False

    async def close(self):
        """클라이언트 종료"""
        await self.client.aclose()
