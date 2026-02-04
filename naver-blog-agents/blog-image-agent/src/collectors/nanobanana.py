import os
import base64
from pathlib import Path
from typing import Optional, Literal
from dataclasses import dataclass
from google import genai
from google.genai import types
from .base import BaseCollector, CollectorResult

ImageStyleType = Literal["thumbnail", "banner", "food_photo", "infographic"]

@dataclass
class GeneratedImage:
    data: bytes
    mime_type: str
    prompt: str

class NanobananGenerator(BaseCollector):
    """나노바나나 3.0 Pro (Imagen 3) AI 이미지 생성기"""

    # 이미지 유형별 프롬프트 템플릿
    PROMPT_TEMPLATES = {
        "thumbnail": """Professional blog thumbnail for {topic},
clean composition with space for text overlay on the left or right side,
{style} aesthetic, high quality photography, vibrant colors,
16:9 aspect ratio, modern and appealing design,
eye-catching and engaging visual""",

        "banner": """Minimal wide banner image for {topic},
subtle gradient background, modern minimalist design,
3:1 aspect ratio, clean and professional look,
soft colors, space for text overlay,
sophisticated and elegant composition""",

        "food_photo": """Appetizing {topic}, professional food photography,
warm natural lighting from the side, shallow depth of field,
Korean restaurant setting with traditional elements,
steam rising from hot food showing freshness,
4:3 aspect ratio, mouth-watering presentation,
high-end culinary magazine style photography""",

        "infographic": """Clean infographic card design about {topic},
modern flat design style, minimal geometric icons,
{brand_color} as accent color with white background,
Korean text friendly layout with clean typography,
1:1 square aspect ratio, data visualization,
professional business presentation aesthetic"""
    }

    # 스타일별 기본 설정
    STYLE_PRESETS = {
        "food": "warm, appetizing, professional culinary",
        "travel": "vivid, cinematic, breathtaking landscapes",
        "lifestyle": "natural, candid, modern lifestyle",
        "tech": "sleek, futuristic, clean technology",
        "default": "professional, high quality, appealing"
    }

    def __init__(self, api_key: Optional[str] = None, max_retries: int = 3):
        """초기화

        Args:
            api_key: Google API Key (없으면 환경변수 사용)
            max_retries: 실패 시 재시도 횟수
        """
        self.api_key = api_key or os.getenv("GOOGLE_API_KEY")
        if not self.api_key:
            raise ValueError("GOOGLE_API_KEY 환경변수 필요")

        self.client = genai.Client(api_key=self.api_key)
        self.model = "imagen-3.0-generate-002"  # 나노바나나 3.0 Pro
        self.max_retries = max_retries

    def _build_prompt(
        self,
        topic: str,
        image_type: ImageStyleType = "thumbnail",
        style: str = "default",
        brand_color: str = "blue"
    ) -> str:
        """이미지 생성 프롬프트 구축

        Args:
            topic: 주제/내용
            image_type: 이미지 유형
            style: 스타일 프리셋 (food, travel, lifestyle, tech, default)
            brand_color: 브랜드 색상 (인포그래픽용)

        Returns:
            완성된 프롬프트
        """
        template = self.PROMPT_TEMPLATES.get(image_type, self.PROMPT_TEMPLATES["thumbnail"])
        style_desc = self.STYLE_PRESETS.get(style, self.STYLE_PRESETS["default"])

        return template.format(
            topic=topic,
            style=style_desc,
            brand_color=brand_color
        )

    async def generate_image(
        self,
        prompt: str,
        image_type: ImageStyleType = "thumbnail",
        style: str = "default",
        brand_color: str = "blue",
        negative_prompt: Optional[str] = None
    ) -> Optional[GeneratedImage]:
        """AI 이미지 생성 (재시도 로직 포함)

        Args:
            prompt: 생성할 이미지 설명 (주제)
            image_type: 이미지 유형
            style: 스타일 프리셋
            brand_color: 브랜드 색상
            negative_prompt: 제외할 요소

        Returns:
            GeneratedImage 또는 None
        """
        full_prompt = self._build_prompt(prompt, image_type, style, brand_color)

        if negative_prompt:
            full_prompt += f"\n\nNegative prompt: {negative_prompt}"

        # 재시도 로직
        last_error = None
        for attempt in range(self.max_retries):
            try:
                # Imagen 3.0 API 호출
                response = self.client.models.generate_images(
                    model=self.model,
                    prompt=full_prompt,
                    config=types.GenerateImagesConfig(
                        number_of_images=1,
                        aspect_ratio=self._get_aspect_ratio(image_type),
                        safety_filter_level="BLOCK_MEDIUM_AND_ABOVE"
                    )
                )

                if response.generated_images:
                    image = response.generated_images[0]
                    return GeneratedImage(
                        data=image.image.image_bytes,
                        mime_type="image/png",
                        prompt=full_prompt
                    )

                last_error = "No images generated"

            except Exception as e:
                last_error = str(e)
                print(f"[Nanobanana] 이미지 생성 실패 (시도 {attempt + 1}/{self.max_retries}): {e}")

                # 마지막 시도가 아니면 계속
                if attempt < self.max_retries - 1:
                    continue

        print(f"[Nanobanana] 모든 재시도 실패: {last_error}")
        return None

    def _get_aspect_ratio(self, image_type: ImageStyleType) -> str:
        """이미지 유형별 종횡비 반환"""
        ratios = {
            "thumbnail": "16:9",
            "banner": "16:9",  # 3:1은 지원 안 될 수 있음, 16:9로 대체
            "food_photo": "4:3",
            "infographic": "1:1"
        }
        return ratios.get(image_type, "16:9")

    async def collect(
        self,
        keywords: list[str],
        max_images: int = 1,
        image_type: ImageStyleType = "thumbnail",
        style: str = "default",
        brand_color: str = "blue"
    ) -> CollectorResult:
        """AI 이미지 생성 (수집 인터페이스)

        Args:
            keywords: 키워드 (첫 번째가 주제)
            max_images: 생성할 이미지 수
            image_type: 이미지 유형
            style: 스타일 프리셋
            brand_color: 브랜드 색상

        Returns:
            CollectorResult
        """
        if not keywords:
            return CollectorResult(success=False, images=[], error="키워드 없음")

        topic = " ".join(keywords)
        images = []

        for i in range(max_images):
            generated = await self.generate_image(
                topic,
                image_type,
                style,
                brand_color
            )

            if generated:
                # Base64 인코딩 (메타데이터용)
                b64_data = base64.b64encode(generated.data).decode()

                images.append({
                    "url": f"data:{generated.mime_type};base64,{b64_data[:50]}...",  # 미리보기용
                    "data": generated.data,
                    "width": 1024,  # Imagen 3.0 기본 해상도
                    "height": self._get_height_for_type(image_type),
                    "attribution": "AI Generated by Nanobanana 3.0 Pro (Imagen 3)",
                    "source": "nanobanana",
                    "prompt": generated.prompt,
                    "image_type": image_type,
                    "style": style
                })

        if not images:
            return CollectorResult(
                success=False,
                images=[],
                error="AI 이미지 생성 실패 (모든 재시도 소진)"
            )

        return CollectorResult(success=True, images=images)

    def _get_height_for_type(self, image_type: ImageStyleType) -> int:
        """이미지 유형별 높이 계산 (1024 기준)"""
        heights = {
            "thumbnail": 576,   # 16:9 -> 1024x576
            "banner": 576,      # 16:9
            "food_photo": 768,  # 4:3 -> 1024x768
            "infographic": 1024  # 1:1 -> 1024x1024
        }
        return heights.get(image_type, 576)

    async def download(self, url: str, output_path: str) -> bool:
        """AI 생성 이미지 다운로드 (실제로는 save_image 사용)

        Note:
            AI 생성 이미지는 바로 바이트 데이터로 받으므로
            이 메서드는 호환성을 위해 제공됨.
            실제 저장은 save_image() 사용 권장.
        """
        # AI 생성 이미지는 바로 저장
        return True  # generate_image에서 직접 바이트 반환

    def save_image(self, image_data: bytes, output_path: str) -> bool:
        """이미지 데이터를 파일로 저장

        Args:
            image_data: 이미지 바이트 데이터
            output_path: 저장 경로

        Returns:
            성공 여부
        """
        try:
            path = Path(output_path)
            path.parent.mkdir(parents=True, exist_ok=True)

            with open(path, "wb") as f:
                f.write(image_data)

            print(f"[Nanobanana] 이미지 저장 완료: {output_path}")
            return True
        except Exception as e:
            print(f"[Nanobanana] 이미지 저장 실패: {e}")
            return False

    def load_prompt_template(self, template_path: str) -> str:
        """외부 프롬프트 템플릿 파일 로드

        Args:
            template_path: 템플릿 파일 경로

        Returns:
            템플릿 문자열
        """
        try:
            with open(template_path, "r", encoding="utf-8") as f:
                return f.read().strip()
        except Exception as e:
            print(f"[Nanobanana] 템플릿 로드 실패: {e}")
            return ""

    async def close(self):
        """리소스 정리"""
        pass  # genai.Client는 별도 종료 불필요
