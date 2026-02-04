"""Blog Image Collection Agent - Data Models"""

from dataclasses import dataclass, field
from typing import List, Optional
from enum import Enum


class ImageType(str, Enum):
    """이미지 타입"""
    THUMBNAIL = "thumbnail"
    BANNER = "banner"
    CONTENT = "content"
    INFOGRAPHIC = "infographic"
    MAP = "map"


class ImageSource(str, Enum):
    """이미지 소스"""
    GOOGLE = "google"
    UNSPLASH = "unsplash"
    PEXELS = "pexels"
    NANOBANANA = "nanobanana"


class PreferredSource(str, Enum):
    """선호 소스 타입"""
    REAL = "real"      # 실제 사진 (Google Places, 지도 등)
    STOCK = "stock"    # 스톡 이미지 (Unsplash, Pexels)
    AI = "ai"          # AI 생성 이미지 (nanobanana)
    ANY = "any"        # 제한 없음


@dataclass
class ImageRequirement:
    """이미지 요구사항"""
    id: str
    type: ImageType
    keywords: List[str]
    prompt: str  # AI 생성용 영어 프롬프트
    section_id: str
    priority: int  # 1-10, 높을수록 중요
    preferred_source: PreferredSource = PreferredSource.ANY
    entity_name: Optional[str] = None  # 장소명/음식명/제품명
    entity_location: Optional[str] = None  # 위치 정보

    def to_dict(self):
        """딕셔너리로 변환"""
        return {
            "id": self.id,
            "type": self.type.value if isinstance(self.type, ImageType) else self.type,
            "keywords": self.keywords,
            "prompt": self.prompt,
            "section_id": self.section_id,
            "priority": self.priority,
            "preferred_source": self.preferred_source.value if isinstance(self.preferred_source, PreferredSource) else self.preferred_source,
            "entity_name": self.entity_name,
            "entity_location": self.entity_location
        }


@dataclass
class CollectedImage:
    """수집된 이미지"""
    id: str
    url: str
    local_path: str
    source: ImageSource
    width: int
    height: int
    attribution: Optional[str]
    alt_text: str
    caption: str
    requirement_id: str

    def to_dict(self):
        """딕셔너리로 변환"""
        return {
            "id": self.id,
            "url": self.url,
            "local_path": self.local_path,
            "source": self.source.value if isinstance(self.source, ImageSource) else self.source,
            "width": self.width,
            "height": self.height,
            "attribution": self.attribution,
            "alt_text": self.alt_text,
            "caption": self.caption,
            "requirement_id": self.requirement_id
        }


@dataclass
class ImagePlacement:
    """이미지 배치 정보"""
    image_id: str
    position: int  # HTML에서의 위치 (문자 오프셋)
    html: str  # 삽입할 HTML 코드

    def to_dict(self):
        """딕셔너리로 변환"""
        return {
            "image_id": self.image_id,
            "position": self.position,
            "html": self.html
        }


@dataclass
class CollectionStatistics:
    """수집 통계"""
    total: int = 0
    by_source: dict = field(default_factory=dict)
    cache_hits: int = 0
    failures: int = 0

    def to_dict(self):
        """딕셔너리로 변환"""
        return {
            "total": self.total,
            "by_source": self.by_source,
            "cache_hits": self.cache_hits,
            "failures": self.failures
        }


@dataclass
class ImageMap:
    """이미지 맵 (콘텐츠별 이미지 수집 결과)"""
    content_id: str
    images: List[CollectedImage]
    placements: List[ImagePlacement]
    statistics: CollectionStatistics

    def to_dict(self):
        """딕셔너리로 변환"""
        return {
            "content_id": self.content_id,
            "images": [img.to_dict() for img in self.images],
            "placements": [p.to_dict() for p in self.placements],
            "statistics": self.statistics.to_dict()
        }
