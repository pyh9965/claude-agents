"""Pipeline Orchestrator Tests"""

import pytest
import asyncio
from pathlib import Path
import sys

# 상위 디렉토리를 경로에 추가
sys.path.insert(0, str(Path(__file__).parent.parent / "src"))

from src.pipeline import PipelineOrchestrator, PipelineConfig, PipelineResult


@pytest.fixture
def sample_html():
    """샘플 HTML 콘텐츠"""
    return """
    <html>
    <head><title>서울 맛집 탐방</title></head>
    <body>
        <h1>서울 강남 맛집 Best 3</h1>
        <p>오늘은 서울 강남에 위치한 유명 맛집들을 소개합니다.</p>

        <h2>1. 강남역 스테이크 전문점</h2>
        <p>강남역에 위치한 이 스테이크 전문점은 최고급 한우를 사용합니다.</p>

        <h2>2. 논현동 이탈리안 레스토랑</h2>
        <p>정통 이탈리안 요리를 맛볼 수 있는 곳입니다.</p>

        <h2>3. 신사동 카페</h2>
        <p>분위기 좋은 카페로 디저트가 일품입니다.</p>
    </body>
    </html>
    """


@pytest.fixture
def config():
    """테스트용 설정"""
    return PipelineConfig(
        output_dir="test_output",
        min_images_per_content=2,
        max_images_per_content=5,
        fallback_to_stock=True,
        fallback_to_ai=True,
        optimize_images=False,  # 테스트 속도 향상
        convert_to_webp=False
    )


class TestPipelineConfig:
    """PipelineConfig 테스트"""

    def test_default_config(self):
        """기본 설정 테스트"""
        config = PipelineConfig()

        assert config.output_dir == "output"
        assert config.min_images_per_content == 3
        assert config.max_images_per_content == 15
        assert config.fallback_to_stock is True
        assert config.fallback_to_ai is True
        assert config.optimize_images is True
        assert config.image_quality == 85
        assert config.collection_priority == ["google", "stock", "nanobanana"]

    def test_custom_config(self):
        """커스텀 설정 테스트"""
        config = PipelineConfig(
            output_dir="custom_output",
            min_images_per_content=5,
            fallback_to_stock=False,
            collection_priority=["nanobanana", "stock"]
        )

        assert config.output_dir == "custom_output"
        assert config.min_images_per_content == 5
        assert config.fallback_to_stock is False
        assert config.collection_priority == ["nanobanana", "stock"]


class TestPipelineOrchestrator:
    """PipelineOrchestrator 테스트"""

    @pytest.mark.asyncio
    async def test_init(self, config):
        """초기화 테스트"""
        orchestrator = PipelineOrchestrator(config)

        assert orchestrator.config == config
        # lazy init이므로 처음엔 None
        assert orchestrator.analyzer is None
        assert orchestrator.validator is None
        assert orchestrator.stats.total == 0

        # 초기화 후 확인
        await orchestrator._init_collectors()
        orchestrator._init_processors()

        # 프로세서는 초기화됨
        assert orchestrator.validator is not None
        assert orchestrator.optimizer is not None
        assert orchestrator.placer is not None
        assert orchestrator.inserter is not None

        # 캐시 초기화 확인
        if config.cache_enabled:
            assert orchestrator.cache is not None

        await orchestrator.close()

    @pytest.mark.asyncio
    async def test_init_collectors(self, config):
        """수집기 초기화 테스트"""
        orchestrator = PipelineOrchestrator(config)

        await orchestrator._init_collectors()

        # 스톡 수집기는 항상 초기화됨
        assert orchestrator.stock_collector is not None

        # Google/Nanobanana는 API 키에 따라 초기화될 수 있음
        # (None이어도 에러는 아님)

        await orchestrator.close()

    @pytest.mark.asyncio
    async def test_run_basic(self, config, sample_html):
        """기본 실행 테스트"""
        orchestrator = PipelineOrchestrator(config)

        try:
            result = await orchestrator.run(
                sample_html,
                content_id="test_001"
            )

            # 결과 검증
            assert isinstance(result, PipelineResult)
            assert result.content_id == "test_001"
            assert result.execution_time > 0

            # 성공 여부는 API 키 유무에 따라 다를 수 있음
            if result.success:
                assert result.image_map is not None
                assert result.output_html is not None
                assert len(result.statistics.by_source) > 0

        finally:
            await orchestrator.close()

    @pytest.mark.asyncio
    async def test_run_with_output_dir(self, config, sample_html):
        """출력 디렉토리 지정 테스트"""
        import tempfile
        import shutil

        temp_dir = tempfile.mkdtemp()

        try:
            orchestrator = PipelineOrchestrator(config)

            result = await orchestrator.run(
                sample_html,
                output_dir=temp_dir,
                content_id="test_002"
            )

            # 디렉토리 생성 확인
            assert Path(temp_dir).exists()
            assert (Path(temp_dir) / "images").exists()

            await orchestrator.close()

        finally:
            # 정리
            if Path(temp_dir).exists():
                shutil.rmtree(temp_dir)

    @pytest.mark.asyncio
    async def test_auto_content_id(self, config, sample_html):
        """자동 콘텐츠 ID 생성 테스트"""
        orchestrator = PipelineOrchestrator(config)

        try:
            result = await orchestrator.run(sample_html)

            # 자동 생성된 ID 확인
            assert result.content_id is not None
            assert len(result.content_id) > 0

        finally:
            await orchestrator.close()

    def test_to_dict_dataclass(self):
        """dataclass를 dict로 변환 테스트"""
        from src.models import ImageRequirement, ImageType, PreferredSource

        config = PipelineConfig()
        orchestrator = PipelineOrchestrator(config)

        req = ImageRequirement(
            id="req_001",
            type=ImageType.CONTENT,
            keywords=["음식", "스테이크"],
            prompt="delicious steak",
            section_id="section_1",
            priority=8,
            preferred_source=PreferredSource.REAL,
            entity_name="강남 스테이크 하우스"
        )

        result = orchestrator._to_dict(req)

        assert isinstance(result, dict)
        assert result["id"] == "req_001"
        assert result["keywords"] == ["음식", "스테이크"]
        assert result["entity_name"] == "강남 스테이크 하우스"

    def test_to_dict_plain_dict(self):
        """일반 dict 변환 테스트"""
        config = PipelineConfig()
        orchestrator = PipelineOrchestrator(config)

        data = {
            "id": "test",
            "value": 123
        }

        result = orchestrator._to_dict(data)

        assert result == data

    def test_get_attr_dataclass(self):
        """dataclass 속성 가져오기 테스트"""
        from src.models import ImageRequirement, ImageType, PreferredSource

        config = PipelineConfig()
        orchestrator = PipelineOrchestrator(config)

        req = ImageRequirement(
            id="req_001",
            type=ImageType.CONTENT,
            keywords=["test"],
            prompt="test prompt",
            section_id="section_1",
            priority=5
        )

        assert orchestrator._get_attr(req, 'id') == "req_001"
        assert orchestrator._get_attr(req, 'keywords') == ["test"]
        assert orchestrator._get_attr(req, 'nonexistent', 'default') == 'default'

    def test_get_attr_dict(self):
        """dict 속성 가져오기 테스트"""
        config = PipelineConfig()
        orchestrator = PipelineOrchestrator(config)

        data = {
            "id": "test_001",
            "value": 123
        }

        assert orchestrator._get_attr(data, 'id') == "test_001"
        assert orchestrator._get_attr(data, 'value') == 123
        assert orchestrator._get_attr(data, 'missing', 'default') == 'default'


class TestPipelineResult:
    """PipelineResult 테스트"""

    def test_success_result(self):
        """성공 결과 테스트"""
        from src.models import ImageMap, CollectionStatistics

        stats = CollectionStatistics(
            total=5,
            by_source={"stock": 3, "nanobanana": 2},
            failures=0
        )

        image_map = ImageMap(
            content_id="test_001",
            images=[],
            placements=[],
            statistics=stats
        )

        result = PipelineResult(
            success=True,
            content_id="test_001",
            image_map=image_map,
            output_html="<html>...</html>",
            statistics=stats,
            errors=[],
            execution_time=1.5
        )

        assert result.success is True
        assert result.content_id == "test_001"
        assert result.image_map == image_map
        assert result.execution_time == 1.5
        assert len(result.errors) == 0

    def test_failure_result(self):
        """실패 결과 테스트"""
        from src.models import CollectionStatistics

        stats = CollectionStatistics()

        result = PipelineResult(
            success=False,
            content_id="test_002",
            image_map=None,
            output_html=None,
            statistics=stats,
            errors=["Network error", "API key missing"],
            execution_time=0.5
        )

        assert result.success is False
        assert result.image_map is None
        assert result.output_html is None
        assert len(result.errors) == 2
        assert "Network error" in result.errors


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
