"""Google Gemini Vision 기반 이미지 분류기"""

from dataclasses import dataclass, asdict
from typing import Optional, Literal
from pathlib import Path
import json
import logging
from google import genai
from google.genai import types
from dotenv import load_dotenv
import os

# 환경변수 로드
load_dotenv()

# 타입 정의
ImageType = Literal["floor_plan", "site_plan", "aerial_view", "location_map", "other"]

logger = logging.getLogger(__name__)


@dataclass
class ClassificationResult:
    """이미지 분류 결과"""
    image_path: str
    image_type: ImageType
    floor_plan_type: Optional[str]  # 59A, 84D 등 (평면도인 경우만)
    confidence: float
    description: str

    def to_dict(self):
        """딕셔너리로 변환"""
        return asdict(self)


class VisionClassifier:
    """Google Gemini Vision을 사용한 이미지 분류기"""

    # Gemini Vision 프롬프트
    CLASSIFICATION_PROMPT = """이 이미지를 분석하여 다음 정보를 JSON으로 반환해주세요:

1. image_type: 다음 중 하나를 선택
   - floor_plan: 평면도 (아파트 내부 구조도)
   - site_plan: 배치도 (건물 배치도)
   - aerial_view: 조감도 (건물 외관 조감도)
   - location_map: 위치도 (지도, 위치 안내도)
   - other: 기타

2. floor_plan_type: 평면도인 경우 타입 식별 (예: 59A, 84D, 101B 등), 아니면 null
   - 평면도 이미지에서 타입 정보를 찾을 수 있으면 추출
   - 타입 정보가 없거나 평면도가 아니면 null

3. confidence: 0.0 ~ 1.0 사이의 분류 신뢰도
   - 1.0에 가까울수록 확신이 높음

4. description: 이미지에 대한 간단한 한글 설명 (1-2문장)

응답은 반드시 다음 JSON 형식으로만 작성하세요 (다른 텍스트 없이):
{
    "image_type": "floor_plan",
    "floor_plan_type": "59A",
    "confidence": 0.95,
    "description": "59A 타입 평면도로 방 3개와 거실이 있는 구조입니다."
}"""

    def __init__(self, api_key: Optional[str] = None, model: str = "gemini-2.0-flash"):
        """
        Args:
            api_key: Google Gemini API 키 (None이면 환경변수 GOOGLE_API_KEY 사용)
            model: 사용할 모델 (기본: gemini-2.0-flash)
        """
        try:
            # API 키 설정
            self.api_key = api_key or os.getenv("GOOGLE_API_KEY")
            if not self.api_key:
                raise ValueError("GOOGLE_API_KEY 환경변수가 설정되지 않았습니다.")

            # 새로운 google.genai 클라이언트 사용
            self.client = genai.Client(api_key=self.api_key)
            self.model_name = model
            self.logger = logging.getLogger(__name__)
            self.logger.info(f"VisionClassifier initialized with model: {model}")
        except Exception as e:
            logger.error(f"Failed to initialize Gemini client: {e}")
            raise

    def _load_image(self, image_path: str) -> types.Part:
        """
        이미지를 Gemini 형식으로 로드

        Args:
            image_path: 이미지 파일 경로

        Returns:
            Gemini Part 객체
        """
        path = Path(image_path)
        if not path.exists():
            raise FileNotFoundError(f"Image file not found: {image_path}")

        try:
            # 이미지 파일 읽기
            with open(path, "rb") as image_file:
                image_data = image_file.read()

            # MIME 타입 결정
            suffix = path.suffix.lower()
            mime_types = {
                '.jpg': 'image/jpeg',
                '.jpeg': 'image/jpeg',
                '.png': 'image/png',
                '.webp': 'image/webp',
                '.gif': 'image/gif'
            }
            mime_type = mime_types.get(suffix, 'image/jpeg')

            self.logger.debug(f"Successfully loaded image: {image_path}")
            return types.Part.from_bytes(data=image_data, mime_type=mime_type)
        except Exception as e:
            self.logger.error(f"Failed to load image {image_path}: {e}")
            raise

    def classify_image(self, image_path: str) -> ClassificationResult:
        """
        단일 이미지 분류

        Args:
            image_path: 분류할 이미지 파일 경로

        Returns:
            ClassificationResult: 분류 결과
        """
        self.logger.info(f"Classifying image: {image_path}")

        try:
            # 이미지 로드
            image_part = self._load_image(image_path)

            # Gemini API 호출
            response = self.client.models.generate_content(
                model=self.model_name,
                contents=[self.CLASSIFICATION_PROMPT, image_part]
            )

            # 응답 파싱
            content = response.text.strip()
            self.logger.debug(f"API response: {content}")

            # JSON 추출 (마크다운 코드 블록 제거)
            if "```json" in content:
                content = content.split("```json")[1].split("```")[0].strip()
            elif "```" in content:
                content = content.split("```")[1].split("```")[0].strip()

            # JSON 파싱
            result_data = json.loads(content)

            # ClassificationResult 생성
            result = ClassificationResult(
                image_path=image_path,
                image_type=result_data["image_type"],
                floor_plan_type=result_data.get("floor_plan_type"),
                confidence=result_data["confidence"],
                description=result_data["description"]
            )

            self.logger.info(
                f"Classification complete: {image_path} -> "
                f"{result.image_type} (confidence: {result.confidence:.2f})"
            )
            return result

        except FileNotFoundError:
            raise
        except json.JSONDecodeError as e:
            self.logger.error(f"Failed to parse JSON response: {e}")
            self.logger.error(f"Raw content: {content}")
            raise Exception(f"Failed to parse API response as JSON: {e}")
        except KeyError as e:
            self.logger.error(f"Missing required field in response: {e}")
            raise Exception(f"Invalid response format: missing field {e}")
        except Exception as e:
            self.logger.error(f"Classification failed for {image_path}: {e}")
            raise

    def classify_batch(self, image_paths: list[str]) -> list[ClassificationResult]:
        """
        여러 이미지를 배치로 분류

        Args:
            image_paths: 분류할 이미지 파일 경로 리스트

        Returns:
            list[ClassificationResult]: 분류 결과 리스트
        """
        self.logger.info(f"Starting batch classification for {len(image_paths)} images")
        results = []

        for i, image_path in enumerate(image_paths, 1):
            try:
                self.logger.info(f"Processing {i}/{len(image_paths)}: {image_path}")
                result = self.classify_image(image_path)
                results.append(result)
            except Exception as e:
                self.logger.error(f"Failed to classify {image_path}: {e}")
                # 실패한 경우에도 계속 진행

        self.logger.info(f"Batch classification complete: {len(results)}/{len(image_paths)} succeeded")
        return results

    def save_results(self, results: list[ClassificationResult], output_path: str):
        """
        분류 결과를 JSON으로 저장

        Args:
            results: 저장할 분류 결과 리스트
            output_path: 저장할 JSON 파일 경로
        """
        try:
            output_file = Path(output_path)
            output_file.parent.mkdir(parents=True, exist_ok=True)

            # ClassificationResult를 딕셔너리로 변환
            results_dict = [result.to_dict() for result in results]

            # JSON으로 저장
            with open(output_file, "w", encoding="utf-8") as f:
                json.dump(results_dict, f, ensure_ascii=False, indent=2)

            self.logger.info(f"Results saved to: {output_path}")
        except Exception as e:
            self.logger.error(f"Failed to save results to {output_path}: {e}")
            raise
