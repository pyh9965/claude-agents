"""Pipeline Orchestrator - Coordinates the entire image collection pipeline"""

import asyncio
import os
import json
import uuid
from pathlib import Path
from dataclasses import dataclass, field, asdict
from typing import List, Optional, Dict, Any
from datetime import datetime

# 상대 임포트
from ..models import (
    ImageRequirement, CollectedImage, ImagePlacement,
    ImageMap, CollectionStatistics, ImageType, ImageSource, PreferredSource
)
from ..analyzers import ContentAnalyzer
from ..collectors import GooglePlacesCollector, StockImageCollector, NanobananGenerator
from ..processors import QualityValidator, ImageOptimizer, RelevanceValidator
from ..placers import AutoPlacer, HtmlInserter
from ..utils.cache import ImageCache


@dataclass
class PipelineConfig:
    """파이프라인 설정"""
    output_dir: str = "output"
    min_images_per_content: int = 3
    max_images_per_content: int = 15
    fallback_to_stock: bool = True
    fallback_to_ai: bool = True
    optimize_images: bool = True
    convert_to_webp: bool = True
    image_quality: int = 85
    cache_enabled: bool = True
    cache_dir: str = ".cache/images"

    # 관련성 검증 (Vision AI)
    relevance_check: bool = True  # 이미지-키워드 관련성 검증
    relevance_threshold: float = 0.6  # 관련성 임계값 (0.0~1.0)

    # 수집 우선순위
    collection_priority: List[str] = field(
        default_factory=lambda: ["google", "stock", "nanobanana"]
    )


@dataclass
class PipelineResult:
    """파이프라인 실행 결과"""
    success: bool
    content_id: str
    image_map: Optional[ImageMap]
    output_html: Optional[str]
    statistics: CollectionStatistics
    errors: List[str]
    execution_time: float


class PipelineOrchestrator:
    """이미지 수집 파이프라인 오케스트레이터

    전체 흐름:
    1. 콘텐츠 분석 → ImageRequirement 목록 생성
    2. 하이브리드 수집 (실제 사진 → 스톡 → AI 생성)
    3. 이미지 품질 검증 및 최적화
    4. 자동 배치 및 HTML 삽입
    """

    def __init__(self, config: Optional[PipelineConfig] = None):
        self.config = config or PipelineConfig()

        # 컴포넌트 초기화 (모두 lazy init)
        self.analyzer = None
        self.google_collector = None
        self.stock_collector = None
        self.nanobanana = None
        self.validator = None
        self.relevance_validator = None  # Vision AI 관련성 검증기
        self.optimizer = None
        self.placer = None
        self.inserter = None

        # 캐시 초기화
        self.cache = None
        if self.config.cache_enabled:
            self.cache = ImageCache(cache_dir=self.config.cache_dir)

        # 통계
        self.stats = CollectionStatistics()

    def _init_processors(self):
        """프로세서 초기화 (lazy)"""
        if self.validator is None:
            self.validator = QualityValidator()
        if self.optimizer is None:
            self.optimizer = ImageOptimizer(
                quality=self.config.image_quality,
                convert_to_webp=self.config.convert_to_webp
            )
        if self.placer is None:
            self.placer = AutoPlacer()
        if self.inserter is None:
            self.inserter = HtmlInserter()
        # 관련성 검증기 초기화
        if self.config.relevance_check and self.relevance_validator is None:
            try:
                self.relevance_validator = RelevanceValidator(
                    confidence_threshold=self.config.relevance_threshold
                )
            except ValueError:
                print("[Pipeline] WARNING: RelevanceValidator 초기화 실패 - API 키 확인 필요")
                self.relevance_validator = None

    async def _init_collectors(self):
        """수집기 초기화 (lazy)"""
        if self.analyzer is None:
            try:
                self.analyzer = ContentAnalyzer()
            except ValueError:
                pass  # API 키 없음

        if self.google_collector is None:
            try:
                self.google_collector = GooglePlacesCollector()
            except ValueError:
                pass  # API 키 없음

        if self.stock_collector is None:
            self.stock_collector = StockImageCollector()

        if self.nanobanana is None:
            try:
                self.nanobanana = NanobananGenerator()
            except ValueError:
                pass

    async def run(
        self,
        html_content: str,
        output_dir: Optional[str] = None,
        content_id: Optional[str] = None
    ) -> PipelineResult:
        """파이프라인 실행

        Args:
            html_content: HTML 블로그 콘텐츠
            output_dir: 출력 디렉토리
            content_id: 콘텐츠 ID (없으면 자동 생성)

        Returns:
            PipelineResult
        """
        start_time = datetime.now()
        errors = []

        content_id = content_id or str(uuid.uuid4())[:8]
        output_dir = output_dir or self.config.output_dir

        # 출력 디렉토리 생성
        output_path = Path(output_dir)
        images_path = output_path / "images"
        images_path.mkdir(parents=True, exist_ok=True)

        try:
            # 1. 수집기 및 프로세서 초기화
            await self._init_collectors()
            self._init_processors()

            # 2. 콘텐츠 분석
            if self.analyzer is None:
                raise ValueError("ContentAnalyzer 초기화 실패 - GOOGLE_API_KEY를 확인하세요")

            print(f"[Pipeline] 콘텐츠 분석 중...")
            requirements = await self.analyzer.analyze(html_content)
            print(f"[Pipeline] {len(requirements)}개 이미지 요구사항 추출")

            # min/max 제한 적용
            if len(requirements) < self.config.min_images_per_content:
                print(f"[Pipeline] WARNING: 요구사항이 최소값({self.config.min_images_per_content})보다 적습니다.")

            if len(requirements) > self.config.max_images_per_content:
                print(f"[Pipeline] 요구사항을 {self.config.max_images_per_content}개로 제한합니다.")
                requirements = requirements[:self.config.max_images_per_content]

            # 3. 이미지 수집
            print(f"[Pipeline] 이미지 수집 중...")
            collected_images = await self._collect_images(requirements, images_path)
            print(f"[Pipeline] {len(collected_images)}개 이미지 수집 완료")

            # 4. 품질 검증 및 최적화
            if self.config.optimize_images:
                print(f"[Pipeline] 이미지 최적화 중...")
                collected_images = await self._optimize_images(
                    collected_images, images_path
                )

            # 5. 자동 배치
            print(f"[Pipeline] 이미지 배치 계산 중...")
            placements = self.placer.calculate_placements(
                html_content,
                [self._to_dict(r) for r in requirements],
                [self._to_dict(i) for i in collected_images]
            )

            # 6. HTML 삽입
            print(f"[Pipeline] HTML에 이미지 삽입 중...")
            output_html = self.inserter.insert_images(
                html_content,
                [self._to_dict(p) for p in placements],
                image_dir="images"
            )

            # 7. 결과 저장
            output_html_path = output_path / "content_with_images.html"
            with open(output_html_path, "w", encoding="utf-8") as f:
                f.write(output_html)

            # ImageMap 생성
            image_map = ImageMap(
                content_id=content_id,
                images=collected_images,
                placements=placements,
                statistics=self.stats
            )

            # 메타데이터 저장
            metadata_path = output_path / "image_map.json"
            self._save_metadata(image_map, metadata_path)

            execution_time = (datetime.now() - start_time).total_seconds()

            print(f"[Pipeline] 완료! (소요 시간: {execution_time:.1f}초)")
            print(f"[Pipeline] 출력: {output_html_path}")
            print(f"[Pipeline] 통계: 총 {self.stats.total}개, 실패 {self.stats.failures}개")
            print(f"[Pipeline] 소스별: {self.stats.by_source}")

            return PipelineResult(
                success=True,
                content_id=content_id,
                image_map=image_map,
                output_html=output_html,
                statistics=self.stats,
                errors=errors,
                execution_time=execution_time
            )

        except Exception as e:
            errors.append(str(e))
            execution_time = (datetime.now() - start_time).total_seconds()

            print(f"[Pipeline] 실패: {e}")

            return PipelineResult(
                success=False,
                content_id=content_id,
                image_map=None,
                output_html=None,
                statistics=self.stats,
                errors=errors,
                execution_time=execution_time
            )

    async def _collect_images(
        self,
        requirements: List[ImageRequirement],
        output_dir: Path
    ) -> List[CollectedImage]:
        """하이브리드 이미지 수집

        우선순위: 실제 사진 → 스톡 → AI 생성
        """
        collected = []

        for req in requirements:
            image = await self._collect_single_image(req, output_dir)
            if image:
                collected.append(image)
                self.stats.total += 1

        return collected

    async def _collect_single_image(
        self,
        requirement: ImageRequirement,
        output_dir: Path
    ) -> Optional[CollectedImage]:
        """단일 이미지 수집 (Fallback 포함)"""

        # 요구사항 속성 추출 (dict/dataclass 모두 지원)
        keywords = self._get_attr(requirement, 'keywords', [])
        req_id = self._get_attr(requirement, 'id', '')
        preferred = self._get_attr(requirement, 'preferred_source', 'any')
        entity_name = self._get_attr(requirement, 'entity_name')
        entity_location = self._get_attr(requirement, 'entity_location')
        img_type = self._get_attr(requirement, 'type', 'content')
        prompt = self._get_attr(requirement, 'prompt', '')

        # 캐시 확인
        cache_key = "_".join(keywords[:3]) if keywords else req_id
        if self.cache:
            cached = self.cache.get(cache_key)
            if cached:
                print(f"[Pipeline] ✓ 캐시에서 '{cache_key}' 이미지 로드")
                return cached

        # 수집 우선순위 결정
        if preferred == PreferredSource.REAL or preferred == "real":
            sources = ["google", "stock", "nanobanana"]
        elif preferred == PreferredSource.STOCK or preferred == "stock":
            sources = ["stock", "google", "nanobanana"]
        elif preferred == PreferredSource.AI or preferred == "ai":
            sources = ["nanobanana", "stock", "google"]
        else:
            sources = self.config.collection_priority

        # Fallback 옵션 적용
        if not self.config.fallback_to_stock:
            sources = [s for s in sources if s != "stock"]
        if not self.config.fallback_to_ai:
            sources = [s for s in sources if s != "nanobanana"]

        for source in sources:
            try:
                result = None

                if source == "google" and self.google_collector and entity_name:
                    print(f"[Pipeline] Google Places에서 '{entity_name}' 검색...")
                    result = await self.google_collector.collect(
                        [entity_name],
                        max_images=1,
                        location=entity_location
                    )

                elif source == "stock" and self.stock_collector:
                    print(f"[Pipeline] 스톡 이미지에서 {keywords} 검색...")
                    result = await self.stock_collector.collect(keywords, max_images=1)

                elif source == "nanobanana" and self.nanobanana:
                    print(f"[Pipeline] AI로 '{prompt}' 생성...")
                    # 스타일 자동 결정
                    style = "food" if any(kw in " ".join(keywords) for kw in ["음식", "맛집", "요리", "메뉴"]) else "default"
                    result = await self.nanobanana.collect(
                        keywords,
                        max_images=1,
                        image_type=str(img_type) if img_type else "content",
                        style=style
                    )

                if result and result.success and result.images:
                    img_data = result.images[0]

                    # 이미지 저장
                    ext = "webp" if self.config.convert_to_webp else "jpg"
                    image_id = f"{req_id}_{source}.{ext}"
                    local_path = output_dir / image_id

                    if "data" in img_data:
                        # AI 생성 이미지 (바이트 데이터)
                        with open(local_path, "wb") as f:
                            f.write(img_data["data"])
                    else:
                        # URL 기반 이미지
                        collector = self.google_collector if source == "google" else self.stock_collector
                        if collector:
                            await collector.download(img_data["url"], str(local_path))

                    # === 관련성 검증 (Vision AI) ===
                    if self.relevance_validator and source != "nanobanana":
                        # AI 생성 이미지는 검증 건너뛰기 (프롬프트로 생성되므로)
                        context = f"{entity_name} {entity_location}" if entity_name else None
                        relevance_report = self.relevance_validator.validate(
                            str(local_path), keywords, context
                        )

                        if not relevance_report.relevant:
                            print(f"[Pipeline] X {source} 이미지 관련성 없음 (신뢰도: {relevance_report.confidence:.2f})")
                            print(f"[Pipeline]   감지: {relevance_report.detected_content}")
                            print(f"[Pipeline]   사유: {relevance_report.explanation}")
                            # 파일 삭제하고 다음 소스 시도
                            try:
                                local_path.unlink()
                            except:
                                pass
                            continue  # 다음 소스로

                        print(f"[Pipeline] O 관련성 검증 통과 (신뢰도: {relevance_report.confidence:.2f})")

                    # 통계 업데이트
                    self.stats.by_source[source] = self.stats.by_source.get(source, 0) + 1

                    print(f"[Pipeline] O {source}에서 이미지 수집 성공")

                    collected_image = CollectedImage(
                        id=image_id,
                        url=img_data.get("url", ""),
                        local_path=str(local_path),
                        source=ImageSource(source) if source in ["google", "unsplash", "pexels", "nanobanana"] else ImageSource.UNSPLASH,
                        width=img_data.get("width", 0),
                        height=img_data.get("height", 0),
                        attribution=img_data.get("attribution"),
                        alt_text=f"{entity_name or keywords[0] if keywords else '이미지'} 이미지",
                        caption=img_data.get("attribution", ""),
                        requirement_id=req_id
                    )

                    # 캐시에 저장
                    if self.cache:
                        self.cache.set(cache_key, collected_image)

                    return collected_image

            except Exception as e:
                print(f"[Pipeline] {source} 수집 실패: {e}")
                continue

        # 모든 소스 실패
        print(f"[Pipeline] ✗ 모든 소스에서 이미지 수집 실패 (req_id: {req_id})")
        self.stats.failures += 1
        return None

    async def _optimize_images(
        self,
        images: List[CollectedImage],
        output_dir: Path
    ) -> List[CollectedImage]:
        """이미지 품질 검증 및 최적화"""
        optimized = []

        for img in images:
            local_path = self._get_attr(img, 'local_path', '')

            # 품질 검증
            report = self.validator.validate(local_path)

            if not report.valid:
                print(f"[Pipeline] 품질 검증 실패: {local_path}")
                print(f"[Pipeline] 이유: {', '.join(report.errors)}")
                continue

            # 최적화
            result = self.optimizer.optimize(local_path, local_path)

            if result.success:
                # 크기 업데이트
                if hasattr(img, 'width'):
                    img.width = result.new_dimensions[0]
                    img.height = result.new_dimensions[1]
                else:
                    img['width'] = result.new_dimensions[0]
                    img['height'] = result.new_dimensions[1]

                print(f"[Pipeline] 최적화 완료: {result.original_size} → {result.optimized_size} bytes")
                optimized.append(img)
            else:
                print(f"[Pipeline] 최적화 실패, 원본 사용: {local_path}")
                optimized.append(img)  # 최적화 실패해도 원본 사용

        return optimized

    def _save_metadata(self, image_map: ImageMap, path: Path):
        """메타데이터 JSON 저장"""
        data = {
            "content_id": image_map.content_id,
            "images": [
                self._to_dict(img) for img in image_map.images
            ],
            "placements": [
                self._to_dict(p) for p in image_map.placements
            ],
            "statistics": self._to_dict(image_map.statistics)
        }

        with open(path, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2, default=str)

        print(f"[Pipeline] 메타데이터 저장: {path}")

    def _to_dict(self, obj: Any) -> Dict[str, Any]:
        """객체를 딕셔너리로 변환 (dataclass/dict 모두 지원)"""
        if hasattr(obj, 'to_dict'):
            return obj.to_dict()
        elif hasattr(obj, '__dataclass_fields__'):
            return asdict(obj)
        elif isinstance(obj, dict):
            return obj
        else:
            # Enum 등 기본 타입 변환
            return str(obj)

    def _get_attr(self, obj: Any, attr: str, default: Any = None) -> Any:
        """속성 가져오기 (dataclass/dict 모두 지원)"""
        if hasattr(obj, attr):
            return getattr(obj, attr)
        elif isinstance(obj, dict):
            return obj.get(attr, default)
        else:
            return default

    async def close(self):
        """리소스 정리"""
        print("[Pipeline] 리소스 정리 중...")

        if self.google_collector:
            await self.google_collector.close()
        if self.stock_collector:
            await self.stock_collector.close()
        if self.nanobanana:
            await self.nanobanana.close()

        print("[Pipeline] 정리 완료")


# CLI 실행 예제
async def main():
    """CLI 테스트 실행"""
    import argparse

    parser = argparse.ArgumentParser(description="Blog Image Collection Pipeline")
    parser.add_argument("html_file", help="HTML 파일 경로")
    parser.add_argument("-o", "--output", default="output", help="출력 디렉토리")
    parser.add_argument("--no-optimize", action="store_true", help="최적화 비활성화")
    parser.add_argument("--no-stock", action="store_true", help="스톡 이미지 사용 안함")
    parser.add_argument("--no-ai", action="store_true", help="AI 생성 사용 안함")

    args = parser.parse_args()

    # HTML 읽기
    with open(args.html_file, "r", encoding="utf-8") as f:
        html_content = f.read()

    # 설정
    config = PipelineConfig(
        output_dir=args.output,
        optimize_images=not args.no_optimize,
        fallback_to_stock=not args.no_stock,
        fallback_to_ai=not args.no_ai
    )

    # 실행
    orchestrator = PipelineOrchestrator(config)

    try:
        result = await orchestrator.run(html_content)

        if result.success:
            print("\n=== 수집 완료 ===")
            print(f"콘텐츠 ID: {result.content_id}")
            print(f"수집 이미지: {result.statistics.total}개")
            print(f"실패: {result.statistics.failures}개")
            print(f"소스별: {result.statistics.by_source}")
            print(f"실행 시간: {result.execution_time:.1f}초")
        else:
            print("\n=== 수집 실패 ===")
            print(f"에러: {result.errors}")

    finally:
        await orchestrator.close()


if __name__ == "__main__":
    asyncio.run(main())
