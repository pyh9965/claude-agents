"""Basic usage example for Blog Image Collection Agent"""

import os
import sys
import logging
from pathlib import Path

# Add src to path
sys.path.insert(0, str(Path(__file__).parent.parent / "src"))

from analyzers import ContentAnalyzer, EntityExtractor
from models import ImageRequirement, ImageType, PreferredSource

# 로깅 설정
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)

logger = logging.getLogger(__name__)


def example_1_entity_extraction():
    """Example 1: HTML에서 엔티티 추출"""
    print("\n" + "="*60)
    print("Example 1: Entity Extraction")
    print("="*60 + "\n")

    html = """
    <h1>제주도 여행 가이드</h1>
    <h2>성산일출봉 방문기</h2>
    <p><strong>성산일출봉</strong>은 제주도 서귀포시에 위치한 UNESCO 세계자연유산입니다.</p>
    <h2>맛집 추천</h2>
    <p>근처의 <strong>해녀의 집</strong>에서 신선한 해산물을 맛보세요.</p>
    """

    extractor = EntityExtractor()

    # 엔티티 추출
    entities = extractor.extract_from_html(html)
    print(f"Content Type: {entities['content_type']}")
    print(f"Locations: {entities['locations']}")
    print(f"Entities: {entities['entities']}")

    # 섹션 분할
    sections = extractor.extract_sections(html)
    print(f"\nSections: {len(sections)}")
    for section in sections:
        print(f"  - {section['id']}: {section['title']}")


def example_2_content_analysis():
    """Example 2: AI 기반 콘텐츠 분석"""
    print("\n" + "="*60)
    print("Example 2: Content Analysis with AI")
    print("="*60 + "\n")

    # API 키 확인
    api_key = os.getenv("GOOGLE_API_KEY")
    if not api_key:
        print("WARNING: GOOGLE_API_KEY not found. Skipping this example.")
        return

    html = """
    <h1>홍대 브런치 카페 TOP 3</h1>

    <h2>1. 카페 모닝글로리</h2>
    <p>서울 마포구 홍익로에 위치한 브런치 전문점입니다.</p>
    <p><strong>시그니처 메뉴</strong>: 에그베네딕트, 아보카도 토스트</p>

    <h2>2. 선샤인 베이커리</h2>
    <p>갓 구운 빵과 함께하는 브런치를 즐길 수 있어요.</p>
    <p>추천 메뉴: <strong>크로와상 샌드위치</strong></p>

    <h2>3. 더 가든 카페</h2>
    <p>루프탑 정원이 있는 감성 카페입니다.</p>
    """

    analyzer = ContentAnalyzer(
        api_key=api_key,
        model="gemini-2.0-flash"
    )

    # 콘텐츠 분석
    requirements = analyzer.analyze_content(html, content_type="html")

    print(f"Generated {len(requirements)} image requirements:\n")
    for req in requirements:
        print(f"[{req.id}] {req.type.value}")
        print(f"  Keywords: {', '.join(req.keywords[:3])}")
        print(f"  Priority: {req.priority}/10")
        print(f"  Preferred Source: {req.preferred_source.value}")
        if req.entity_name:
            print(f"  Entity: {req.entity_name}")
        print()


def example_3_batch_analysis():
    """Example 3: 여러 콘텐츠 배치 분석"""
    print("\n" + "="*60)
    print("Example 3: Batch Content Analysis")
    print("="*60 + "\n")

    api_key = os.getenv("GOOGLE_API_KEY")
    if not api_key:
        print("WARNING: GOOGLE_API_KEY not found. Skipping this example.")
        return

    contents = [
        {
            'id': 'post_001',
            'content': '<h1>서울 야경 명소</h1><h2>남산타워</h2><p>서울의 대표 야경 스팟</p>'
        },
        {
            'id': 'post_002',
            'content': '<h1>홈카페 만들기</h1><h2>필요한 장비</h2><p>에스프레소 머신, 그라인더</p>'
        }
    ]

    analyzer = ContentAnalyzer(api_key=api_key)
    results = analyzer.analyze_batch(contents, content_type="html")

    for content_id, requirements in results.items():
        print(f"\n{content_id}: {len(requirements)} images")
        for req in requirements[:2]:  # 처음 2개만 출력
            print(f"  - {req.id}: {req.type.value} ({', '.join(req.keywords[:2])})")


def example_4_manual_requirements():
    """Example 4: ImageRequirement 수동 생성"""
    print("\n" + "="*60)
    print("Example 4: Manual Image Requirements")
    print("="*60 + "\n")

    # 수동으로 이미지 요구사항 생성
    requirements = [
        ImageRequirement(
            id="img_001",
            type=ImageType.THUMBNAIL,
            keywords=["여행", "제주도", "바다"],
            prompt="beautiful beach with clear blue water and volcanic rocks, Jeju Island Korea",
            section_id="header",
            priority=10,
            preferred_source=PreferredSource.REAL,
            entity_name="제주도 해변",
            entity_location="제주도 서귀포시"
        ),
        ImageRequirement(
            id="img_002",
            type=ImageType.CONTENT,
            keywords=["카페", "커피", "라떼아트"],
            prompt="latte art coffee in white cup on wooden table, cafe interior",
            section_id="section_1",
            priority=7,
            preferred_source=PreferredSource.STOCK,
            entity_name="카페라떼",
            entity_location=None
        )
    ]

    print(f"Created {len(requirements)} image requirements:\n")
    for req in requirements:
        req_dict = req.to_dict()
        print(f"{req.id}:")
        for key, value in req_dict.items():
            if key not in ['id']:
                print(f"  {key}: {value}")
        print()


def example_5_save_and_load():
    """Example 5: 요구사항 저장 및 로드"""
    print("\n" + "="*60)
    print("Example 5: Save and Load Requirements")
    print("="*60 + "\n")

    # 요구사항 생성
    requirements = [
        ImageRequirement(
            id="img_001",
            type=ImageType.BANNER,
            keywords=["봄", "벚꽃", "서울"],
            prompt="cherry blossoms in full bloom, Seoul spring, beautiful pink flowers",
            section_id="header",
            priority=9,
            preferred_source=PreferredSource.STOCK
        )
    ]

    # 저장
    output_dir = Path(__file__).parent.parent / "output"
    output_dir.mkdir(exist_ok=True)
    output_path = output_dir / "example_requirements.json"

    api_key = os.getenv("GOOGLE_API_KEY")
    if api_key:
        analyzer = ContentAnalyzer(api_key=api_key)
        analyzer.save_requirements(requirements, str(output_path))
        print(f"Saved to: {output_path}")

        # 파일 확인
        if output_path.exists():
            print(f"File size: {output_path.stat().st_size} bytes")
    else:
        print("WARNING: GOOGLE_API_KEY not found. Skipping save.")


def main():
    """메인 함수"""
    print("Blog Image Collection Agent - Usage Examples")
    print("=" * 60)

    examples = [
        example_1_entity_extraction,
        example_2_content_analysis,
        example_3_batch_analysis,
        example_4_manual_requirements,
        example_5_save_and_load,
    ]

    for i, example in enumerate(examples, 1):
        try:
            example()
        except Exception as e:
            logger.error(f"Example {i} failed: {e}", exc_info=True)

    print("\n" + "="*60)
    print("All examples completed!")
    print("="*60)


if __name__ == "__main__":
    main()
