"""나노바나나 3.0 Pro Generator 테스트"""

import pytest
import asyncio
import os
from unittest.mock import Mock, patch, MagicMock
from src.collectors.nanobanana import NanobananGenerator, GeneratedImage


class TestNanobananGenerator:
    """NanobananGenerator 테스트"""

    def test_init_with_api_key(self):
        """API 키로 초기화 테스트"""
        generator = NanobananGenerator(api_key="test_key")
        assert generator.api_key == "test_key"
        assert generator.model == "imagen-3.0-generate-002"
        assert generator.max_retries == 3

    def test_init_without_api_key(self):
        """API 키 없이 초기화 시 에러"""
        with patch.dict(os.environ, {}, clear=True):
            with pytest.raises(ValueError, match="GOOGLE_API_KEY"):
                NanobananGenerator()

    def test_init_with_env_api_key(self):
        """환경변수로 API 키 설정"""
        with patch.dict(os.environ, {"GOOGLE_API_KEY": "env_key"}):
            generator = NanobananGenerator()
            assert generator.api_key == "env_key"

    def test_build_prompt_thumbnail(self):
        """썸네일 프롬프트 생성 테스트"""
        generator = NanobananGenerator(api_key="test")

        prompt = generator._build_prompt(
            topic="맛집 리뷰",
            image_type="thumbnail",
            style="food"
        )

        assert "맛집 리뷰" in prompt
        assert "16:9" in prompt
        assert "warm, appetizing" in prompt

    def test_build_prompt_food_photo(self):
        """푸드 포토 프롬프트 생성 테스트"""
        generator = NanobananGenerator(api_key="test")

        prompt = generator._build_prompt(
            topic="김치찌개",
            image_type="food_photo",
            style="food"
        )

        assert "김치찌개" in prompt
        assert "4:3" in prompt
        assert "Korean restaurant" in prompt

    def test_build_prompt_infographic(self):
        """인포그래픽 프롬프트 생성 테스트"""
        generator = NanobananGenerator(api_key="test")

        prompt = generator._build_prompt(
            topic="건강 팁",
            image_type="infographic",
            style="lifestyle",
            brand_color="green"
        )

        assert "건강 팁" in prompt
        assert "green" in prompt
        assert "1:1" in prompt
        assert "infographic" in prompt

    def test_get_aspect_ratio(self):
        """종횡비 반환 테스트"""
        generator = NanobananGenerator(api_key="test")

        assert generator._get_aspect_ratio("thumbnail") == "16:9"
        assert generator._get_aspect_ratio("banner") == "16:9"
        assert generator._get_aspect_ratio("food_photo") == "4:3"
        assert generator._get_aspect_ratio("infographic") == "1:1"

    def test_get_height_for_type(self):
        """이미지 유형별 높이 계산 테스트"""
        generator = NanobananGenerator(api_key="test")

        assert generator._get_height_for_type("thumbnail") == 576
        assert generator._get_height_for_type("banner") == 576
        assert generator._get_height_for_type("food_photo") == 768
        assert generator._get_height_for_type("infographic") == 1024

    @pytest.mark.asyncio
    async def test_generate_image_success(self):
        """이미지 생성 성공 테스트"""
        generator = NanobananGenerator(api_key="test")

        # Mock response
        mock_image = Mock()
        mock_image.image.image_bytes = b"fake_image_data"

        mock_response = Mock()
        mock_response.generated_images = [mock_image]

        with patch.object(generator.client.models, 'generate_images', return_value=mock_response):
            result = await generator.generate_image(
                prompt="테스트",
                image_type="thumbnail"
            )

            assert result is not None
            assert isinstance(result, GeneratedImage)
            assert result.data == b"fake_image_data"
            assert result.mime_type == "image/png"

    @pytest.mark.asyncio
    async def test_generate_image_with_negative_prompt(self):
        """네거티브 프롬프트 포함 생성 테스트"""
        generator = NanobananGenerator(api_key="test")

        mock_image = Mock()
        mock_image.image.image_bytes = b"fake_image_data"

        mock_response = Mock()
        mock_response.generated_images = [mock_image]

        with patch.object(generator.client.models, 'generate_images', return_value=mock_response) as mock_gen:
            result = await generator.generate_image(
                prompt="테스트",
                image_type="thumbnail",
                negative_prompt="people, cars"
            )

            assert result is not None
            # 프롬프트에 negative prompt 포함 확인
            assert "Negative prompt: people, cars" in result.prompt

    @pytest.mark.asyncio
    async def test_generate_image_retry_on_failure(self):
        """실패 시 재시도 테스트"""
        generator = NanobananGenerator(api_key="test", max_retries=3)

        # 처음 2번 실패, 3번째 성공
        mock_image = Mock()
        mock_image.image.image_bytes = b"fake_image_data"

        mock_response_success = Mock()
        mock_response_success.generated_images = [mock_image]

        call_count = 0
        def side_effect(*args, **kwargs):
            nonlocal call_count
            call_count += 1
            if call_count < 3:
                raise Exception("API Error")
            return mock_response_success

        with patch.object(generator.client.models, 'generate_images', side_effect=side_effect):
            result = await generator.generate_image(
                prompt="테스트",
                image_type="thumbnail"
            )

            assert result is not None
            assert call_count == 3  # 2번 실패 후 3번째 성공

    @pytest.mark.asyncio
    async def test_generate_image_all_retries_failed(self):
        """모든 재시도 실패 테스트"""
        generator = NanobananGenerator(api_key="test", max_retries=2)

        with patch.object(generator.client.models, 'generate_images', side_effect=Exception("API Error")):
            result = await generator.generate_image(
                prompt="테스트",
                image_type="thumbnail"
            )

            assert result is None

    @pytest.mark.asyncio
    async def test_collect_success(self):
        """collect 메서드 성공 테스트"""
        generator = NanobananGenerator(api_key="test")

        mock_image = Mock()
        mock_image.image.image_bytes = b"fake_image_data"

        mock_response = Mock()
        mock_response.generated_images = [mock_image]

        with patch.object(generator.client.models, 'generate_images', return_value=mock_response):
            result = await generator.collect(
                keywords=["맛집", "리뷰"],
                max_images=2,
                image_type="thumbnail",
                style="food"
            )

            assert result.success is True
            assert len(result.images) == 2
            assert result.images[0]['width'] == 1024
            assert result.images[0]['height'] == 576
            assert result.images[0]['source'] == "nanobanana"
            assert "AI Generated" in result.images[0]['attribution']

    @pytest.mark.asyncio
    async def test_collect_no_keywords(self):
        """키워드 없이 collect 호출 시 실패"""
        generator = NanobananGenerator(api_key="test")

        result = await generator.collect(keywords=[], max_images=1)

        assert result.success is False
        assert result.error == "키워드 없음"

    @pytest.mark.asyncio
    async def test_collect_generation_failed(self):
        """이미지 생성 실패 시 collect 실패"""
        generator = NanobananGenerator(api_key="test")

        with patch.object(generator.client.models, 'generate_images', side_effect=Exception("API Error")):
            result = await generator.collect(
                keywords=["테스트"],
                max_images=1
            )

            assert result.success is False
            assert "생성 실패" in result.error

    def test_save_image_success(self, tmp_path):
        """이미지 저장 성공 테스트"""
        generator = NanobananGenerator(api_key="test")

        image_data = b"fake_image_data"
        output_path = tmp_path / "test.png"

        success = generator.save_image(image_data, str(output_path))

        assert success is True
        assert output_path.exists()
        assert output_path.read_bytes() == image_data

    def test_save_image_creates_parent_dirs(self, tmp_path):
        """부모 디렉토리 자동 생성 테스트"""
        generator = NanobananGenerator(api_key="test")

        image_data = b"fake_image_data"
        output_path = tmp_path / "subdir" / "nested" / "test.png"

        success = generator.save_image(image_data, str(output_path))

        assert success is True
        assert output_path.exists()

    def test_load_prompt_template_success(self, tmp_path):
        """프롬프트 템플릿 로드 성공 테스트"""
        generator = NanobananGenerator(api_key="test")

        template_path = tmp_path / "template.txt"
        template_content = "Test template for {topic}"
        template_path.write_text(template_content, encoding="utf-8")

        loaded = generator.load_prompt_template(str(template_path))

        assert loaded == template_content

    def test_load_prompt_template_file_not_found(self):
        """존재하지 않는 템플릿 파일 로드 시 빈 문자열"""
        generator = NanobananGenerator(api_key="test")

        loaded = generator.load_prompt_template("nonexistent.txt")

        assert loaded == ""

    @pytest.mark.asyncio
    async def test_download_always_returns_true(self):
        """download 메서드는 항상 True 반환 (호환성용)"""
        generator = NanobananGenerator(api_key="test")

        result = await generator.download("any_url", "any_path")

        assert result is True

    @pytest.mark.asyncio
    async def test_close(self):
        """close 메서드 테스트"""
        generator = NanobananGenerator(api_key="test")

        # 에러 없이 종료되어야 함
        await generator.close()

    def test_style_presets(self):
        """스타일 프리셋 존재 확인"""
        generator = NanobananGenerator(api_key="test")

        assert "food" in generator.STYLE_PRESETS
        assert "travel" in generator.STYLE_PRESETS
        assert "lifestyle" in generator.STYLE_PRESETS
        assert "tech" in generator.STYLE_PRESETS
        assert "default" in generator.STYLE_PRESETS

    def test_prompt_templates(self):
        """프롬프트 템플릿 존재 확인"""
        generator = NanobananGenerator(api_key="test")

        assert "thumbnail" in generator.PROMPT_TEMPLATES
        assert "banner" in generator.PROMPT_TEMPLATES
        assert "food_photo" in generator.PROMPT_TEMPLATES
        assert "infographic" in generator.PROMPT_TEMPLATES


class TestGeneratedImage:
    """GeneratedImage 데이터클래스 테스트"""

    def test_generated_image_creation(self):
        """GeneratedImage 생성 테스트"""
        img = GeneratedImage(
            data=b"test_data",
            mime_type="image/png",
            prompt="test prompt"
        )

        assert img.data == b"test_data"
        assert img.mime_type == "image/png"
        assert img.prompt == "test prompt"
