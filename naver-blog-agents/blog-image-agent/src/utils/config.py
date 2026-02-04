import os
from pathlib import Path
from dataclasses import dataclass, field
from typing import Optional, List
from dotenv import load_dotenv
import yaml


@dataclass
class Config:
    """애플리케이션 설정"""

    # API 키
    google_api_key: Optional[str] = None
    google_places_api_key: Optional[str] = None
    unsplash_access_key: Optional[str] = None
    pexels_api_key: Optional[str] = None

    # AI 모델
    default_model: str = "gemini-2.0-flash"

    # 이미지 처리
    image_quality: int = 85
    convert_to_webp: bool = True
    max_image_width: int = 1200
    max_image_height: int = 1200

    # 캐시
    cache_enabled: bool = True
    cache_dir: str = ".cache/images"
    cache_ttl_days: int = 7

    # 수집
    collection_priority: List[str] = field(
        default_factory=lambda: ["google", "stock", "nanobanana"]
    )
    min_images_per_content: int = 3
    max_images_per_content: int = 15

    @classmethod
    def from_env(cls) -> "Config":
        """환경변수에서 설정 로드"""
        load_dotenv()

        return cls(
            google_api_key=os.getenv("GOOGLE_API_KEY"),
            google_places_api_key=os.getenv("GOOGLE_PLACES_API_KEY"),
            unsplash_access_key=os.getenv("UNSPLASH_ACCESS_KEY"),
            pexels_api_key=os.getenv("PEXELS_API_KEY"),
            default_model=os.getenv("DEFAULT_MODEL", "gemini-2.0-flash"),
            image_quality=int(os.getenv("IMAGE_QUALITY", "85")),
            convert_to_webp=os.getenv("CONVERT_TO_WEBP", "true").lower() == "true",
            cache_enabled=os.getenv("CACHE_ENABLED", "true").lower() == "true",
            cache_dir=os.getenv("CACHE_DIR", ".cache/images"),
            cache_ttl_days=int(os.getenv("CACHE_TTL_DAYS", "7")),
        )

    @classmethod
    def from_yaml(cls, path: str) -> "Config":
        """YAML 파일에서 설정 로드"""
        with open(path, "r", encoding="utf-8") as f:
            data = yaml.safe_load(f)

        # 환경변수도 함께 로드
        env_config = cls.from_env()

        # YAML 값으로 오버라이드
        for key, value in data.items():
            if hasattr(env_config, key):
                setattr(env_config, key, value)

        return env_config

    def validate(self) -> List[str]:
        """설정 유효성 검사, 문제 목록 반환"""
        issues = []

        if not self.google_api_key:
            issues.append("GOOGLE_API_KEY가 설정되지 않음 (Gemini, Nanobanana 사용 불가)")

        if not self.unsplash_access_key and not self.pexels_api_key:
            issues.append("스톡 이미지 API 키가 없음 (UNSPLASH_ACCESS_KEY 또는 PEXELS_API_KEY)")

        return issues


def load_config(config_path: Optional[str] = None) -> Config:
    """설정 로드 (YAML 우선, 없으면 환경변수)"""
    if config_path and Path(config_path).exists():
        return Config.from_yaml(config_path)

    # 기본 설정 파일 확인
    default_paths = ["config/default.yaml", "config.yaml", ".config.yaml"]
    for path in default_paths:
        if Path(path).exists():
            return Config.from_yaml(path)

    return Config.from_env()
