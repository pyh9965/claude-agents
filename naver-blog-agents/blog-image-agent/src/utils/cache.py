import os
import json
import hashlib
import shutil
from pathlib import Path
from datetime import datetime, timedelta
from dataclasses import dataclass, asdict
from typing import Optional, List, Dict, Any


@dataclass
class CacheEntry:
    """캐시 엔트리"""
    key: str
    keywords: List[str]
    source: str
    local_path: str
    url: str
    created_at: str
    expires_at: str
    metadata: Dict[str, Any]


@dataclass
class CacheStats:
    """캐시 통계"""
    total_entries: int
    total_size_mb: float
    hits: int
    misses: int
    hit_rate: float


class ImageCache:
    """이미지 캐싱 시스템

    키워드 기반 캐시 키 생성, TTL 관리, 통계 제공
    """

    def __init__(
        self,
        cache_dir: str = ".cache/images",
        ttl_days: int = 7,
        max_size_mb: int = 500
    ):
        self.cache_dir = Path(cache_dir)
        self.cache_dir.mkdir(parents=True, exist_ok=True)

        self.ttl_days = ttl_days
        self.max_size_mb = max_size_mb

        self.index_path = self.cache_dir / "index.json"
        self.index: Dict[str, CacheEntry] = {}

        # 통계
        self.hits = 0
        self.misses = 0

        # 인덱스 로드
        self._load_index()

    def _generate_key(self, keywords: List[str], source: str = "") -> str:
        """캐시 키 생성

        Args:
            keywords: 검색 키워드
            source: 이미지 소스 (google, unsplash, pexels, nanobanana)

        Returns:
            해시 기반 캐시 키
        """
        # 키워드 정규화 (소문자, 정렬)
        normalized = sorted([kw.lower().strip() for kw in keywords])
        key_string = f"{source}:{','.join(normalized)}"

        return hashlib.md5(key_string.encode()).hexdigest()[:16]

    def get(self, keywords: List[str], source: str = "") -> Optional[str]:
        """캐시에서 이미지 경로 조회

        Args:
            keywords: 검색 키워드
            source: 이미지 소스

        Returns:
            로컬 이미지 경로 또는 None
        """
        key = self._generate_key(keywords, source)

        if key not in self.index:
            self.misses += 1
            return None

        entry = self.index[key]

        # 만료 확인
        expires_at = datetime.fromisoformat(entry.expires_at)
        if datetime.now() > expires_at:
            self._remove_entry(key)
            self.misses += 1
            return None

        # 파일 존재 확인
        if not Path(entry.local_path).exists():
            self._remove_entry(key)
            self.misses += 1
            return None

        self.hits += 1
        return entry.local_path

    def put(
        self,
        keywords: List[str],
        source: str,
        local_path: str,
        url: str = "",
        metadata: Optional[Dict[str, Any]] = None
    ) -> str:
        """이미지를 캐시에 저장

        Args:
            keywords: 검색 키워드
            source: 이미지 소스
            local_path: 원본 이미지 경로
            url: 원본 URL
            metadata: 추가 메타데이터

        Returns:
            캐시된 이미지 경로
        """
        key = self._generate_key(keywords, source)

        # 캐시 디렉토리에 복사
        src_path = Path(local_path)
        cache_filename = f"{key}{src_path.suffix}"
        cache_path = self.cache_dir / cache_filename

        shutil.copy2(src_path, cache_path)

        # 인덱스 업데이트
        now = datetime.now()
        expires = now + timedelta(days=self.ttl_days)

        entry = CacheEntry(
            key=key,
            keywords=keywords,
            source=source,
            local_path=str(cache_path),
            url=url,
            created_at=now.isoformat(),
            expires_at=expires.isoformat(),
            metadata=metadata or {}
        )

        self.index[key] = entry
        self._save_index()

        # 크기 제한 확인
        self._enforce_size_limit()

        return str(cache_path)

    def invalidate(self, keywords: List[str], source: str = "") -> bool:
        """캐시 엔트리 무효화

        Args:
            keywords: 검색 키워드
            source: 이미지 소스

        Returns:
            성공 여부
        """
        key = self._generate_key(keywords, source)
        return self._remove_entry(key)

    def clear(self):
        """전체 캐시 삭제"""
        for key in list(self.index.keys()):
            self._remove_entry(key)

        self.hits = 0
        self.misses = 0

    def get_stats(self) -> CacheStats:
        """캐시 통계 반환"""
        total_size = sum(
            Path(entry.local_path).stat().st_size
            for entry in self.index.values()
            if Path(entry.local_path).exists()
        )

        total_requests = self.hits + self.misses
        hit_rate = self.hits / total_requests if total_requests > 0 else 0.0

        return CacheStats(
            total_entries=len(self.index),
            total_size_mb=total_size / (1024 * 1024),
            hits=self.hits,
            misses=self.misses,
            hit_rate=hit_rate
        )

    def cleanup_expired(self) -> int:
        """만료된 엔트리 정리

        Returns:
            삭제된 엔트리 수
        """
        now = datetime.now()
        expired_keys = []

        for key, entry in self.index.items():
            expires_at = datetime.fromisoformat(entry.expires_at)
            if now > expires_at:
                expired_keys.append(key)

        for key in expired_keys:
            self._remove_entry(key)

        return len(expired_keys)

    def _remove_entry(self, key: str) -> bool:
        """엔트리 삭제"""
        if key not in self.index:
            return False

        entry = self.index[key]

        # 파일 삭제
        try:
            Path(entry.local_path).unlink(missing_ok=True)
        except Exception:
            pass

        # 인덱스에서 제거
        del self.index[key]
        self._save_index()

        return True

    def _load_index(self):
        """인덱스 로드"""
        if self.index_path.exists():
            try:
                with open(self.index_path, "r", encoding="utf-8") as f:
                    data = json.load(f)

                self.index = {
                    k: CacheEntry(**v) for k, v in data.items()
                }
            except Exception:
                self.index = {}

    def _save_index(self):
        """인덱스 저장"""
        data = {k: asdict(v) for k, v in self.index.items()}

        with open(self.index_path, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)

    def _enforce_size_limit(self):
        """크기 제한 적용 (LRU 방식)"""
        total_size = sum(
            Path(entry.local_path).stat().st_size
            for entry in self.index.values()
            if Path(entry.local_path).exists()
        )

        max_bytes = self.max_size_mb * 1024 * 1024

        if total_size <= max_bytes:
            return

        # 오래된 것부터 삭제
        sorted_entries = sorted(
            self.index.items(),
            key=lambda x: x[1].created_at
        )

        for key, entry in sorted_entries:
            if total_size <= max_bytes:
                break

            try:
                file_size = Path(entry.local_path).stat().st_size
                self._remove_entry(key)
                total_size -= file_size
            except Exception:
                pass
