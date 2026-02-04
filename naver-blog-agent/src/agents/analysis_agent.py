import asyncio
import json
import re
from typing import Dict, Any, List, Optional
from datetime import datetime
from loguru import logger

from .base import BaseAgent, AgentResult
from ..models import AnalysisInput, AnalysisResult, BlogContent, SentimentLabel, ContentType
from ..core.config import get_settings


ANALYSIS_PROMPT = """다음 블로그 게시글을 분석해주세요. 반드시 JSON 형식으로만 응답하세요.

## 블로그 게시글

제목: {title}
작성자: {author}
URL: {url}

본문:
{content}

---

## 응답 형식 (JSON만 출력, 다른 텍스트 없이)

```json
{{
    "sentiment_score": 0.5,
    "sentiment_label": "긍정",
    "keywords": [
        {{"keyword": "키워드1", "count": 5}},
        {{"keyword": "키워드2", "count": 3}}
    ],
    "summary": "3문장 이내 요약",
    "content_type": "후기",
    "is_ad": false,
    "quality_score": 7
}}
```

## 분석 기준

1. **감성 분석**
   - sentiment_score: -1.0(매우 부정) ~ 1.0(매우 긍정)
   - sentiment_label: "매우 긍정", "긍정", "중립", "부정", "매우 부정" 중 하나

2. **키워드 추출**
   - 주요 키워드 최대 10개
   - 각 키워드별 예상 언급 횟수

3. **콘텐츠 요약**
   - 3문장 이내로 핵심 내용 요약

4. **콘텐츠 분류**
   - content_type: "정보 제공", "후기", "광고", "뉴스", "기타" 중 하나

5. **광고성 판단**
   - is_ad: 협찬/광고 여부 (true/false)

6. **품질 점수**
   - quality_score: 1(매우 낮음) ~ 10(매우 높음)

JSON 형식으로만 응답하세요. 추가 설명은 넣지 마세요."""


class AnalysisAgent(BaseAgent):
    """콘텐츠 분석 에이전트 (Google Gemini API 기반)"""

    def __init__(self, config: Dict[str, Any] = None):
        super().__init__(config)
        settings = get_settings()
        self.api_key = config.get("api_key") if config else None
        if not self.api_key:
            self.api_key = settings.google_api_key

        self.model = config.get("model", settings.gemini_model) if config else settings.gemini_model
        self._client = None

    async def initialize(self) -> None:
        """Google Generative AI 클라이언트 초기화"""
        try:
            import google.generativeai as genai
            genai.configure(api_key=self.api_key)
            self._client = genai.GenerativeModel(self.model)
            await super().initialize()
        except ImportError:
            raise ImportError("google-generativeai 패키지가 필요합니다: pip install google-generativeai")

    async def validate_input(self, input_data: AnalysisInput) -> bool:
        """입력 검증"""
        if not input_data.content:
            raise ValueError("분석할 콘텐츠가 없습니다.")
        if not input_data.content.content:
            raise ValueError("블로그 본문이 비어있습니다.")
        if not self.api_key:
            raise ValueError("Google API 키가 필요합니다.")
        return True

    async def execute(self, input_data: AnalysisInput) -> AgentResult[AnalysisResult]:
        """분석 실행"""
        content = input_data.content

        # 프롬프트 생성
        prompt = self._build_prompt(content)

        # LLM 호출
        try:
            response = await self._call_llm(prompt)

            # 응답 파싱
            analysis = self._parse_response(response, content.url)

            return AgentResult(
                success=True,
                data=analysis,
                metadata={
                    "model": self.model,
                    "url": content.url
                }
            )

        except Exception as e:
            logger.error(f"분석 실패 ({content.url}): {str(e)}")
            return AgentResult(
                success=False,
                error=str(e),
                metadata={"url": content.url}
            )

    def _build_prompt(self, content: BlogContent) -> str:
        """분석 프롬프트 생성"""
        # 본문 길이 제한 (토큰 절약)
        truncated_content = content.content[:8000] if content.content else ""

        return ANALYSIS_PROMPT.format(
            title=content.title or "제목 없음",
            author=content.author or "작성자 불명",
            url=content.url,
            content=truncated_content
        )

    async def _call_llm(self, prompt: str) -> str:
        """Google Gemini API 호출"""
        response = await asyncio.to_thread(
            self._client.generate_content,
            prompt
        )

        return response.text

    def _parse_response(self, response: str, url: str) -> AnalysisResult:
        """LLM 응답 파싱"""
        try:
            # JSON 추출 (코드 블록 제거)
            json_match = re.search(r'```json\s*(.*?)\s*```', response, re.DOTALL)
            if json_match:
                json_str = json_match.group(1)
            else:
                # 직접 JSON 파싱 시도
                json_str = response.strip()
                # JSON 객체만 추출
                json_match = re.search(r'\{.*\}', json_str, re.DOTALL)
                if json_match:
                    json_str = json_match.group(0)

            data = json.loads(json_str)

            # 감성 레이블 매핑
            sentiment_map = {
                "매우 긍정": SentimentLabel.VERY_POSITIVE,
                "긍정": SentimentLabel.POSITIVE,
                "중립": SentimentLabel.NEUTRAL,
                "부정": SentimentLabel.NEGATIVE,
                "매우 부정": SentimentLabel.VERY_NEGATIVE,
            }

            # 콘텐츠 타입 매핑
            content_type_map = {
                "정보 제공": ContentType.INFO,
                "후기": ContentType.REVIEW,
                "광고": ContentType.AD,
                "뉴스": ContentType.NEWS,
                "기타": ContentType.OTHER,
            }

            return AnalysisResult(
                url=url,
                sentiment_score=float(data.get("sentiment_score", 0)),
                sentiment_label=sentiment_map.get(data.get("sentiment_label", "중립"), SentimentLabel.NEUTRAL),
                keywords=data.get("keywords", []),
                summary=data.get("summary", ""),
                content_type=content_type_map.get(data.get("content_type", "기타"), ContentType.OTHER),
                is_ad=bool(data.get("is_ad", False)),
                quality_score=int(data.get("quality_score", 5)),
                analyzed_at=datetime.now()
            )

        except (json.JSONDecodeError, KeyError, ValueError) as e:
            logger.warning(f"응답 파싱 실패: {str(e)}")
            # 기본값 반환
            return AnalysisResult(
                url=url,
                sentiment_score=0.0,
                sentiment_label=SentimentLabel.NEUTRAL,
                keywords=[],
                summary="분석 실패",
                content_type=ContentType.OTHER,
                is_ad=False,
                quality_score=5,
                analyzed_at=datetime.now()
            )

    async def analyze(self, content: BlogContent) -> AgentResult[AnalysisResult]:
        """편의 메서드: 직접 분석 실행"""
        input_data = AnalysisInput(content=content)
        return await self.run(input_data)

    async def analyze_batch(
        self,
        contents: List[BlogContent],
        concurrency: int = 5
    ) -> List[AgentResult[AnalysisResult]]:
        """배치 분석 실행"""
        semaphore = asyncio.Semaphore(concurrency)

        async def analyze_one(content: BlogContent):
            async with semaphore:
                result = await self.analyze(content)
                await asyncio.sleep(0.5)  # Rate limiting
                return result

        tasks = [analyze_one(c) for c in contents]
        return await asyncio.gather(*tasks)
