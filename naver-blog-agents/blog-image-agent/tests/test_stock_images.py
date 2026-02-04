"""Stock Image Collector Tests"""

import asyncio
import os
import sys
from pathlib import Path

# Add src to path
sys.path.insert(0, str(Path(__file__).parent.parent / "src"))

from collectors.stock_images import StockImageCollector


async def test_translate_to_english():
    """한국어 번역 테스트"""
    print("\n=== 한국어 → 영어 번역 테스트 ===")

    collector = StockImageCollector()

    test_cases = [
        (["김치찌개"], "kimchi stew"),
        (["삼겹살", "맛집"], "Korean BBQ pork belly restaurant"),
        (["서울", "카페"], "Seoul cafe"),
        (["규동"], "gyudon beef bowl"),
        (["파스타", "레스토랑"], "pasta restaurant"),
    ]

    for korean_kw, expected in test_cases:
        result = await collector._translate_to_english(korean_kw)
        status = "✓" if result == expected else "✗"
        print(f"{status} {korean_kw} → '{result}' (예상: '{expected}')")

    await collector.close()


async def test_search_unsplash():
    """Unsplash 검색 테스트"""
    print("\n=== Unsplash 검색 테스트 ===")

    # API 키 확인
    api_key = os.getenv("UNSPLASH_ACCESS_KEY")
    if not api_key:
        print("⚠ UNSPLASH_ACCESS_KEY 환경변수 없음 - 테스트 스킵")
        return

    collector = StockImageCollector()

    # 검색 테스트
    images = await collector.search_unsplash("Korean food", per_page=3)

    if images:
        print(f"✓ {len(images)}개 이미지 검색 성공")
        for i, img in enumerate(images, 1):
            print(f"  {i}. {img['width']}x{img['height']} - {img['photographer']}")
            print(f"     {img['url'][:60]}...")
    else:
        print("✗ 이미지 검색 실패")

    await collector.close()


async def test_search_pexels():
    """Pexels 검색 테스트"""
    print("\n=== Pexels 검색 테스트 ===")

    # API 키 확인
    api_key = os.getenv("PEXELS_API_KEY")
    if not api_key:
        print("⚠ PEXELS_API_KEY 환경변수 없음 - 테스트 스킵")
        return

    collector = StockImageCollector()

    # 검색 테스트
    images = await collector.search_pexels("Korean food", per_page=3)

    if images:
        print(f"✓ {len(images)}개 이미지 검색 성공")
        for i, img in enumerate(images, 1):
            print(f"  {i}. {img['width']}x{img['height']} - {img['photographer']}")
            print(f"     {img['url'][:60]}...")
    else:
        print("✗ 이미지 검색 실패")

    await collector.close()


async def test_collect():
    """통합 수집 테스트"""
    print("\n=== 통합 수집 테스트 (Unsplash + Pexels Fallback) ===")

    # API 키 확인
    has_unsplash = bool(os.getenv("UNSPLASH_ACCESS_KEY"))
    has_pexels = bool(os.getenv("PEXELS_API_KEY"))

    if not (has_unsplash or has_pexels):
        print("⚠ API 키 없음 - 테스트 스킵")
        print("  환경변수 설정 필요: UNSPLASH_ACCESS_KEY 또는 PEXELS_API_KEY")
        return

    print(f"API 키: Unsplash={'✓' if has_unsplash else '✗'}, Pexels={'✓' if has_pexels else '✗'}")

    collector = StockImageCollector()

    # 테스트 케이스
    test_cases = [
        ["김치찌개", "한식"],
        ["파스타", "레스토랑"],
        ["커피", "카페"],
    ]

    for keywords in test_cases:
        print(f"\n검색어: {keywords}")
        result = await collector.collect(keywords, max_images=3)

        if result.success:
            print(f"  ✓ {len(result.images)}개 이미지 수집 성공")
            for i, img in enumerate(result.images, 1):
                print(f"    {i}. [{img['source']}] {img['width']}x{img['height']}")
                print(f"       {img['attribution']}")
        else:
            print(f"  ✗ 수집 실패: {result.error}")

    await collector.close()


async def test_download():
    """이미지 다운로드 테스트"""
    print("\n=== 이미지 다운로드 테스트 ===")

    # API 키 확인
    if not (os.getenv("UNSPLASH_ACCESS_KEY") or os.getenv("PEXELS_API_KEY")):
        print("⚠ API 키 없음 - 테스트 스킵")
        return

    collector = StockImageCollector()

    # 이미지 검색
    result = await collector.collect(["coffee"], max_images=1)

    if not result.success or not result.images:
        print("✗ 테스트용 이미지 검색 실패")
        await collector.close()
        return

    # 다운로드 테스트
    img = result.images[0]
    output_dir = Path(__file__).parent / "test_output"
    output_path = output_dir / "test_download.jpg"

    print(f"다운로드 URL: {img['url'][:60]}...")

    success = await collector.download(img['url'], str(output_path))

    if success and output_path.exists():
        size = output_path.stat().st_size
        print(f"✓ 다운로드 성공: {size:,} bytes")
        print(f"  저장 위치: {output_path}")

        # 정리
        output_path.unlink()
        output_dir.rmdir()
        print("  (테스트 파일 삭제됨)")
    else:
        print("✗ 다운로드 실패")

    await collector.close()


async def test_context_manager():
    """컨텍스트 매니저 테스트"""
    print("\n=== 컨텍스트 매니저 테스트 ===")

    if not (os.getenv("UNSPLASH_ACCESS_KEY") or os.getenv("PEXELS_API_KEY")):
        print("⚠ API 키 없음 - 테스트 스킵")
        return

    async with StockImageCollector() as collector:
        result = await collector.collect(["food"], max_images=2)
        if result.success:
            print(f"✓ 컨텍스트 매니저 정상 작동: {len(result.images)}개 수집")
        else:
            print("✗ 수집 실패")


async def main():
    """전체 테스트 실행"""
    print("=" * 60)
    print("Stock Image Collector 테스트")
    print("=" * 60)

    await test_translate_to_english()
    await test_search_unsplash()
    await test_search_pexels()
    await test_collect()
    await test_download()
    await test_context_manager()

    print("\n" + "=" * 60)
    print("테스트 완료")
    print("=" * 60)


if __name__ == "__main__":
    asyncio.run(main())
