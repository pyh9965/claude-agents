"""Blog Image Collection Agent

블로그 콘텐츠를 분석하여 필요한 이미지를 자동으로 수집하고 생성하는 에이전트.
"""

__version__ = "1.0.0"

from .models import (
    ImageRequirement,
    CollectedImage,
    ImagePlacement,
    ImageMap,
    CollectionStatistics,
    ImageType,
    ImageSource,
    PreferredSource
)

from .pipeline import PipelineOrchestrator, PipelineConfig, PipelineResult

# 공개 API
__all__ = [
    # 버전
    "__version__",

    # 데이터 모델
    "ImageRequirement",
    "CollectedImage",
    "ImagePlacement",
    "ImageMap",
    "CollectionStatistics",
    "ImageType",
    "ImageSource",
    "PreferredSource",

    # 파이프라인
    "PipelineOrchestrator",
    "PipelineConfig",
    "PipelineResult",
]

# 편의 함수
async def collect_images(html_content: str, output_dir: str = "output") -> PipelineResult:
    """블로그 콘텐츠에서 이미지 수집 (간편 함수)

    Args:
        html_content: HTML 블로그 콘텐츠
        output_dir: 출력 디렉토리

    Returns:
        PipelineResult

    Example:
        >>> import asyncio
        >>> from blog_image_agent import collect_images
        >>>
        >>> html = open("my_blog.html").read()
        >>> result = asyncio.run(collect_images(html, "output"))
        >>> print(f"수집된 이미지: {result.statistics.total}개")
    """
    orchestrator = PipelineOrchestrator()
    result = await orchestrator.run(html_content, output_dir)
    await orchestrator.close()
    return result
