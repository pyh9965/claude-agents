"""Crawl4AI 기반 웹 크롤러"""

from dataclasses import dataclass, field
from typing import Optional, List
from datetime import datetime
import asyncio
import aiofiles
import httpx
from pathlib import Path
from crawl4ai import AsyncWebCrawler, BrowserConfig, CrawlerRunConfig
from crawl4ai.extraction_strategy import LLMExtractionStrategy
import json
import logging
from urllib.parse import urljoin, urlparse
import re

logger = logging.getLogger(__name__)


@dataclass
class CollectedImage:
    """수집된 이미지 정보"""
    url: str
    image_type: str  # floor_plan, site_plan, aerial_view, location_map, other
    apartment_name: str
    collected_at: datetime
    local_path: Optional[str] = None
    metadata: dict = field(default_factory=dict)


@dataclass
class CollectionResult:
    """수집 결과"""
    apartment_name: str
    images: List[CollectedImage]
    pdf_urls: List[str]
    metadata: dict


class WebCrawler:
    """Crawl4AI를 사용한 웹 이미지 크롤러"""

    def __init__(self, output_dir: str = "output", api_token: Optional[str] = None):
        """
        Args:
            output_dir: 이미지 저장 디렉토리
            api_token: Google Gemini API 토큰
        """
        import os
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)
        self.api_token = api_token or os.getenv("GOOGLE_API_KEY")

        # 디렉토리 구조 생성
        (self.output_dir / "images").mkdir(exist_ok=True)
        (self.output_dir / "pdfs").mkdir(exist_ok=True)
        (self.output_dir / "metadata").mkdir(exist_ok=True)

    def _get_extraction_schema(self) -> dict:
        """LLM 추출을 위한 스키마 정의"""
        return {
            "type": "object",
            "properties": {
                "apartment_name": {
                    "type": "string",
                    "description": "아파트 또는 분양 단지 이름"
                },
                "images": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "url": {"type": "string", "description": "이미지 URL"},
                            "type": {
                                "type": "string",
                                "enum": ["floor_plan", "site_plan", "aerial_view", "location_map", "other"],
                                "description": "이미지 타입 - floor_plan: 평면도, site_plan: 배치도, aerial_view: 조감도, location_map: 위치도"
                            },
                            "description": {"type": "string", "description": "이미지 설명"}
                        },
                        "required": ["url", "type"]
                    }
                },
                "pdf_links": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "PDF 파일 링크 목록"
                }
            },
            "required": ["apartment_name", "images", "pdf_links"]
        }

    def _get_extraction_instruction(self) -> str:
        """LLM 추출 지시사항"""
        return """
        이 웹페이지에서 다음 정보를 추출해주세요:

        1. 아파트/분양 단지 이름
        2. 이미지들 (각 이미지에 대해):
           - 이미지 URL (전체 URL)
           - 이미지 타입:
             * floor_plan: 평면도 (집 내부 구조도)
             * site_plan: 배치도 (단지 내 건물 배치)
             * aerial_view: 조감도 (단지 전체 외관)
             * location_map: 위치도 (교통, 주변시설 등)
             * other: 기타
           - 이미지 설명 (한글로)

        3. PDF 링크들 (분양안내서, 카탈로그 등)

        주의사항:
        - 이미지 URL은 상대경로가 아닌 절대경로로 추출
        - 작은 아이콘이나 로고는 제외
        - 평면도, 배치도, 조감도 등 실제 분양 정보 이미지만 포함
        """

    async def collect_from_url(self, url: str) -> CollectionResult:
        """
        URL에서 이미지와 PDF 링크를 수집

        Args:
            url: 크롤링할 URL

        Returns:
            CollectionResult: 수집 결과
        """
        logger.info(f"Starting collection from URL: {url}")

        # Browser 설정
        browser_config = BrowserConfig(
            headless=True,
            verbose=False,
            extra_args=["--disable-gpu", "--disable-dev-shm-usage", "--no-sandbox"]
        )

        # LLM 추출 전략 설정 (Google Gemini 사용)
        extraction_strategy = LLMExtractionStrategy(
            provider="gemini/gemini-2.0-flash",
            api_token=self.api_token,
            schema=self._get_extraction_schema(),
            extraction_type="schema",
            instruction=self._get_extraction_instruction()
        )

        # Crawler 실행 설정
        run_config = CrawlerRunConfig(
            extraction_strategy=extraction_strategy,
            word_count_threshold=10,
            excluded_tags=['nav', 'footer', 'header'],
            exclude_external_links=True
        )

        try:
            async with AsyncWebCrawler(config=browser_config) as crawler:
                result = await crawler.arun(
                    url=url,
                    config=run_config
                )

                if not result.success:
                    logger.error(f"Crawling failed for {url}: {result.error_message}")
                    return CollectionResult(
                        apartment_name="Unknown",
                        images=[],
                        pdf_urls=[],
                        metadata={"error": result.error_message, "url": url}
                    )

                # LLM 추출 결과 파싱
                extracted_data = {}
                if result.extracted_content:
                    try:
                        extracted_data = json.loads(result.extracted_content)
                    except json.JSONDecodeError as e:
                        logger.warning(f"Failed to parse extracted content: {e}")
                        extracted_data = self._fallback_extraction(result, url)
                else:
                    logger.warning("No extracted content, using fallback")
                    extracted_data = self._fallback_extraction(result, url)

                # CollectedImage 객체 생성
                apartment_name = extracted_data.get("apartment_name", "Unknown")
                images = []

                for img_data in extracted_data.get("images", []):
                    img_url = img_data.get("url", "")
                    if not img_url:
                        continue

                    # 상대 URL을 절대 URL로 변환
                    img_url = urljoin(url, img_url)

                    images.append(CollectedImage(
                        url=img_url,
                        image_type=img_data.get("type", "other"),
                        apartment_name=apartment_name,
                        collected_at=datetime.now(),
                        metadata={"description": img_data.get("description", "")}
                    ))

                # PDF URL 추출 및 절대 URL 변환
                pdf_urls = [urljoin(url, pdf_url) for pdf_url in extracted_data.get("pdf_links", [])]

                collection_result = CollectionResult(
                    apartment_name=apartment_name,
                    images=images,
                    pdf_urls=pdf_urls,
                    metadata={
                        "source_url": url,
                        "collected_at": datetime.now().isoformat(),
                        "total_images": len(images),
                        "total_pdfs": len(pdf_urls)
                    }
                )

                logger.info(f"Collection completed: {len(images)} images, {len(pdf_urls)} PDFs")
                return collection_result

        except Exception as e:
            logger.error(f"Error during collection from {url}: {e}", exc_info=True)
            return CollectionResult(
                apartment_name="Unknown",
                images=[],
                pdf_urls=[],
                metadata={"error": str(e), "url": url}
            )

    def _fallback_extraction(self, result, base_url: str) -> dict:
        """LLM 추출 실패시 폴백 방식으로 이미지/PDF 추출"""
        logger.info("Using fallback extraction method")

        images = []
        pdf_urls = []
        apartment_name = "Unknown"

        # HTML에서 직접 이미지 추출
        if result.media and "images" in result.media:
            for img in result.media["images"][:50]:  # 최대 50개
                img_url = img.get("src", "")
                if not img_url:
                    continue

                img_url = urljoin(base_url, img_url)
                alt_text = img.get("alt", "").lower()

                # 이미지 타입 추론
                img_type = "other"
                if any(keyword in alt_text for keyword in ["평면도", "floor", "plan"]):
                    img_type = "floor_plan"
                elif any(keyword in alt_text for keyword in ["배치도", "site"]):
                    img_type = "site_plan"
                elif any(keyword in alt_text for keyword in ["조감도", "aerial"]):
                    img_type = "aerial_view"
                elif any(keyword in alt_text for keyword in ["위치도", "location"]):
                    img_type = "location_map"

                images.append({
                    "url": img_url,
                    "type": img_type,
                    "description": img.get("alt", "")
                })

        # PDF 링크 추출
        if result.links:
            for link_data in result.links.get("internal", [])[:20]:
                link_url = link_data.get("href", "")
                if link_url.lower().endswith(".pdf"):
                    pdf_urls.append(urljoin(base_url, link_url))

        # 아파트 이름 추론 (title 또는 h1에서)
        if hasattr(result, "metadata") and result.metadata:
            apartment_name = result.metadata.get("title", "Unknown")

        return {
            "apartment_name": apartment_name,
            "images": images,
            "pdf_links": pdf_urls
        }

    async def download_image(self, image: CollectedImage) -> str:
        """
        이미지를 로컬에 다운로드

        Args:
            image: 다운로드할 이미지 정보

        Returns:
            str: 저장된 파일 경로
        """
        try:
            # 파일명 생성 (아파트명_타입_timestamp)
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            ext = Path(urlparse(image.url).path).suffix or ".jpg"
            safe_name = re.sub(r'[^\w\s-]', '', image.apartment_name)[:50]
            filename = f"{safe_name}_{image.image_type}_{timestamp}{ext}"
            filepath = self.output_dir / "images" / filename

            # HTTP 다운로드
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(image.url, follow_redirects=True)
                response.raise_for_status()

                async with aiofiles.open(filepath, "wb") as f:
                    await f.write(response.content)

            image.local_path = str(filepath)
            logger.info(f"Downloaded image: {filepath}")
            return str(filepath)

        except Exception as e:
            logger.error(f"Failed to download image {image.url}: {e}")
            raise

    async def download_pdf(self, pdf_url: str, apartment_name: str) -> str:
        """
        PDF를 로컬에 다운로드

        Args:
            pdf_url: PDF URL
            apartment_name: 아파트 이름

        Returns:
            str: 저장된 파일 경로
        """
        try:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            safe_name = re.sub(r'[^\w\s-]', '', apartment_name)[:50]
            filename = f"{safe_name}_{timestamp}.pdf"
            filepath = self.output_dir / "pdfs" / filename

            async with httpx.AsyncClient(timeout=60.0) as client:
                response = await client.get(pdf_url, follow_redirects=True)
                response.raise_for_status()

                async with aiofiles.open(filepath, "wb") as f:
                    await f.write(response.content)

            logger.info(f"Downloaded PDF: {filepath}")
            return str(filepath)

        except Exception as e:
            logger.error(f"Failed to download PDF {pdf_url}: {e}")
            raise

    async def collect_and_download(self, url: str) -> CollectionResult:
        """
        수집과 다운로드를 한 번에 실행

        Args:
            url: 크롤링할 URL

        Returns:
            CollectionResult: 수집 및 다운로드 결과
        """
        # 1. 수집
        result = await self.collect_from_url(url)

        # 2. 이미지 다운로드
        download_tasks = []
        for image in result.images:
            download_tasks.append(self.download_image(image))

        if download_tasks:
            try:
                await asyncio.gather(*download_tasks, return_exceptions=True)
            except Exception as e:
                logger.error(f"Error during image downloads: {e}")

        # 3. PDF 다운로드
        pdf_tasks = []
        for pdf_url in result.pdf_urls:
            pdf_tasks.append(self.download_pdf(pdf_url, result.apartment_name))

        if pdf_tasks:
            try:
                await asyncio.gather(*pdf_tasks, return_exceptions=True)
            except Exception as e:
                logger.error(f"Error during PDF downloads: {e}")

        # 4. 메타데이터 저장
        await self._save_metadata(result)

        return result

    async def _save_metadata(self, result: CollectionResult):
        """수집 결과 메타데이터를 JSON으로 저장"""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        safe_name = re.sub(r'[^\w\s-]', '', result.apartment_name)[:50]
        filename = f"{safe_name}_{timestamp}.json"
        filepath = self.output_dir / "metadata" / filename

        metadata = {
            "apartment_name": result.apartment_name,
            "images": [
                {
                    "url": img.url,
                    "type": img.image_type,
                    "local_path": img.local_path,
                    "collected_at": img.collected_at.isoformat(),
                    "metadata": img.metadata
                }
                for img in result.images
            ],
            "pdf_urls": result.pdf_urls,
            "metadata": result.metadata
        }

        async with aiofiles.open(filepath, "w", encoding="utf-8") as f:
            await f.write(json.dumps(metadata, ensure_ascii=False, indent=2))

        logger.info(f"Saved metadata: {filepath}")

    async def crawl_url(self, url: str) -> List[str]:
        """
        URL에서 이미지 수집 (레거시 호환성)

        Args:
            url: 크롤링할 URL

        Returns:
            수집된 이미지 파일 경로 리스트
        """
        result = await self.collect_and_download(url)
        return [img.local_path for img in result.images if img.local_path]

    async def crawl_multiple(self, urls: List[str]) -> List[str]:
        """
        여러 URL에서 이미지 수집

        Args:
            urls: 크롤링할 URL 리스트

        Returns:
            수집된 이미지 파일 경로 리스트
        """
        tasks = [self.crawl_url(url) for url in urls]
        results = await asyncio.gather(*tasks, return_exceptions=True)

        all_paths = []
        for result in results:
            if isinstance(result, list):
                all_paths.extend(result)
            else:
                logger.error(f"Error in crawl_multiple: {result}")

        return all_paths
