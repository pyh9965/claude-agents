"""Stock Image Collector 사용 예제"""

import asyncio
import os
import sys
from pathlib import Path

# Add src to path
sys.path.insert(0, str(Path(__file__).parent.parent / "src"))

from collectors.stock_images import StockImageCollector


async def example_basic_search():
    """기본 검색 예제"""
    print("\n=== 기본 검색 예제 ===")

    # Collector 초기화 (환경변수에서 API 키 자동 로드)
    collector = StockImageCollector()

    # 한국어 키워드로 검색
    keywords = ["김치찌개", "한식", "맛집"]
    result = await collector.collect(keywords, max_images=5)

    if result.success:
        print(f"✓ {len(result.images)}개 이미지 수집 성공")
        for i, img in enumerate(result.images, 1):
            print(f"{i}. [{img['source']}] {img['width']}x{img['height']}")
            print(f"   {img['attribution']}")
            print(f"   URL: {img['url']}")
    else:
        print(f"✗ 실패: {result.error}")

    await collector.close()


async def example_with_context_manager():
    """컨텍스트 매니저 사용 예제 (권장)"""
    print("\n=== 컨텍스트 매니저 사용 예제 ===")

    # 자동으로 리소스 정리
    async with StockImageCollector() as collector:
        # 여러 검색 수행
        searches = [
            ["파스타", "이탈리안"],
            ["커피", "카페"],
            ["스테이크", "레스토랑"]
        ]

        for keywords in searches:
            result = await collector.collect(keywords, max_images=3)
            print(f"\n검색어: {keywords}")
            if result.success:
                print(f"  → {len(result.images)}개 수집")
                for img in result.images:
                    print(f"     - [{img['source']}] {img['photographer']}")


async def example_download_images():
    """이미지 다운로드 예제"""
    print("\n=== 이미지 다운로드 예제 ===")

    async with StockImageCollector() as collector:
        # 이미지 검색
        result = await collector.collect(["Korean food"], max_images=3)

        if not result.success:
            print("검색 실패")
            return

        # 출력 디렉토리 생성
        output_dir = Path(__file__).parent / "downloads"
        output_dir.mkdir(exist_ok=True)

        # 각 이미지 다운로드
        for i, img in enumerate(result.images, 1):
            filename = f"korean_food_{i}.jpg"
            output_path = output_dir / filename

            print(f"{i}. 다운로드 중: {img['attribution']}")

            success = await collector.download(img['url'], str(output_path))

            if success:
                size = output_path.stat().st_size
                print(f"   ✓ 완료: {size:,} bytes → {filename}")
            else:
                print(f"   ✗ 실패")


async def example_custom_api_keys():
    """사용자 정의 API 키 사용 예제"""
    print("\n=== 사용자 정의 API 키 사용 예제 ===")

    # 환경변수 대신 직접 API 키 전달
    collector = StockImageCollector(
        unsplash_key="your-unsplash-key",
        pexels_key="your-pexels-key"
    )

    result = await collector.collect(["food"], max_images=3)

    if result.success:
        print(f"✓ {len(result.images)}개 수집")
    else:
        print(f"✗ 실패: {result.error}")

    await collector.close()


async def example_source_priority():
    """소스 우선순위 확인 예제"""
    print("\n=== 소스 우선순위 확인 예제 ===")
    print("Unsplash 우선 → Pexels Fallback 전략")

    async with StockImageCollector() as collector:
        result = await collector.collect(["food"], max_images=10)

        if result.success:
            # 소스별 카운트
            sources = {}
            for img in result.images:
                source = img['source']
                sources[source] = sources.get(source, 0) + 1

            print(f"총 {len(result.images)}개 수집:")
            for source, count in sources.items():
                print(f"  - {source}: {count}개")


async def example_korean_translation():
    """한국어 번역 확인 예제"""
    print("\n=== 한국어 번역 확인 예제 ===")

    collector = StockImageCollector()

    test_keywords = [
        ["김치찌개", "맛집"],
        ["서울", "카페"],
        ["규동"],
        ["파스타", "레스토랑"]
    ]

    for keywords in test_keywords:
        translated = await collector._translate_to_english(keywords)
        print(f"{keywords} → '{translated}'")

    await collector.close()


async def main():
    """모든 예제 실행"""
    print("=" * 60)
    print("Stock Image Collector 사용 예제")
    print("=" * 60)

    # 환경변수 확인
    has_unsplash = bool(os.getenv("UNSPLASH_ACCESS_KEY"))
    has_pexels = bool(os.getenv("PEXELS_API_KEY"))

    print(f"\nAPI 키 설정 상태:")
    print(f"  UNSPLASH_ACCESS_KEY: {'설정됨' if has_unsplash else '미설정'}")
    print(f"  PEXELS_API_KEY: {'설정됨' if has_pexels else '미설정'}")

    if not (has_unsplash or has_pexels):
        print("\n⚠ API 키가 설정되지 않았습니다.")
        print("환경변수를 설정하거나 코드에서 직접 전달하세요.")
        return

    # 예제 실행
    await example_basic_search()
    await example_with_context_manager()
    await example_korean_translation()
    await example_source_priority()
    # await example_download_images()  # 주석 해제하여 다운로드 테스트

    print("\n" + "=" * 60)


if __name__ == "__main__":
    asyncio.run(main())
