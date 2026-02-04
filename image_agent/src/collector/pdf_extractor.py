"""PyMuPDF 기반 PDF 이미지 추출기"""

from dataclasses import dataclass
from pathlib import Path
from typing import Optional
import fitz  # PyMuPDF
from PIL import Image
import io
import logging


@dataclass
class ExtractedImage:
    """추출된 이미지 정보"""
    page_number: int
    image_index: int
    width: int
    height: int
    format: str
    local_path: str


@dataclass
class ExtractionResult:
    """PDF 추출 결과"""
    pdf_path: str
    apartment_name: str
    total_pages: int
    images: list[ExtractedImage]


class PDFExtractor:
    """PyMuPDF를 사용한 PDF 이미지 추출기"""

    def __init__(self, output_dir: str = "output", min_width: int = 100, min_height: int = 100):
        """
        Args:
            output_dir: 이미지 저장 디렉토리
            min_width: 추출할 최소 이미지 너비 (작은 아이콘 필터링용)
            min_height: 추출할 최소 이미지 높이 (작은 아이콘 필터링용)
        """
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)
        self.min_width = min_width
        self.min_height = min_height
        self.logger = logging.getLogger(__name__)

    def extract_images(self, pdf_path: str, apartment_name: str) -> ExtractionResult:
        """
        PDF 파일에서 모든 이미지를 추출

        Args:
            pdf_path: PDF 파일 경로
            apartment_name: 단지명 (파일명 생성용)

        Returns:
            ExtractionResult: 추출 결과 정보

        Raises:
            FileNotFoundError: PDF 파일이 존재하지 않는 경우
            Exception: PDF 열기 또는 이미지 추출 실패
        """
        pdf_file = Path(pdf_path)
        if not pdf_file.exists():
            raise FileNotFoundError(f"PDF file not found: {pdf_path}")

        extracted_images = []

        try:
            # PDF 열기
            doc = fitz.open(pdf_path)
            total_pages = len(doc)
            self.logger.info(f"Processing PDF: {pdf_path} ({total_pages} pages)")

            # 각 페이지에서 이미지 추출
            for page_num in range(total_pages):
                page = doc[page_num]
                image_list = page.get_images(full=True)

                self.logger.debug(f"Page {page_num + 1}: Found {len(image_list)} images")

                # 페이지 내 각 이미지 처리
                for img_index, img_info in enumerate(image_list):
                    try:
                        xref = img_info[0]  # 이미지 참조 번호

                        # 이미지 추출
                        base_image = doc.extract_image(xref)
                        image_bytes = base_image["image"]
                        image_ext = base_image["ext"]  # png, jpeg 등
                        width = base_image["width"]
                        height = base_image["height"]

                        # 최소 크기 필터링 (아이콘, 로고 등 제외)
                        if width < self.min_width or height < self.min_height:
                            self.logger.debug(
                                f"Skipping small image: {width}x{height} "
                                f"(page {page_num + 1}, index {img_index})"
                            )
                            continue

                        # 이미지 저장
                        saved_path = self._save_image(
                            image_bytes=image_bytes,
                            ext=image_ext,
                            apartment_name=apartment_name,
                            page_num=page_num + 1,
                            img_index=img_index
                        )

                        # 추출 정보 기록
                        extracted_img = ExtractedImage(
                            page_number=page_num + 1,
                            image_index=img_index,
                            width=width,
                            height=height,
                            format=image_ext,
                            local_path=saved_path
                        )
                        extracted_images.append(extracted_img)

                        self.logger.info(
                            f"Extracted: {saved_path} ({width}x{height}, {image_ext})"
                        )

                    except Exception as e:
                        self.logger.error(
                            f"Failed to extract image on page {page_num + 1}, "
                            f"index {img_index}: {e}"
                        )
                        continue

            doc.close()

            result = ExtractionResult(
                pdf_path=str(pdf_file.absolute()),
                apartment_name=apartment_name,
                total_pages=total_pages,
                images=extracted_images
            )

            self.logger.info(
                f"Extraction complete: {len(extracted_images)} images from {total_pages} pages"
            )

            return result

        except Exception as e:
            self.logger.error(f"Failed to process PDF {pdf_path}: {e}")
            raise

    def _save_image(
        self,
        image_bytes: bytes,
        ext: str,
        apartment_name: str,
        page_num: int,
        img_index: int
    ) -> str:
        """
        이미지를 로컬에 저장

        Args:
            image_bytes: 이미지 바이트 데이터
            ext: 이미지 확장자 (jpeg, png 등)
            apartment_name: 단지명
            page_num: 페이지 번호 (1부터 시작)
            img_index: 페이지 내 이미지 인덱스

        Returns:
            str: 저장된 파일의 절대 경로

        Raises:
            Exception: 이미지 저장 실패
        """
        try:
            # 파일명 생성: 단지명_페이지_순번.확장자
            # 파일명에 사용할 수 없는 문자 제거
            safe_name = "".join(
                c if c.isalnum() or c in (' ', '-', '_') else '_'
                for c in apartment_name
            )
            filename = f"{safe_name}_p{page_num:03d}_{img_index:02d}.{ext}"
            output_path = self.output_dir / filename

            # PIL로 이미지 열어서 품질 보존하며 저장
            image = Image.open(io.BytesIO(image_bytes))

            # DPI 설정 (300dpi 유지)
            dpi = (300, 300)

            # 포맷별 저장 옵션
            save_kwargs = {}
            if ext.lower() in ['jpg', 'jpeg']:
                save_kwargs = {
                    'quality': 95,  # 고품질 JPEG
                    'dpi': dpi,
                    'optimize': True
                }
            elif ext.lower() == 'png':
                save_kwargs = {
                    'dpi': dpi,
                    'compress_level': 6  # 적당한 압축 (0~9, 낮을수록 빠름)
                }
            else:
                save_kwargs = {'dpi': dpi}

            image.save(output_path, **save_kwargs)

            return str(output_path.absolute())

        except Exception as e:
            self.logger.error(f"Failed to save image {filename}: {e}")
            raise

    def extract_from_multiple(
        self,
        pdf_paths: list[str],
        apartment_name: str
    ) -> list[ExtractionResult]:
        """
        여러 PDF 파일에서 이미지 추출

        Args:
            pdf_paths: PDF 파일 경로 리스트
            apartment_name: 단지명 (파일명 생성용)

        Returns:
            list[ExtractionResult]: 각 PDF별 추출 결과 리스트
        """
        results = []

        for pdf_path in pdf_paths:
            try:
                result = self.extract_images(pdf_path, apartment_name)
                results.append(result)
            except Exception as e:
                self.logger.error(f"Failed to process {pdf_path}: {e}")
                # 실패한 PDF는 건너뛰고 계속 진행
                continue

        self.logger.info(
            f"Batch extraction complete: {len(results)}/{len(pdf_paths)} PDFs processed"
        )

        return results
