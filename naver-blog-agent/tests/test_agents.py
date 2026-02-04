import pytest
import asyncio
from datetime import date

# pytest-asyncio 설정
pytest_plugins = ('pytest_asyncio',)


@pytest.fixture
def event_loop():
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


class TestSearchAgent:
    """검색 에이전트 테스트"""

    @pytest.mark.asyncio
    async def test_search_input_validation(self):
        from src.agents import SearchAgent
        from src.models import SearchInput

        agent = SearchAgent({
            "client_id": "test_id",
            "client_secret": "test_secret"
        })

        # 빈 키워드는 실패해야 함
        with pytest.raises(ValueError):
            await agent.validate_input(SearchInput(keyword="", max_results=100))

    @pytest.mark.asyncio
    async def test_search_input_max_results(self):
        from src.models import SearchInput

        # 최대 결과 수 제한 테스트
        input_data = SearchInput(keyword="테스트", max_results=500)
        assert input_data.max_results == 500

        # 1000 초과는 Pydantic에서 거부
        with pytest.raises(Exception):
            SearchInput(keyword="테스트", max_results=2000)


class TestCrawlerAgent:
    """수집 에이전트 테스트"""

    def test_mobile_url_conversion(self):
        from src.agents import HybridCrawlerAgent

        agent = HybridCrawlerAgent()

        desktop_url = "https://blog.naver.com/example/12345"
        mobile_url = agent._to_mobile_url(desktop_url)

        assert "m.blog.naver.com" in mobile_url
        assert "example/12345" in mobile_url


class TestModels:
    """데이터 모델 테스트"""

    def test_blog_content_model(self):
        from src.models import BlogContent

        content = BlogContent(
            url="https://blog.naver.com/test/123",
            title="테스트 제목",
            content="테스트 본문 내용입니다."
        )

        assert content.url == "https://blog.naver.com/test/123"
        assert content.title == "테스트 제목"
        assert content.method == "httpx"  # 기본값

    def test_analysis_result_model(self):
        from src.models import AnalysisResult, SentimentLabel, ContentType

        result = AnalysisResult(
            url="https://blog.naver.com/test/123",
            sentiment_score=0.8,
            sentiment_label=SentimentLabel.POSITIVE,
            keywords=[{"keyword": "테스트", "count": 5}],
            summary="요약 내용",
            content_type=ContentType.REVIEW,
            quality_score=8
        )

        assert result.sentiment_score == 0.8
        assert result.sentiment_label == SentimentLabel.POSITIVE
        assert result.quality_score == 8


class TestUtils:
    """유틸리티 함수 테스트"""

    def test_clean_html(self):
        from src.utils import clean_html

        html = "<b>테스트</b> <a href='#'>링크</a>"
        result = clean_html(html)

        assert "<b>" not in result
        assert "<a" not in result
        assert "테스트" in result

    def test_format_date(self):
        from src.utils import format_date

        assert format_date("20260131") == "2026-01-31"
        assert format_date("2026-01-31") == "2026-01-31"

    def test_to_mobile_url(self):
        from src.utils import to_mobile_url

        url = "https://blog.naver.com/test/123"
        mobile = to_mobile_url(url)

        assert "m.blog.naver.com" in mobile


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
