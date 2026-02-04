"""Relevance Validator - Vision AI 기반 이미지 관련성 검증"""

import os
import base64
from pathlib import Path
from dataclasses import dataclass
from typing import List, Optional
import logging

from google import genai
from google.genai import types

logger = logging.getLogger(__name__)


@dataclass
class RelevanceReport:
    """이미지 관련성 검증 결과"""
    relevant: bool
    confidence: float  # 0.0 ~ 1.0
    explanation: str
    detected_content: str  # AI가 감지한 이미지 내용
    keywords_matched: List[str]
    keywords_missing: List[str]


class RelevanceValidator:
    """Vision AI를 사용한 이미지-키워드 관련성 검증기"""

    SUPPORTED_FORMATS = {'.jpg', '.jpeg', '.png', '.webp', '.gif', '.bmp'}

    def __init__(
        self,
        api_key: Optional[str] = None,
        model: str = "gemini-2.0-flash",
        confidence_threshold: float = 0.7
    ):
        """
        RelevanceValidator 초기화

        Args:
            api_key: Google API 키 (없으면 환경변수에서 로드)
            model: 사용할 Gemini 모델
            confidence_threshold: 관련성 판단 임계값 (0.0~1.0)
        """
        self.api_key = api_key or os.getenv("GOOGLE_API_KEY") or os.getenv("GEMINI_API_KEY")
        if not self.api_key:
            raise ValueError("GOOGLE_API_KEY 또는 GEMINI_API_KEY 환경변수 필요")

        self.model = model
        self.confidence_threshold = confidence_threshold
        self.client = genai.Client(api_key=self.api_key)

        logger.info(f"RelevanceValidator initialized with model: {model}")

    def _load_image_as_base64(self, image_path: str) -> Optional[str]:
        """이미지를 base64로 인코딩"""
        try:
            path = Path(image_path)
            if not path.exists():
                logger.error(f"이미지 파일 없음: {image_path}")
                return None

            if path.suffix.lower() not in self.SUPPORTED_FORMATS:
                logger.error(f"지원하지 않는 형식: {path.suffix}")
                return None

            with open(path, 'rb') as f:
                return base64.b64encode(f.read()).decode('utf-8')

        except Exception as e:
            logger.error(f"이미지 로드 실패: {e}")
            return None

    def _get_mime_type(self, image_path: str) -> str:
        """파일 확장자로 MIME 타입 결정"""
        ext = Path(image_path).suffix.lower()
        mime_map = {
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.png': 'image/png',
            '.webp': 'image/webp',
            '.gif': 'image/gif',
            '.bmp': 'image/bmp'
        }
        return mime_map.get(ext, 'image/jpeg')

    def validate(
        self,
        image_path: str,
        keywords: List[str],
        context: Optional[str] = None
    ) -> RelevanceReport:
        """
        이미지가 키워드와 관련있는지 Vision AI로 검증

        Args:
            image_path: 검증할 이미지 경로
            keywords: 기대하는 키워드 리스트 (예: ["드파인 연희", "아파트", "외관"])
            context: 추가 컨텍스트 (예: "서울 연희동에 위치한 신축 아파트")

        Returns:
            RelevanceReport
        """
        # 이미지 로드
        image_data = self._load_image_as_base64(image_path)
        if not image_data:
            return RelevanceReport(
                relevant=False,
                confidence=0.0,
                explanation="이미지를 로드할 수 없습니다",
                detected_content="",
                keywords_matched=[],
                keywords_missing=keywords
            )

        # 프롬프트 구성
        keywords_str = ", ".join(keywords)
        context_str = f"\n추가 정보: {context}" if context else ""

        prompt = f"""이 이미지를 분석하고 다음 키워드와의 관련성을 평가해주세요.

기대 키워드: {keywords_str}{context_str}

다음 형식으로 정확히 답변해주세요:

1. 이미지 내용: (이 이미지에 무엇이 보이는지 간단히 설명)
2. 관련성: (HIGH/MEDIUM/LOW/NONE 중 하나)
3. 신뢰도: (0.0~1.0 사이 숫자)
4. 매칭된 키워드: (키워드 중 이미지에서 확인되는 것들, 쉼표로 구분)
5. 누락된 키워드: (키워드 중 이미지에서 확인되지 않는 것들, 쉼표로 구분)
6. 설명: (판단 근거를 한 문장으로)

예시:
1. 이미지 내용: 현대적인 고층 아파트 건물 외관
2. 관련성: HIGH
3. 신뢰도: 0.85
4. 매칭된 키워드: 아파트, 외관
5. 누락된 키워드: 드파인 연희
6. 설명: 아파트 외관 사진이지만 특정 아파트명을 확인할 수 없습니다."""

        try:
            # Gemini Vision API 호출
            mime_type = self._get_mime_type(image_path)

            response = self.client.models.generate_content(
                model=self.model,
                contents=[
                    types.Content(
                        parts=[
                            types.Part(
                                inline_data=types.Blob(
                                    mime_type=mime_type,
                                    data=base64.b64decode(image_data)
                                )
                            ),
                            types.Part(text=prompt)
                        ]
                    )
                ],
                config=types.GenerateContentConfig(
                    temperature=0.3,
                    max_output_tokens=1000,
                )
            )

            # 응답 파싱
            return self._parse_response(response.text, keywords)

        except Exception as e:
            logger.error(f"Vision API 호출 실패: {e}")
            return RelevanceReport(
                relevant=False,
                confidence=0.0,
                explanation=f"API 오류: {str(e)}",
                detected_content="",
                keywords_matched=[],
                keywords_missing=keywords
            )

    def _parse_response(self, response_text: str, original_keywords: List[str]) -> RelevanceReport:
        """AI 응답 파싱"""
        try:
            lines = response_text.strip().split('\n')

            detected_content = ""
            relevance = "NONE"
            confidence = 0.0
            matched = []
            missing = []
            explanation = ""

            for line in lines:
                line = line.strip()
                if line.startswith("1. 이미지 내용:"):
                    detected_content = line.split(":", 1)[1].strip()
                elif line.startswith("2. 관련성:"):
                    relevance = line.split(":", 1)[1].strip().upper()
                elif line.startswith("3. 신뢰도:"):
                    try:
                        confidence = float(line.split(":", 1)[1].strip())
                    except ValueError:
                        confidence = 0.5
                elif line.startswith("4. 매칭된 키워드:"):
                    matched_str = line.split(":", 1)[1].strip()
                    if matched_str and matched_str.lower() != "없음":
                        matched = [k.strip() for k in matched_str.split(",") if k.strip()]
                elif line.startswith("5. 누락된 키워드:"):
                    missing_str = line.split(":", 1)[1].strip()
                    if missing_str and missing_str.lower() != "없음":
                        missing = [k.strip() for k in missing_str.split(",") if k.strip()]
                elif line.startswith("6. 설명:"):
                    explanation = line.split(":", 1)[1].strip()

            # 관련성 판단
            is_relevant = (
                relevance in ["HIGH", "MEDIUM"] and
                confidence >= self.confidence_threshold
            )

            return RelevanceReport(
                relevant=is_relevant,
                confidence=confidence,
                explanation=explanation,
                detected_content=detected_content,
                keywords_matched=matched,
                keywords_missing=missing if missing else [k for k in original_keywords if k not in matched]
            )

        except Exception as e:
            logger.error(f"응답 파싱 실패: {e}")
            return RelevanceReport(
                relevant=False,
                confidence=0.0,
                explanation=f"파싱 오류: {str(e)}",
                detected_content=response_text[:100],
                keywords_matched=[],
                keywords_missing=original_keywords
            )

    def validate_batch(
        self,
        images: List[dict],
        keywords: List[str],
        context: Optional[str] = None
    ) -> List[dict]:
        """
        여러 이미지를 배치로 검증

        Args:
            images: [{"path": "...", "url": "...", ...}, ...] 형식
            keywords: 기대 키워드
            context: 추가 컨텍스트

        Returns:
            [{"image": {...}, "report": RelevanceReport, "valid": bool}, ...]
        """
        results = []

        for img in images:
            path = img.get("path") or img.get("local_path")
            if not path:
                results.append({
                    "image": img,
                    "report": None,
                    "valid": False,
                    "error": "이미지 경로 없음"
                })
                continue

            report = self.validate(path, keywords, context)
            results.append({
                "image": img,
                "report": report,
                "valid": report.relevant
            })

            logger.info(
                f"검증: {Path(path).name} -> "
                f"{'✓ 관련' if report.relevant else '✗ 무관'} "
                f"(신뢰도: {report.confidence:.2f})"
            )

        return results

    def filter_relevant_images(
        self,
        images: List[dict],
        keywords: List[str],
        context: Optional[str] = None
    ) -> List[dict]:
        """
        관련성 있는 이미지만 필터링

        Args:
            images: 이미지 정보 리스트
            keywords: 기대 키워드
            context: 추가 컨텍스트

        Returns:
            관련성 있는 이미지만 포함된 리스트
        """
        results = self.validate_batch(images, keywords, context)
        return [r["image"] for r in results if r["valid"]]
