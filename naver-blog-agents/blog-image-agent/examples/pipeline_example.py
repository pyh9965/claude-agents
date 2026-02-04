"""Pipeline Orchestrator 사용 예제"""

import asyncio
import sys
from pathlib import Path

# src 경로 추가
sys.path.insert(0, str(Path(__file__).parent.parent / "src"))

from src.pipeline import PipelineOrchestrator, PipelineConfig


# 샘플 HTML 콘텐츠
SAMPLE_HTML = """
<!DOCTYPE html>
<html>
<head>
    <title>서울 맛집 탐방 - 강남 Best 5</title>
</head>
<body>
    <h1>서울 강남 맛집 Best 5</h1>
    <p>안녕하세요! 오늘은 서울 강남에 위치한 유명 맛집들을 소개해드리겠습니다.</p>

    <h2>1. 강남역 스테이크 전문점</h2>
    <p>강남역 2번 출구에서 도보 5분 거리에 위치한 이 스테이크 전문점은
    최고급 한우를 사용하여 육즙 가득한 스테이크를 제공합니다.
    와인 페어링도 훌륭하며, 특히 저녁 시간대에는 예약이 필수입니다.</p>

    <h2>2. 논현동 이탈리안 레스토랑</h2>
    <p>정통 이탈리안 요리를 맛볼 수 있는 곳입니다.
    셰프가 직접 만드는 파스타와 피자가 유명하며,
    신선한 해산물을 사용한 요리가 특히 인기입니다.</p>

    <h2>3. 신사동 가로수길 카페</h2>
    <p>분위기 좋은 카페로 디저트가 일품입니다.
    수제 케이크와 브런치 메뉴가 유명하며,
    인스타그램 감성이 물씬 나는 인테리어가 매력적입니다.</p>

    <h2>4. 청담동 한정식</h2>
    <p>전통 한식의 멋을 느낄 수 있는 한정식 전문점입니다.
    계절마다 바뀌는 제철 재료를 사용한 코스 요리가 훌륭하며,
    접대 장소로도 인기가 많습니다.</p>

    <h2>5. 압구정 스시 오마카세</h2>
    <p>일본 현지에서 공수한 신선한 재료로 만드는 오마카세가 유명합니다.
    셰프의 섬세한 손길로 완성되는 초밥을 맛볼 수 있으며,
    매일 메뉴가 바뀌는 것이 특징입니다.</p>

    <h2>마무리</h2>
    <p>강남 지역의 다양한 맛집들을 소개해드렸습니다.
    각자의 취향에 맞는 곳을 골라 방문해보시기 바랍니다!</p>
</body>
</html>
"""


async def example_basic():
    """기본 사용 예제"""
    print("\n=== 기본 파이프라인 실행 ===\n")

    # 기본 설정으로 오케스트레이터 생성
    orchestrator = PipelineOrchestrator()

    try:
        # 파이프라인 실행
        result = await orchestrator.run(
            html_content=SAMPLE_HTML,
            output_dir="output/basic_example",
            content_id="gangnam_food"
        )

        # 결과 출력
        if result.success:
            print(f"\n✓ 성공!")
            print(f"  - 콘텐츠 ID: {result.content_id}")
            print(f"  - 수집 이미지: {result.statistics.total}개")
            print(f"  - 실패: {result.statistics.failures}개")
            print(f"  - 소스별: {result.statistics.by_source}")
            print(f"  - 실행 시간: {result.execution_time:.1f}초")
        else:
            print(f"\n✗ 실패")
            print(f"  - 에러: {result.errors}")

    finally:
        await orchestrator.close()


async def example_custom_config():
    """커스텀 설정 예제"""
    print("\n=== 커스텀 설정 파이프라인 실행 ===\n")

    # 커스텀 설정
    config = PipelineConfig(
        output_dir="output/custom_example",
        min_images_per_content=2,
        max_images_per_content=8,
        fallback_to_stock=True,
        fallback_to_ai=True,
        optimize_images=True,
        convert_to_webp=True,
        image_quality=90,
        collection_priority=["stock", "nanobanana", "google"]  # 스톡 우선
    )

    orchestrator = PipelineOrchestrator(config)

    try:
        result = await orchestrator.run(
            html_content=SAMPLE_HTML,
            content_id="gangnam_food_custom"
        )

        if result.success:
            print(f"\n✓ 성공!")
            print(f"  - 수집 이미지: {result.statistics.total}개")
            print(f"  - 소스별: {result.statistics.by_source}")
            print(f"  - 실행 시간: {result.execution_time:.1f}초")

            # 이미지 맵 정보
            if result.image_map:
                print(f"\n이미지 맵:")
                for img in result.image_map.images:
                    img_dict = orchestrator._to_dict(img)
                    print(f"  - {img_dict['id']}: {img_dict['source']}")
        else:
            print(f"\n✗ 실패: {result.errors}")

    finally:
        await orchestrator.close()


async def example_stock_only():
    """스톡 이미지만 사용하는 예제"""
    print("\n=== 스톡 이미지만 사용 ===\n")

    config = PipelineConfig(
        output_dir="output/stock_only",
        fallback_to_ai=False,  # AI 생성 비활성화
        collection_priority=["stock"],  # 스톡만
        optimize_images=False,  # 최적화 비활성화 (속도 향상)
    )

    orchestrator = PipelineOrchestrator(config)

    try:
        result = await orchestrator.run(
            html_content=SAMPLE_HTML,
            content_id="gangnam_stock"
        )

        if result.success:
            print(f"\n✓ 성공!")
            print(f"  - 수집 이미지: {result.statistics.total}개")
            print(f"  - 소스: {result.statistics.by_source}")
        else:
            print(f"\n✗ 실패: {result.errors}")

    finally:
        await orchestrator.close()


async def example_ai_only():
    """AI 생성만 사용하는 예제"""
    print("\n=== AI 이미지 생성만 사용 ===\n")

    config = PipelineConfig(
        output_dir="output/ai_only",
        fallback_to_stock=False,  # 스톡 비활성화
        collection_priority=["nanobanana"],  # AI만
        convert_to_webp=True,
    )

    orchestrator = PipelineOrchestrator(config)

    try:
        result = await orchestrator.run(
            html_content=SAMPLE_HTML,
            content_id="gangnam_ai"
        )

        if result.success:
            print(f"\n✓ 성공!")
            print(f"  - 수집 이미지: {result.statistics.total}개")
            print(f"  - 소스: {result.statistics.by_source}")
        else:
            print(f"\n✗ 실패: {result.errors}")

    finally:
        await orchestrator.close()


async def main():
    """메인 함수 - 모든 예제 실행"""
    print("=" * 60)
    print("Pipeline Orchestrator 예제 실행")
    print("=" * 60)

    # 예제 선택
    print("\n실행할 예제를 선택하세요:")
    print("1. 기본 파이프라인")
    print("2. 커스텀 설정")
    print("3. 스톡 이미지만")
    print("4. AI 생성만")
    print("5. 모두 실행")

    choice = input("\n선택 (1-5): ").strip()

    if choice == "1":
        await example_basic()
    elif choice == "2":
        await example_custom_config()
    elif choice == "3":
        await example_stock_only()
    elif choice == "4":
        await example_ai_only()
    elif choice == "5":
        await example_basic()
        await example_custom_config()
        await example_stock_only()
        await example_ai_only()
    else:
        print("잘못된 선택입니다.")

    print("\n" + "=" * 60)
    print("예제 실행 완료!")
    print("=" * 60)


if __name__ == "__main__":
    asyncio.run(main())
