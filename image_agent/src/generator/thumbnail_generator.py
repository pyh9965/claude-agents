"""Bannerbear 기반 썸네일 생성기"""

from dataclasses import dataclass
from typing import Optional
from pathlib import Path
import httpx
from PIL import Image, ImageDraw, ImageFont, ImageFilter
import logging
from io import BytesIO
import hashlib


@dataclass
class ThumbnailData:
    apartment_name: str
    price: str  # "분양가 3.5억원~"
    background_image: Optional[str] = None  # 배경 이미지 경로
    subtitle: Optional[str] = None  # "2024년 입주 예정"


@dataclass
class ThumbnailResult:
    data: ThumbnailData
    output_path: str
    width: int
    height: int


class ThumbnailGenerator:
    """Bannerbear를 사용한 썸네일 생성기"""

    def __init__(self, api_key: Optional[str] = None, output_dir: str = "output/thumbnails"):
        """
        Args:
            api_key: Bannerbear API 키 (없으면 로컬 생성)
            output_dir: 썸네일 저장 디렉토리
        """
        self.api_key = api_key
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)
        self.logger = logging.getLogger(__name__)

    def generate(self, data: ThumbnailData, template_id: Optional[str] = None) -> ThumbnailResult:
        """
        썸네일 생성

        Args:
            data: 썸네일 데이터
            template_id: Bannerbear 템플릿 ID

        Returns:
            생성된 썸네일 결과
        """
        if self.api_key and template_id:
            return self._generate_with_bannerbear(data, template_id)
        else:
            return self._generate_local(data)

    def _generate_with_bannerbear(self, data: ThumbnailData, template_id: str) -> ThumbnailResult:
        """
        Bannerbear API로 썸네일 생성

        Args:
            data: 썸네일 데이터
            template_id: Bannerbear 템플릿 ID

        Returns:
            생성된 썸네일 결과
        """
        try:
            # Bannerbear Sync API 호출
            url = "https://sync.api.bannerbear.com/v2/images"
            headers = {
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json",
            }

            # API 요청 페이로드 구성
            modifications = [
                {
                    "name": "apartment_name",
                    "text": data.apartment_name,
                },
                {
                    "name": "price",
                    "text": data.price,
                },
            ]

            if data.subtitle:
                modifications.append({
                    "name": "subtitle",
                    "text": data.subtitle,
                })

            if data.background_image:
                modifications.append({
                    "name": "background",
                    "image_url": data.background_image,
                })

            payload = {
                "template": template_id,
                "modifications": modifications,
            }

            with httpx.Client(timeout=30.0) as client:
                response = client.post(url, headers=headers, json=payload)
                response.raise_for_status()
                result = response.json()

            # 생성된 이미지 다운로드
            image_url = result.get("image_url")
            if not image_url:
                raise ValueError("No image_url in Bannerbear response")

            # 파일명 생성
            filename = self._generate_filename(data)
            output_path = self.output_dir / filename

            # 이미지 다운로드 및 저장
            with httpx.Client() as client:
                img_response = client.get(image_url)
                img_response.raise_for_status()
                output_path.write_bytes(img_response.content)

            self.logger.info(f"Bannerbear thumbnail generated: {output_path}")

            return ThumbnailResult(
                data=data,
                output_path=str(output_path),
                width=1280,
                height=720,
            )

        except Exception as e:
            self.logger.error(f"Bannerbear API error: {e}")
            self.logger.info("Falling back to local generation")
            return self._generate_local(data)

    def _generate_local(self, data: ThumbnailData) -> ThumbnailResult:
        """
        Pillow로 로컬에서 썸네일 생성

        Args:
            data: 썸네일 데이터

        Returns:
            생성된 썸네일 결과
        """
        width, height = 1280, 720

        # 배경 이미지 처리
        if data.background_image and Path(data.background_image).exists():
            img = self._load_and_resize_background(data.background_image, width, height)
            # 어두운 오버레이 추가 (텍스트 가독성 향상)
            overlay = Image.new('RGBA', (width, height), (0, 0, 0, 100))
            img = Image.alpha_composite(img.convert('RGBA'), overlay)
        else:
            # 그라데이션 배경 생성
            img = self._create_gradient_background(width, height)

        img = img.convert('RGB')
        draw = ImageDraw.Draw(img)

        # 폰트 로드
        try:
            # Windows 나눔고딕 폰트 시도
            font_large = ImageFont.truetype("C:\\Windows\\Fonts\\malgun.ttf", 80)
            font_medium = ImageFont.truetype("C:\\Windows\\Fonts\\malgun.ttf", 50)
            font_small = ImageFont.truetype("C:\\Windows\\Fonts\\malgun.ttf", 35)
        except Exception:
            try:
                # 대체 폰트
                font_large = ImageFont.truetype("arial.ttf", 80)
                font_medium = ImageFont.truetype("arial.ttf", 50)
                font_small = ImageFont.truetype("arial.ttf", 35)
            except Exception:
                # 기본 폰트
                self.logger.warning("Using default font")
                font_large = ImageFont.load_default()
                font_medium = ImageFont.load_default()
                font_small = ImageFont.load_default()

        # 텍스트 위치 계산
        y_offset = height // 2 - 100

        # 단지명 (큰 글씨, 그림자 효과)
        self._draw_text_with_shadow(
            draw, data.apartment_name, (width // 2, y_offset),
            font_large, fill=(255, 255, 255), shadow_color=(0, 0, 0)
        )

        # 분양가 (중간 글씨)
        y_offset += 100
        self._draw_text_with_shadow(
            draw, data.price, (width // 2, y_offset),
            font_medium, fill=(255, 215, 0), shadow_color=(0, 0, 0)
        )

        # 부제목 (작은 글씨)
        if data.subtitle:
            y_offset += 70
            self._draw_text_with_shadow(
                draw, data.subtitle, (width // 2, y_offset),
                font_small, fill=(200, 200, 200), shadow_color=(0, 0, 0)
            )

        # 파일 저장
        filename = self._generate_filename(data)
        output_path = self.output_dir / filename
        img.save(output_path, quality=95)

        self.logger.info(f"Local thumbnail generated: {output_path}")

        return ThumbnailResult(
            data=data,
            output_path=str(output_path),
            width=width,
            height=height,
        )

    def _load_and_resize_background(self, image_path: str, width: int, height: int) -> Image.Image:
        """배경 이미지 로드 및 리사이즈"""
        img = Image.open(image_path)

        # 비율 유지하며 크롭
        img_ratio = img.width / img.height
        target_ratio = width / height

        if img_ratio > target_ratio:
            # 이미지가 더 넓음 - 높이 맞추고 좌우 크롭
            new_height = height
            new_width = int(height * img_ratio)
            img = img.resize((new_width, new_height), Image.LANCZOS)
            left = (new_width - width) // 2
            img = img.crop((left, 0, left + width, height))
        else:
            # 이미지가 더 높음 - 너비 맞추고 상하 크롭
            new_width = width
            new_height = int(width / img_ratio)
            img = img.resize((new_width, new_height), Image.LANCZOS)
            top = (new_height - height) // 2
            img = img.crop((0, top, width, top + height))

        return img

    def _create_gradient_background(self, width: int, height: int) -> Image.Image:
        """그라데이션 배경 생성"""
        base = Image.new('RGB', (width, height), (30, 30, 50))

        # 수직 그라데이션
        for y in range(height):
            r = int(30 + (60 - 30) * (y / height))
            g = int(30 + (90 - 30) * (y / height))
            b = int(50 + (130 - 50) * (y / height))
            for x in range(width):
                base.putpixel((x, y), (r, g, b))

        return base

    def _draw_text_with_shadow(
        self,
        draw: ImageDraw.ImageDraw,
        text: str,
        position: tuple[int, int],
        font: ImageFont.FreeTypeFont,
        fill: tuple[int, int, int],
        shadow_color: tuple[int, int, int],
        shadow_offset: int = 3
    ):
        """텍스트에 그림자 효과 추가"""
        x, y = position

        # 텍스트 크기 계산 (중앙 정렬)
        bbox = draw.textbbox((0, 0), text, font=font)
        text_width = bbox[2] - bbox[0]
        text_height = bbox[3] - bbox[1]

        x = x - text_width // 2
        y = y - text_height // 2

        # 그림자
        draw.text((x + shadow_offset, y + shadow_offset), text, font=font, fill=shadow_color)

        # 실제 텍스트
        draw.text((x, y), text, font=font, fill=fill)

    def _generate_filename(self, data: ThumbnailData) -> str:
        """파일명 생성 (해시 기반 중복 방지)"""
        # 데이터 해시 생성
        content = f"{data.apartment_name}_{data.price}_{data.subtitle or ''}"
        hash_val = hashlib.md5(content.encode()).hexdigest()[:8]

        # 안전한 파일명
        safe_name = "".join(c for c in data.apartment_name if c.isalnum() or c in (' ', '_'))
        safe_name = safe_name.replace(' ', '_')[:30]

        return f"{safe_name}_{hash_val}.jpg"

    def generate_batch(self, data_list: list[ThumbnailData], template_id: Optional[str] = None) -> list[ThumbnailResult]:
        """
        여러 썸네일 배치 생성

        Args:
            data_list: 썸네일 데이터 리스트
            template_id: Bannerbear 템플릿 ID (선택사항)

        Returns:
            생성된 썸네일 결과 리스트
        """
        results = []
        for data in data_list:
            try:
                result = self.generate(data, template_id)
                results.append(result)
            except Exception as e:
                self.logger.error(f"Failed to generate thumbnail for {data.apartment_name}: {e}")
                continue

        self.logger.info(f"Batch generation completed: {len(results)}/{len(data_list)} successful")
        return results
