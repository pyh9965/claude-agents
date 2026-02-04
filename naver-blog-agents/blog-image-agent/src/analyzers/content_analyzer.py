"""Content Analyzer - AI 기반 콘텐츠 분석 및 이미지 요구사항 생성"""

from typing import List, Optional, Literal
from pathlib import Path
import json
import logging
import os
from google import genai
from google.genai import types

from ..models import ImageRequirement, ImageType, PreferredSource
from .entity_extractor import EntityExtractor


logger = logging.getLogger(__name__)


class ContentAnalyzer:
    """AI 모델을 사용하여 블로그 콘텐츠를 분석하고 이미지 요구사항 생성"""

    # 지원하는 AI 모델
    SUPPORTED_MODELS = {
        'gemini-2.0-flash': 'google',
        'gemini-2.0-pro': 'google',
        'gemini-2.0-flash-exp': 'google',
        'claude-3-5-sonnet-latest': 'anthropic',  # 향후 지원
    }

    def __init__(
        self,
        api_key: Optional[str] = None,
        model: str = "gemini-2.0-flash",
        prompt_path: Optional[str] = None
    ):
        """
        ContentAnalyzer 초기화

        Args:
            api_key: API 키 (None이면 환경변수에서 로드)
            model: 사용할 AI 모델 (gemini-2.0-flash, gemini-2.0-pro, claude)
            prompt_path: 커스텀 프롬프트 파일 경로
        """
        self.model_name = model
        self.logger = logging.getLogger(__name__)

        # 모델 검증
        if model not in self.SUPPORTED_MODELS:
            raise ValueError(
                f"Unsupported model: {model}. "
                f"Supported models: {list(self.SUPPORTED_MODELS.keys())}"
            )

        provider = self.SUPPORTED_MODELS[model]

        # API 키 설정
        if provider == 'google':
            self.api_key = api_key or os.getenv("GOOGLE_API_KEY")
            if not self.api_key:
                raise ValueError("GOOGLE_API_KEY 환경변수가 설정되지 않았습니다.")
            self.client = genai.Client(api_key=self.api_key)
        elif provider == 'anthropic':
            # Claude API는 향후 구현
            raise NotImplementedError("Claude API는 아직 지원하지 않습니다.")

        # 프롬프트 로드
        self.prompt = self._load_prompt(prompt_path)

        # Entity Extractor 초기화
        self.entity_extractor = EntityExtractor()

        self.logger.info(f"ContentAnalyzer initialized with model: {model}")

    def _load_prompt(self, prompt_path: Optional[str] = None) -> str:
        """프롬프트 파일 로드"""
        if prompt_path is None:
            # 기본 프롬프트 경로
            current_dir = Path(__file__).parent.parent.parent
            prompt_path = current_dir / "config" / "prompts" / "content_analysis.txt"

        try:
            with open(prompt_path, 'r', encoding='utf-8') as f:
                prompt = f.read()
            self.logger.info(f"Loaded prompt from: {prompt_path}")
            return prompt
        except Exception as e:
            self.logger.error(f"Failed to load prompt from {prompt_path}: {e}")
            # 기본 프롬프트 사용
            return self._get_default_prompt()

    def _get_default_prompt(self) -> str:
        """기본 프롬프트 반환"""
        return """당신은 블로그 콘텐츠를 분석하여 필요한 이미지 목록을 생성하는 전문가입니다.

입력된 블로그 콘텐츠를 분석하여 다음 정보를 JSON 배열로 반환하세요:

각 이미지 요구사항:
- id: 고유 ID (예: "img_001")
- type: thumbnail, banner, content, infographic, map 중 하나
- keywords: 이미지 검색에 사용할 키워드 배열 (한국어)
- prompt: AI 이미지 생성용 영어 프롬프트
- section_id: 관련 섹션 ID
- priority: 1-10 (높을수록 중요)
- preferred_source: real(실제 사진), stock(스톡), ai(AI 생성), any
- entity_name: 장소명/음식명/제품명 (있는 경우)
- entity_location: 위치 정보 (있는 경우)

분석 규칙:
1. 썸네일은 항상 1개 필요 (type: thumbnail, priority: 10)
2. 각 h2/h3 섹션당 최소 1개의 content 이미지
3. 맛집/여행 콘텐츠는 실제 사진(real) 우선
4. 라이프스타일/제품 콘텐츠는 스톡(stock) 우선
5. 음식명이 있으면 해당 음식 이미지 필요
6. 장소명+위치가 있으면 Google Places 검색 가능
7. 이미지 간 최소 300자 이상 간격 유지
8. 총 이미지 수는 콘텐츠 길이에 비례 (1000자당 약 2장)

응답은 JSON 배열만 반환하세요."""

    def analyze_content(
        self,
        content: str,
        content_type: Literal["html", "markdown", "text"] = "html"
    ) -> List[ImageRequirement]:
        """
        콘텐츠를 분석하여 이미지 요구사항 생성

        Args:
            content: 분석할 콘텐츠 (HTML, Markdown, 또는 일반 텍스트)
            content_type: 콘텐츠 타입

        Returns:
            ImageRequirement 리스트
        """
        self.logger.info(f"Analyzing content (type: {content_type}, length: {len(content)})")

        try:
            # 엔티티 추출
            entities_data = self.entity_extractor.extract_from_html(content)
            sections = self.entity_extractor.extract_sections(content)

            self.logger.debug(f"Extracted entities: {entities_data}")
            self.logger.debug(f"Extracted sections: {len(sections)}")

            # AI 모델에 전달할 컨텍스트 구성
            context = self._build_analysis_context(
                content, entities_data, sections, content_type
            )

            # AI 모델 호출
            requirements_data = self._call_ai_model(context)

            # ImageRequirement 객체로 변환
            requirements = self._parse_requirements(requirements_data)

            self.logger.info(f"Generated {len(requirements)} image requirements")
            return requirements

        except Exception as e:
            self.logger.error(f"Failed to analyze content: {e}")
            raise

    def _build_analysis_context(
        self,
        content: str,
        entities_data: dict,
        sections: List[dict],
        content_type: str
    ) -> str:
        """분석 컨텍스트 구성"""
        context_parts = [
            f"콘텐츠 타입: {content_type}",
            f"콘텐츠 분류: {entities_data.get('content_type', 'general')}",
            f"콘텐츠 길이: {len(content)}자",
            f"섹션 수: {len(sections)}",
            "",
            "추출된 위치:",
            ", ".join(entities_data.get('locations', [])) if entities_data.get('locations') else "없음",
            "",
            "추출된 엔티티:",
            ", ".join(entities_data.get('entities', [])[:10]) if entities_data.get('entities') else "없음",
            "",
            "섹션 구조:",
        ]

        for section in sections:
            context_parts.append(f"- {section['id']}: {section['title']}")

        context_parts.extend([
            "",
            "콘텐츠 본문:",
            content[:3000]  # 처음 3000자만 (토큰 제한 고려)
        ])

        return "\n".join(context_parts)

    def _call_ai_model(self, context: str) -> List[dict]:
        """AI 모델 호출하여 이미지 요구사항 생성"""
        try:
            # 전체 프롬프트 구성
            full_prompt = f"{self.prompt}\n\n{context}"

            self.logger.debug(f"Calling AI model: {self.model_name}")

            # Gemini API 호출
            response = self.client.models.generate_content(
                model=self.model_name,
                contents=full_prompt,
                config=types.GenerateContentConfig(
                    temperature=0.7,
                    max_output_tokens=4000,
                )
            )

            # 응답 파싱
            content = response.text.strip()
            self.logger.debug(f"AI response length: {len(content)}")

            # JSON 추출 (마크다운 코드 블록 제거)
            if "```json" in content:
                content = content.split("```json")[1].split("```")[0].strip()
            elif "```" in content:
                content = content.split("```")[1].split("```")[0].strip()

            # JSON 파싱
            requirements_data = json.loads(content)

            if not isinstance(requirements_data, list):
                raise ValueError("AI response is not a JSON array")

            self.logger.info(f"Successfully parsed {len(requirements_data)} requirements")
            return requirements_data

        except json.JSONDecodeError as e:
            self.logger.error(f"Failed to parse JSON response: {e}")
            self.logger.error(f"Raw content: {content}")
            raise Exception(f"Failed to parse AI response as JSON: {e}")
        except Exception as e:
            self.logger.error(f"AI model call failed: {e}")
            raise

    def _parse_requirements(self, requirements_data: List[dict]) -> List[ImageRequirement]:
        """AI 응답을 ImageRequirement 객체로 변환"""
        requirements = []

        for i, req_data in enumerate(requirements_data):
            try:
                # 타입 변환
                image_type = ImageType(req_data['type'])
                preferred_source = PreferredSource(req_data.get('preferred_source', 'any'))

                requirement = ImageRequirement(
                    id=req_data.get('id', f"img_{i+1:03d}"),
                    type=image_type,
                    keywords=req_data.get('keywords', []),
                    prompt=req_data.get('prompt', ''),
                    section_id=req_data.get('section_id', 'section_1'),
                    priority=req_data.get('priority', 5),
                    preferred_source=preferred_source,
                    entity_name=req_data.get('entity_name'),
                    entity_location=req_data.get('entity_location')
                )

                requirements.append(requirement)

            except (KeyError, ValueError) as e:
                self.logger.warning(f"Failed to parse requirement {i}: {e}, data: {req_data}")
                continue

        return requirements

    async def analyze(
        self,
        content: str,
        content_type: Literal["html", "markdown", "text"] = "html"
    ) -> List[ImageRequirement]:
        """
        콘텐츠 분석 (async wrapper for orchestrator compatibility)

        Args:
            content: 분석할 콘텐츠
            content_type: 콘텐츠 타입

        Returns:
            ImageRequirement 리스트
        """
        # 동기 메서드를 async로 래핑
        return self.analyze_content(content, content_type)

    def analyze_batch(
        self,
        contents: List[dict],
        content_type: Literal["html", "markdown", "text"] = "html"
    ) -> dict:
        """
        여러 콘텐츠를 배치로 분석

        Args:
            contents: [{'id': ..., 'content': ...}, ...] 형식의 콘텐츠 리스트
            content_type: 콘텐츠 타입

        Returns:
            {'content_id': [ImageRequirement, ...], ...} 형식의 딕셔너리
        """
        self.logger.info(f"Starting batch analysis for {len(contents)} contents")
        results = {}

        for i, content_data in enumerate(contents, 1):
            try:
                content_id = content_data.get('id', f'content_{i}')
                content = content_data.get('content', '')

                self.logger.info(f"Processing {i}/{len(contents)}: {content_id}")

                requirements = self.analyze_content(content, content_type)
                results[content_id] = requirements

            except Exception as e:
                self.logger.error(f"Failed to analyze content {content_id}: {e}")
                results[content_id] = []

        self.logger.info(f"Batch analysis complete: {len(results)} results")
        return results

    def save_requirements(
        self,
        requirements: List[ImageRequirement],
        output_path: str
    ):
        """
        이미지 요구사항을 JSON 파일로 저장

        Args:
            requirements: 저장할 요구사항 리스트
            output_path: 저장할 JSON 파일 경로
        """
        try:
            output_file = Path(output_path)
            output_file.parent.mkdir(parents=True, exist_ok=True)

            # 딕셔너리로 변환
            requirements_dict = [req.to_dict() for req in requirements]

            # JSON으로 저장
            with open(output_file, "w", encoding="utf-8") as f:
                json.dump(requirements_dict, f, ensure_ascii=False, indent=2)

            self.logger.info(f"Requirements saved to: {output_path}")

        except Exception as e:
            self.logger.error(f"Failed to save requirements to {output_path}: {e}")
            raise
