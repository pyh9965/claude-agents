"""통합 파이프라인 오케스트레이터"""

from dataclasses import dataclass, field
from typing import Optional, List, Dict
from pathlib import Path
from datetime import datetime
import asyncio
import json
import logging
from collections import defaultdict

from src.collector.web_crawler import WebCrawler, CollectionResult
from src.collector.pdf_extractor import PDFExtractor, ExtractionResult
from src.classifier.vision_classifier import VisionClassifier, ClassificationResult
from src.generator.thumbnail_generator import ThumbnailGenerator, ThumbnailData, ThumbnailResult

logger = logging.getLogger(__name__)


@dataclass
class PipelineStep:
    """파이프라인 단계 정보"""
    name: str
    status: str  # pending, running, completed, failed
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    error: Optional[str] = None

    def to_dict(self):
        """딕셔너리로 변환"""
        return {
            "name": self.name,
            "status": self.status,
            "started_at": self.started_at.isoformat() if self.started_at else None,
            "completed_at": self.completed_at.isoformat() if self.completed_at else None,
            "error": self.error
        }


@dataclass
class PipelineReport:
    """파이프라인 실행 리포트"""
    url: str
    apartment_name: str
    started_at: datetime
    completed_at: Optional[datetime]
    steps: List[PipelineStep]
    collected_images: int
    extracted_images: int
    classified_images: int
    thumbnails_generated: int
    classification_summary: Dict[str, int]  # {"floor_plan": 5, "site_plan": 2, ...}

    def to_dict(self):
        """딕셔너리로 변환"""
        return {
            "url": self.url,
            "apartment_name": self.apartment_name,
            "started_at": self.started_at.isoformat(),
            "completed_at": self.completed_at.isoformat() if self.completed_at else None,
            "steps": [step.to_dict() for step in self.steps],
            "collected_images": self.collected_images,
            "extracted_images": self.extracted_images,
            "classified_images": self.classified_images,
            "thumbnails_generated": self.thumbnails_generated,
            "classification_summary": self.classification_summary
        }


class PipelineOrchestrator:
    """이미지 수집 파이프라인 오케스트레이터"""

    def __init__(self, config_path: Optional[str] = None, output_dir: str = "output"):
        """
        Args:
            config_path: 설정 파일 경로 (현재는 미사용)
            output_dir: 출력 디렉토리
        """
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)
        self.logger = logging.getLogger(__name__)

        # 컴포넌트 초기화
        self.crawler = WebCrawler(output_dir=str(self.output_dir / "images"))
        self.extractor = PDFExtractor(output_dir=str(self.output_dir / "pdf_images"))
        self.classifier = VisionClassifier()
        self.thumbnail_gen = ThumbnailGenerator(output_dir=str(self.output_dir / "thumbnails"))

        # 리포트 저장 디렉토리
        self.report_dir = self.output_dir / "reports"
        self.report_dir.mkdir(exist_ok=True)

    async def run(self, url: str, generate_thumbnails: bool = True) -> PipelineReport:
        """
        전체 파이프라인 실행

        Args:
            url: 크롤링할 URL
            generate_thumbnails: 썸네일 생성 여부

        Returns:
            PipelineReport: 실행 결과 리포트
        """
        started_at = datetime.now()
        apartment_name = "Unknown"

        # 단계 초기화
        steps = {
            "collect": PipelineStep(name="collect", status="pending"),
            "extract": PipelineStep(name="extract", status="pending"),
            "classify": PipelineStep(name="classify", status="pending"),
            "thumbnail": PipelineStep(name="thumbnail", status="pending") if generate_thumbnails else None
        }

        # 결과 카운터
        collected_count = 0
        extracted_count = 0
        classified_count = 0
        thumbnail_count = 0
        classification_summary = defaultdict(int)

        # 모든 이미지 경로 수집
        all_image_paths = []
        collection_result = None
        extraction_results = []

        self.logger.info("=" * 80)
        self.logger.info(f"[PIPELINE] 시작: {url}")
        self.logger.info("=" * 80)

        # ========================================
        # 1단계: 웹 이미지 수집
        # ========================================
        step = steps["collect"]
        step.status = "running"
        step.started_at = datetime.now()
        self._log_step(step, f"웹 이미지 수집 중... URL: {url}")

        try:
            collection_result = await self.crawler.collect_and_download(url)
            apartment_name = collection_result.apartment_name
            collected_count = len([img for img in collection_result.images if img.local_path])

            # 수집된 이미지 경로 추가
            all_image_paths.extend([
                img.local_path for img in collection_result.images
                if img.local_path
            ])

            step.status = "completed"
            step.completed_at = datetime.now()
            self._log_step(step, f"완료: {collected_count}개 이미지 수집")

        except Exception as e:
            step.status = "failed"
            step.error = str(e)
            step.completed_at = datetime.now()
            self.logger.error(f"[COLLECT] 실패: {e}", exc_info=True)
            # 수집 실패 시에도 계속 진행 (PDF가 있을 수 있음)

        # ========================================
        # 2단계: PDF 이미지 추출
        # ========================================
        step = steps["extract"]
        step.status = "running"
        step.started_at = datetime.now()

        if collection_result and collection_result.pdf_urls:
            self._log_step(step, f"PDF 이미지 추출 중... ({len(collection_result.pdf_urls)}개 PDF)")

            try:
                # PDF 다운로드된 경로 찾기
                pdf_dir = self.output_dir / "images" / "pdfs"
                pdf_files = list(pdf_dir.glob("*.pdf")) if pdf_dir.exists() else []

                if pdf_files:
                    for pdf_file in pdf_files:
                        try:
                            extraction_result = self.extractor.extract_images(
                                str(pdf_file),
                                apartment_name
                            )
                            extraction_results.append(extraction_result)
                            extracted_count += len(extraction_result.images)

                            # 추출된 이미지 경로 추가
                            all_image_paths.extend([
                                img.local_path for img in extraction_result.images
                            ])

                        except Exception as e:
                            self.logger.error(f"PDF 추출 실패 ({pdf_file}): {e}")
                            continue

                    step.status = "completed"
                    step.completed_at = datetime.now()
                    self._log_step(step, f"완료: {extracted_count}개 이미지 추출")
                else:
                    step.status = "completed"
                    step.completed_at = datetime.now()
                    self._log_step(step, "PDF 파일 없음 - 건너뜀")

            except Exception as e:
                step.status = "failed"
                step.error = str(e)
                step.completed_at = datetime.now()
                self.logger.error(f"[EXTRACT] 실패: {e}", exc_info=True)
        else:
            step.status = "completed"
            step.completed_at = datetime.now()
            self._log_step(step, "PDF 없음 - 건너뜀")

        # ========================================
        # 3단계: 이미지 분류
        # ========================================
        step = steps["classify"]
        step.status = "running"
        step.started_at = datetime.now()

        if all_image_paths:
            self._log_step(step, f"이미지 분류 중... ({len(all_image_paths)}개)")

            try:
                classification_results = self.classifier.classify_batch(all_image_paths)
                classified_count = len(classification_results)

                # 분류 결과 요약
                for result in classification_results:
                    classification_summary[result.image_type] += 1

                # 분류 결과 저장
                self._save_classification_results(
                    classification_results,
                    apartment_name
                )

                step.status = "completed"
                step.completed_at = datetime.now()
                self._log_step(
                    step,
                    f"완료: {classified_count}개 이미지 분류 "
                    f"(floor_plan: {classification_summary.get('floor_plan', 0)}, "
                    f"site_plan: {classification_summary.get('site_plan', 0)}, "
                    f"aerial_view: {classification_summary.get('aerial_view', 0)}, "
                    f"location_map: {classification_summary.get('location_map', 0)}, "
                    f"other: {classification_summary.get('other', 0)})"
                )

            except Exception as e:
                step.status = "failed"
                step.error = str(e)
                step.completed_at = datetime.now()
                self.logger.error(f"[CLASSIFY] 실패: {e}", exc_info=True)
        else:
            step.status = "completed"
            step.completed_at = datetime.now()
            self._log_step(step, "분류할 이미지 없음 - 건너뜀")

        # ========================================
        # 4단계: 썸네일 생성 (선택사항)
        # ========================================
        if generate_thumbnails and steps["thumbnail"]:
            step = steps["thumbnail"]
            step.status = "running"
            step.started_at = datetime.now()
            self._log_step(step, "썸네일 생성 중...")

            try:
                # 대표 이미지 선택 (조감도 우선, 없으면 첫 번째 이미지)
                background_image = None
                if classification_results:
                    aerial_views = [
                        r for r in classification_results
                        if r.image_type == "aerial_view"
                    ]
                    if aerial_views:
                        background_image = aerial_views[0].image_path
                    elif all_image_paths:
                        background_image = all_image_paths[0]

                # 썸네일 데이터 생성
                thumbnail_data = ThumbnailData(
                    apartment_name=apartment_name,
                    price="분양가 정보 없음",  # 실제로는 크롤링 결과에서 추출해야 함
                    background_image=background_image,
                    subtitle=f"수집: {collected_count + extracted_count}개 이미지"
                )

                # 썸네일 생성
                thumbnail_result = self.thumbnail_gen.generate(thumbnail_data)
                thumbnail_count = 1

                step.status = "completed"
                step.completed_at = datetime.now()
                self._log_step(step, f"완료: 썸네일 생성 ({thumbnail_result.output_path})")

            except Exception as e:
                step.status = "failed"
                step.error = str(e)
                step.completed_at = datetime.now()
                self.logger.error(f"[THUMBNAIL] 실패: {e}", exc_info=True)

        # ========================================
        # 리포트 생성
        # ========================================
        completed_at = datetime.now()

        report = PipelineReport(
            url=url,
            apartment_name=apartment_name,
            started_at=started_at,
            completed_at=completed_at,
            steps=[s for s in steps.values() if s is not None],
            collected_images=collected_count,
            extracted_images=extracted_count,
            classified_images=classified_count,
            thumbnails_generated=thumbnail_count,
            classification_summary=dict(classification_summary)
        )

        # 리포트 저장
        report_path = self.save_report(report)

        # 최종 요약 로그
        duration = (completed_at - started_at).total_seconds()
        self.logger.info("=" * 80)
        self.logger.info(f"[PIPELINE] 완료: {apartment_name}")
        self.logger.info(f"  - 소요 시간: {duration:.1f}초")
        self.logger.info(f"  - 수집: {collected_count}개")
        self.logger.info(f"  - PDF 추출: {extracted_count}개")
        self.logger.info(f"  - 분류: {classified_count}개")
        if generate_thumbnails:
            self.logger.info(f"  - 썸네일: {thumbnail_count}개")
        self.logger.info(f"  - 리포트: {report_path}")
        self.logger.info("=" * 80)

        return report

    def _log_step(self, step: PipelineStep, message: str):
        """단계별 로깅"""
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        log_prefix = f"[{timestamp}] [{step.name.upper()}]"

        if step.status == "running":
            self.logger.info(f"{log_prefix} {message}")
        elif step.status == "completed":
            self.logger.info(f"{log_prefix} {message}")
        elif step.status == "failed":
            self.logger.error(f"{log_prefix} 실패: {message}")
        else:
            self.logger.debug(f"{log_prefix} {message}")

    def _save_classification_results(
        self,
        results: List[ClassificationResult],
        apartment_name: str
    ):
        """분류 결과를 JSON으로 저장"""
        try:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            safe_name = "".join(
                c if c.isalnum() or c in (' ', '-', '_') else '_'
                for c in apartment_name
            )
            filename = f"{safe_name}_classification_{timestamp}.json"
            filepath = self.report_dir / filename

            results_dict = [result.to_dict() for result in results]

            with open(filepath, "w", encoding="utf-8") as f:
                json.dump(results_dict, f, ensure_ascii=False, indent=2)

            self.logger.debug(f"분류 결과 저장: {filepath}")

        except Exception as e:
            self.logger.error(f"분류 결과 저장 실패: {e}")

    def save_report(self, report: PipelineReport, output_path: Optional[str] = None) -> str:
        """
        리포트를 JSON으로 저장

        Args:
            report: 저장할 리포트
            output_path: 저장 경로 (None이면 자동 생성)

        Returns:
            str: 저장된 파일 경로
        """
        try:
            if output_path is None:
                timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                safe_name = "".join(
                    c if c.isalnum() or c in (' ', '-', '_') else '_'
                    for c in report.apartment_name
                )
                filename = f"{safe_name}_report_{timestamp}.json"
                output_path = str(self.report_dir / filename)

            output_file = Path(output_path)
            output_file.parent.mkdir(parents=True, exist_ok=True)

            # 리포트를 JSON으로 저장
            with open(output_file, "w", encoding="utf-8") as f:
                json.dump(report.to_dict(), f, ensure_ascii=False, indent=2)

            self.logger.info(f"리포트 저장: {output_path}")
            return str(output_file.absolute())

        except Exception as e:
            self.logger.error(f"리포트 저장 실패: {e}", exc_info=True)
            raise

    async def run_batch(self, urls: List[str], generate_thumbnails: bool = True) -> List[PipelineReport]:
        """
        여러 URL에 대해 파이프라인 실행

        Args:
            urls: 크롤링할 URL 리스트
            generate_thumbnails: 썸네일 생성 여부

        Returns:
            List[PipelineReport]: 각 URL별 실행 결과 리포트
        """
        self.logger.info(f"배치 파이프라인 시작: {len(urls)}개 URL")

        reports = []
        for i, url in enumerate(urls, 1):
            self.logger.info(f"\n[배치 {i}/{len(urls)}] 처리 중: {url}")

            try:
                report = await self.run(url, generate_thumbnails)
                reports.append(report)
            except Exception as e:
                self.logger.error(f"[배치 {i}/{len(urls)}] 실패: {e}", exc_info=True)
                # 실패해도 다음 URL 계속 처리
                continue

        self.logger.info(f"\n배치 파이프라인 완료: {len(reports)}/{len(urls)}개 성공")

        # 배치 요약 리포트 생성
        self._save_batch_summary(reports, urls)

        return reports

    def _save_batch_summary(self, reports: List[PipelineReport], urls: List[str]):
        """배치 실행 요약 리포트 저장"""
        try:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"batch_summary_{timestamp}.json"
            filepath = self.report_dir / filename

            summary = {
                "timestamp": timestamp,
                "total_urls": len(urls),
                "successful": len(reports),
                "failed": len(urls) - len(reports),
                "total_images_collected": sum(r.collected_images for r in reports),
                "total_images_extracted": sum(r.extracted_images for r in reports),
                "total_images_classified": sum(r.classified_images for r in reports),
                "total_thumbnails": sum(r.thumbnails_generated for r in reports),
                "reports": [
                    {
                        "url": r.url,
                        "apartment_name": r.apartment_name,
                        "status": "success" if all(s.status in ["completed", "pending"] for s in r.steps) else "partial_failure",
                        "images": r.collected_images + r.extracted_images
                    }
                    for r in reports
                ]
            }

            with open(filepath, "w", encoding="utf-8") as f:
                json.dump(summary, f, ensure_ascii=False, indent=2)

            self.logger.info(f"배치 요약 저장: {filepath}")

        except Exception as e:
            self.logger.error(f"배치 요약 저장 실패: {e}")


# 레거시 호환성을 위한 Orchestrator 클래스
class Orchestrator:
    """이미지 수집 파이프라인 오케스트레이터 (레거시 호환)"""

    def __init__(self, config: Dict):
        """
        Args:
            config: 파이프라인 설정
        """
        self.config = config
        output_dir = config.get("output_dir", "output")
        self.pipeline = PipelineOrchestrator(output_dir=output_dir)

    async def run_pipeline(
        self,
        urls: Optional[List[str]] = None,
        pdf_paths: Optional[List[str]] = None
    ) -> Dict[str, any]:
        """
        전체 파이프라인 실행 (레거시 인터페이스)

        Args:
            urls: 크롤링할 URL 리스트
            pdf_paths: 처리할 PDF 파일 경로 리스트

        Returns:
            파이프라인 실행 결과
            {
                "collected_images": List[str],
                "classified_images": List[Dict],
                "thumbnails": List[str],
                "stats": Dict
            }
        """
        if not urls:
            raise ValueError("urls 파라미터가 필요합니다")

        # 첫 번째 URL만 처리 (레거시 호환성)
        report = await self.pipeline.run(urls[0], generate_thumbnails=True)

        return {
            "collected_images": [],  # 경로 정보는 리포트에 포함됨
            "classified_images": [],
            "thumbnails": [],
            "stats": {
                "apartment_name": report.apartment_name,
                "collected": report.collected_images,
                "extracted": report.extracted_images,
                "classified": report.classified_images,
                "classification_summary": report.classification_summary
            }
        }

    async def run_collection_only(
        self,
        urls: Optional[List[str]] = None,
        pdf_paths: Optional[List[str]] = None
    ) -> List[str]:
        """
        이미지 수집만 실행 (레거시 인터페이스)

        Args:
            urls: 크롤링할 URL 리스트
            pdf_paths: 처리할 PDF 파일 경로 리스트

        Returns:
            수집된 이미지 파일 경로 리스트
        """
        if not urls:
            return []

        # 수집만 수행
        result = await self.pipeline.crawler.collect_and_download(urls[0])
        return [img.local_path for img in result.images if img.local_path]
