"""나노바나나 Generator와 다른 Collector 통합 예제"""

import asyncio
import os
from pathlib import Path
import sys

project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from src.collectors.nanobanana import NanobananGenerator
from src.collectors.google_places import GooglePlacesCollector


async def hybrid_approach():
    """하이브리드 접근: 실제 사진 + AI 생성 이미지 혼합"""

    print("\n=== 하이브리드 이미지 수집 ===")
    print("실제 장소 사진 + AI 생성 썸네일 조합\n")

    # 키워드
    location = "강남역 맛집"
    keywords = ["강남역", "맛집", "한식"]

    # 1. Google Places에서 실제 사진 수집
    print("1️⃣ Google Places에서 실제 사진 수집...")

    places_collector = GooglePlacesCollector(
        api_key=os.getenv("GOOGLE_PLACES_API_KEY")
    )

    places_result = await places_collector.collect(
        keywords=keywords,
        max_images=3
    )

    if places_result.success:
        print(f"   ✅ {len(places_result.images)}개의 실제 사진 수집 완료")

        # 실제 사진 저장
        for idx, img in enumerate(places_result.images, 1):
            output_path = f"output/hybrid/real_photo_{idx}.jpg"
            await places_collector.download(img['url'], output_path)
            print(f"   📸 실제 사진 {idx}: {img.get('attribution', 'Unknown')}")
    else:
        print(f"   ❌ 실제 사진 수집 실패: {places_result.error}")

    # 2. Nanobanana로 블로그 썸네일 생성
    print("\n2️⃣ Nanobanana로 블로그 썸네일 생성...")

    nano_generator = NanobananGenerator()

    nano_result = await nano_generator.collect(
        keywords=keywords,
        max_images=1,
        image_type="thumbnail",
        style="food"
    )

    if nano_result.success:
        img = nano_result.images[0]
        print(f"   ✅ AI 썸네일 생성 완료")
        print(f"   🎨 크기: {img['width']}x{img['height']}")

        # AI 썸네일 저장
        output_path = "output/hybrid/ai_thumbnail.png"
        nano_generator.save_image(img['data'], output_path)
        print(f"   💾 AI 썸네일 저장 완료")
    else:
        print(f"   ❌ AI 썸네일 생성 실패: {nano_result.error}")

    print("\n✨ 하이브리드 수집 완료!")
    print("   실제 사진으로 신뢰성 확보 + AI 썸네일로 브랜딩")


async def fallback_strategy():
    """폴백 전략: 실제 사진 없으면 AI 생성"""

    print("\n=== 폴백 전략 ===")
    print("실제 사진 우선, 없으면 AI 생성\n")

    keywords = ["희귀한", "맛집", "숨은", "명소"]

    # 1. 실제 사진 시도
    print("1️⃣ 실제 사진 검색 시도...")

    places_collector = GooglePlacesCollector(
        api_key=os.getenv("GOOGLE_PLACES_API_KEY")
    )

    places_result = await places_collector.collect(
        keywords=keywords,
        max_images=1
    )

    if places_result.success and places_result.images:
        print("   ✅ 실제 사진 발견!")
        img = places_result.images[0]
        output_path = "output/fallback/real_photo.jpg"
        await places_collector.download(img['url'], output_path)
        print(f"   📸 저장 완료: {output_path}")

    else:
        # 2. AI 생성으로 폴백
        print("   ⚠️ 실제 사진 없음, AI 생성으로 폴백...")

        nano_generator = NanobananGenerator()

        nano_result = await nano_generator.collect(
            keywords=keywords,
            max_images=1,
            image_type="thumbnail",
            style="food"
        )

        if nano_result.success:
            img = nano_result.images[0]
            print("   ✅ AI 이미지 생성 완료")

            output_path = "output/fallback/ai_generated.png"
            nano_generator.save_image(img['data'], output_path)
            print(f"   🎨 저장 완료: {output_path}")
        else:
            print(f"   ❌ AI 생성도 실패: {nano_result.error}")


async def content_specific_generation():
    """콘텐츠별 맞춤 이미지 생성"""

    print("\n=== 콘텐츠별 맞춤 생성 ===")
    print("블로그 포스트 구조에 맞춘 다양한 이미지\n")

    nano_generator = NanobananGenerator()

    # 블로그 포스트 구조
    blog_post = {
        "title": "서울 맛집 TOP 5",
        "sections": [
            {"type": "header", "content": "서울 맛집"},
            {"type": "food", "content": "김치찌개 전문점"},
            {"type": "food", "content": "불고기 맛집"},
            {"type": "info", "content": "맛집 선택 팁"}
        ]
    }

    print(f"블로그 제목: {blog_post['title']}\n")

    # 1. 헤더용 배너
    print("1️⃣ 헤더 배너 생성...")
    result = await nano_generator.collect(
        keywords=["서울", "맛집", "음식"],
        image_type="banner",
        style="food"
    )

    if result.success:
        img = result.images[0]
        nano_generator.save_image(img['data'], "output/blog/header_banner.png")
        print("   ✅ 헤더 배너 저장")

    # 2. 섹션별 이미지
    for idx, section in enumerate(blog_post['sections'], 1):
        if section['type'] == 'food':
            print(f"\n{idx}️⃣ 푸드 포토: {section['content']}")

            result = await nano_generator.collect(
                keywords=[section['content']],
                image_type="food_photo",
                style="food"
            )

            if result.success:
                img = result.images[0]
                nano_generator.save_image(
                    img['data'],
                    f"output/blog/section_{idx}_food.png"
                )
                print(f"   ✅ 섹션 {idx} 이미지 저장")

        elif section['type'] == 'info':
            print(f"\n{idx}️⃣ 인포그래픽: {section['content']}")

            result = await nano_generator.collect(
                keywords=[section['content']],
                image_type="infographic",
                style="food"
            )

            if result.success:
                img = result.images[0]
                nano_generator.save_image(
                    img['data'],
                    f"output/blog/section_{idx}_info.png"
                )
                print(f"   ✅ 섹션 {idx} 인포그래픽 저장")

    print("\n✨ 블로그 포스트 이미지 세트 생성 완료!")


async def brand_consistent_images():
    """브랜드 일관성 있는 이미지 시리즈"""

    print("\n=== 브랜드 일관성 이미지 ===")
    print("동일한 스타일로 시리즈 생성\n")

    nano_generator = NanobananGenerator()

    # 브랜드 설정
    brand_style = "food"
    brand_color = "orange"

    topics = [
        "한식 맛집",
        "일식 레스토랑",
        "중식당 추천",
        "양식 맛집"
    ]

    print(f"브랜드 스타일: {brand_style}")
    print(f"브랜드 컬러: {brand_color}\n")

    for idx, topic in enumerate(topics, 1):
        print(f"{idx}. {topic} 썸네일 생성...")

        result = await nano_generator.collect(
            keywords=[topic],
            image_type="thumbnail",
            style=brand_style
        )

        if result.success:
            img = result.images[0]
            nano_generator.save_image(
                img['data'],
                f"output/brand/thumbnail_{idx:02d}.png"
            )
            print(f"   ✅ 저장 완료")

    print("\n✨ 브랜드 일관성 시리즈 완료!")


async def seo_optimized_images():
    """SEO 최적화 이미지 생성"""

    print("\n=== SEO 최적화 이미지 ===")
    print("검색 엔진 최적화를 고려한 이미지 생성\n")

    nano_generator = NanobananGenerator()

    # SEO 키워드
    seo_keywords = {
        "primary": "강남 맛집",
        "secondary": ["한식", "분위기 좋은", "데이트"],
        "location": "강남역"
    }

    # 조합된 키워드
    combined_keywords = [seo_keywords['primary']] + seo_keywords['secondary']

    print(f"주요 키워드: {seo_keywords['primary']}")
    print(f"보조 키워드: {', '.join(seo_keywords['secondary'])}\n")

    # 여러 형태의 썸네일 생성 (A/B 테스트용)
    variants = [
        {"style": "food", "name": "variant_food"},
        {"style": "lifestyle", "name": "variant_lifestyle"},
        {"style": "default", "name": "variant_default"}
    ]

    for variant in variants:
        print(f"스타일: {variant['style']} 생성...")

        result = await nano_generator.collect(
            keywords=combined_keywords,
            image_type="thumbnail",
            style=variant['style']
        )

        if result.success:
            img = result.images[0]
            nano_generator.save_image(
                img['data'],
                f"output/seo/{variant['name']}.png"
            )
            print(f"   ✅ {variant['name']}.png 저장")

    print("\n✨ SEO 최적화 이미지 세트 완료!")
    print("   각 변형을 A/B 테스트하여 최적 썸네일 선택 가능")


async def main():
    """모든 통합 예제 실행"""

    # 출력 디렉토리 생성
    for dir_name in ["hybrid", "fallback", "blog", "brand", "seo"]:
        os.makedirs(f"output/{dir_name}", exist_ok=True)

    print("나노바나나 통합 예제")
    print("=" * 60)

    # API 키 확인
    if not os.getenv("GOOGLE_API_KEY"):
        print("\n⚠️ GOOGLE_API_KEY 환경변수 필요")
        return

    try:
        # 각 예제 실행
        await hybrid_approach()
        await fallback_strategy()
        await content_specific_generation()
        await brand_consistent_images()
        await seo_optimized_images()

        print("\n" + "=" * 60)
        print("모든 통합 예제 완료!")

    except Exception as e:
        print(f"\n❌ 오류 발생: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    asyncio.run(main())
