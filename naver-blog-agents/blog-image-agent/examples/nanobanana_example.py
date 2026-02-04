"""나노바나나 3.0 Pro Generator 사용 예제"""

import asyncio
import os
from pathlib import Path
import sys

# 프로젝트 루트를 Python 경로에 추가
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from src.collectors.nanobanana import NanobananGenerator


async def example_thumbnail():
    """썸네일 이미지 생성 예제"""
    print("\n=== 썸네일 이미지 생성 ===")

    generator = NanobananGenerator()

    # 블로그 썸네일 생성
    result = await generator.collect(
        keywords=["맛집", "리뷰", "강남"],
        max_images=1,
        image_type="thumbnail",
        style="food"
    )

    if result.success:
        for idx, img in enumerate(result.images):
            print(f"\n이미지 {idx + 1}:")
            print(f"  크기: {img['width']}x{img['height']}")
            print(f"  출처: {img['attribution']}")
            print(f"  프롬프트: {img['prompt'][:100]}...")

            # 이미지 저장
            output_path = f"output/thumbnail_{idx + 1}.png"
            generator.save_image(img['data'], output_path)
            print(f"  저장 완료: {output_path}")
    else:
        print(f"실패: {result.error}")


async def example_food_photo():
    """푸드 포토 생성 예제"""
    print("\n=== 푸드 포토 생성 ===")

    generator = NanobananGenerator()

    # 음식 사진 생성
    result = await generator.collect(
        keywords=["김치찌개", "한식"],
        max_images=2,
        image_type="food_photo",
        style="food"
    )

    if result.success:
        for idx, img in enumerate(result.images):
            print(f"\n이미지 {idx + 1}:")
            print(f"  크기: {img['width']}x{img['height']}")
            print(f"  스타일: {img['style']}")

            # 이미지 저장
            output_path = f"output/food_{idx + 1}.png"
            generator.save_image(img['data'], output_path)
            print(f"  저장 완료: {output_path}")
    else:
        print(f"실패: {result.error}")


async def example_infographic():
    """인포그래픽 카드 생성 예제"""
    print("\n=== 인포그래픽 카드 생성 ===")

    generator = NanobananGenerator()

    # 카드뉴스 스타일 이미지 생성
    result = await generator.collect(
        keywords=["건강한", "식습관", "5가지", "팁"],
        max_images=1,
        image_type="infographic",
        style="lifestyle",
        brand_color="green"
    )

    if result.success:
        for idx, img in enumerate(result.images):
            print(f"\n이미지 {idx + 1}:")
            print(f"  크기: {img['width']}x{img['height']}")
            print(f"  유형: {img['image_type']}")

            # 이미지 저장
            output_path = f"output/infographic_{idx + 1}.png"
            generator.save_image(img['data'], output_path)
            print(f"  저장 완료: {output_path}")
    else:
        print(f"실패: {result.error}")


async def example_custom_prompt():
    """커스텀 프롬프트 사용 예제"""
    print("\n=== 커스텀 프롬프트 생성 ===")

    generator = NanobananGenerator()

    # 직접 이미지 생성
    generated = await generator.generate_image(
        prompt="서울 야경",
        image_type="banner",
        style="travel",
        negative_prompt="people, cars, traffic"
    )

    if generated:
        print(f"생성 완료:")
        print(f"  MIME 타입: {generated.mime_type}")
        print(f"  데이터 크기: {len(generated.data)} bytes")
        print(f"  프롬프트: {generated.prompt[:150]}...")

        # 이미지 저장
        output_path = "output/custom_banner.png"
        generator.save_image(generated.data, output_path)
        print(f"  저장 완료: {output_path}")
    else:
        print("생성 실패")


async def example_batch_generation():
    """배치 생성 예제 (여러 유형 동시 생성)"""
    print("\n=== 배치 생성 ===")

    generator = NanobananGenerator()

    tasks = [
        generator.collect(
            keywords=["여행", "제주도"],
            max_images=1,
            image_type="thumbnail",
            style="travel"
        ),
        generator.collect(
            keywords=["맛있는", "피자"],
            max_images=1,
            image_type="food_photo",
            style="food"
        ),
        generator.collect(
            keywords=["AI", "기술", "트렌드"],
            max_images=1,
            image_type="infographic",
            style="tech",
            brand_color="blue"
        )
    ]

    results = await asyncio.gather(*tasks)

    for idx, result in enumerate(results):
        if result.success and result.images:
            img = result.images[0]
            print(f"\n배치 {idx + 1}:")
            print(f"  유형: {img['image_type']}")
            print(f"  스타일: {img['style']}")
            print(f"  크기: {img['width']}x{img['height']}")

            output_path = f"output/batch_{idx + 1}.png"
            generator.save_image(img['data'], output_path)
            print(f"  저장 완료: {output_path}")


async def example_load_external_template():
    """외부 템플릿 로드 예제"""
    print("\n=== 외부 템플릿 사용 ===")

    generator = NanobananGenerator()

    # 템플릿 파일 로드
    template_path = "config/prompts/nanobanana_food.txt"
    template = generator.load_prompt_template(template_path)

    if template:
        print(f"템플릿 로드 완료:")
        print(f"{template}")

        # 템플릿 포맷팅
        formatted = template.format(dish_name="불고기")
        print(f"\n포맷팅된 프롬프트:")
        print(f"{formatted}")
    else:
        print("템플릿 로드 실패")


async def main():
    """모든 예제 실행"""

    # 출력 디렉토리 생성
    os.makedirs("output", exist_ok=True)

    print("나노바나나 3.0 Pro Generator 예제")
    print("=" * 50)

    # API 키 확인
    if not os.getenv("GOOGLE_API_KEY"):
        print("\n경고: GOOGLE_API_KEY 환경변수가 설정되지 않았습니다.")
        print("실제 이미지 생성을 위해서는 API 키가 필요합니다.")
        return

    try:
        # 각 예제 실행
        await example_thumbnail()
        await example_food_photo()
        await example_infographic()
        await example_custom_prompt()
        await example_batch_generation()
        await example_load_external_template()

    except Exception as e:
        print(f"\n에러 발생: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    asyncio.run(main())
