"""이미지 수집 테스트 스크립트"""
import asyncio
import sys
import os

# 프로젝트 경로 추가
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# 환경변수 설정
os.environ["GOOGLE_API_KEY"] = "AIzaSyDMKBbyKN5-Kg-eC3-rlBkYReQ76khP5_o"

async def test_collect():
    """SK 영현디파인 이미지 수집 테스트"""
    from src.collector.web_crawler import WebCrawler

    print("=" * 60)
    print("SK 영현디파인 이미지 수집 테스트")
    print("=" * 60)

    # 크롤러 생성
    crawler = WebCrawler(output_dir="output")

    # URL에서 이미지 수집
    url = "https://yh.skdefine.com/"
    print(f"\n수집 URL: {url}")
    print("수집 중...")

    try:
        result = await crawler.collect_and_download(url)

        print(f"\n✓ 단지명: {result.apartment_name}")
        print(f"✓ 수집된 이미지: {len(result.images)}개")
        print(f"✓ PDF 링크: {len(result.pdf_urls)}개")

        # 이미지 타입별 통계
        if result.images:
            type_counts = {}
            for img in result.images:
                type_counts[img.image_type] = type_counts.get(img.image_type, 0) + 1

            print("\n이미지 타입별 통계:")
            type_names = {
                "floor_plan": "평면도",
                "site_plan": "배치도",
                "aerial_view": "조감도",
                "location_map": "위치도",
                "other": "기타"
            }
            for img_type, count in type_counts.items():
                print(f"  - {type_names.get(img_type, img_type)}: {count}개")

            print("\n다운로드된 이미지:")
            for img in result.images[:5]:  # 처음 5개만 표시
                print(f"  - {img.local_path}")
            if len(result.images) > 5:
                print(f"  ... 외 {len(result.images) - 5}개")

        print(f"\n저장 위치: output/")
        print("=" * 60)

    except Exception as e:
        print(f"\n✗ 오류 발생: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_collect())
