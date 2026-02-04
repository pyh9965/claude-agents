from abc import ABC, abstractmethod
from typing import List, Optional
from dataclasses import dataclass

@dataclass
class CollectorResult:
    success: bool
    images: List[dict]  # url, width, height, attribution
    error: Optional[str] = None

class BaseCollector(ABC):
    """이미지 수집기 추상 베이스 클래스"""

    @abstractmethod
    async def collect(self, keywords: List[str], max_images: int = 5) -> CollectorResult:
        """키워드 기반 이미지 수집"""
        pass

    @abstractmethod
    async def download(self, url: str, output_path: str) -> bool:
        """이미지 다운로드"""
        pass
