"""Test script for ContentAnalyzer"""

import os
import sys
import logging
from pathlib import Path

# Add src to path
sys.path.insert(0, str(Path(__file__).parent / "src"))

from analyzers import ContentAnalyzer, EntityExtractor
from models import ImageRequirement

# 로깅 설정
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

# 테스트 HTML 콘텐츠
TEST_CONTENT = """
<h1>서울 이태원 맛집 탐방기</h1>

<p>안녕하세요! 오늘은 서울 용산구 이태원동에 위치한 멋진 카페를 소개해드릴게요.</p>

<h2>카페 ABC 소개</h2>
<p>
이태원역 2번 출구에서 도보 5분 거리에 위치한 <strong>카페 ABC</strong>는
아늑한 분위기와 맛있는 커피로 유명한 곳입니다.
넓은 창문을 통해 들어오는 자연광이 인상적이에요.
</p>

<h2>추천 메뉴</h2>
<p>
여기서 꼭 드셔봐야 할 메뉴는 <strong>시그니처 아메리카노</strong>입니다.
부드러운 크레마와 깊은 풍미가 일품이에요.
디저트로는 수제 티라미수를 강력 추천합니다!
</p>

<h3>가격 정보</h3>
<ul>
<li>아메리카노: 4,500원</li>
<li>카페라떼: 5,000원</li>
<li>티라미수: 6,500원</li>
</ul>

<h2>방문 팁</h2>
<p>
주말에는 사람이 많으니 평일 오후 2-4시 사이에 방문하시는 것을 추천드려요.
주차는 인근 공영주차장을 이용하시면 됩니다.
</p>

<h2>찾아가는 길</h2>
<p>
지하철 6호선 이태원역 2번 출구로 나와서 직진하시면 됩니다.
서울 용산구 이태원동 123-45번지에 위치해있어요.
</p>
"""


def test_entity_extractor():
    """EntityExtractor 테스트"""
    print("\n" + "="*60)
    print("Testing EntityExtractor")
    print("="*60 + "\n")

    extractor = EntityExtractor()

    # 엔티티 추출
    entities = extractor.extract_from_html(TEST_CONTENT)
    print(f"Content Type: {entities['content_type']}")
    print(f"\nLocations ({len(entities['locations'])}):")
    for loc in entities['locations']:
        print(f"  - {loc}")

    print(f"\nEntities ({len(entities['entities'])}):")
    for entity in entities['entities'][:10]:
        print(f"  - {entity}")

    # 섹션 추출
    sections = extractor.extract_sections(TEST_CONTENT)
    print(f"\nSections ({len(sections)}):")
    for section in sections:
        print(f"  - {section['id']}: {section['title']}")
        print(f"    Content length: {len(section['content'])} chars")


def test_content_analyzer():
    """ContentAnalyzer 테스트"""
    print("\n" + "="*60)
    print("Testing ContentAnalyzer")
    print("="*60 + "\n")

    # API 키 확인
    api_key = os.getenv("GOOGLE_API_KEY")
    if not api_key:
        print("WARNING: GOOGLE_API_KEY not found in environment variables")
        print("Skipping AI model test")
        return

    try:
        # ContentAnalyzer 초기화
        analyzer = ContentAnalyzer(
            api_key=api_key,
            model="gemini-2.0-flash"
        )

        print(f"Initialized ContentAnalyzer with model: {analyzer.model_name}")

        # 콘텐츠 분석
        print("\nAnalyzing content...")
        requirements = analyzer.analyze_content(TEST_CONTENT, content_type="html")

        print(f"\nGenerated {len(requirements)} image requirements:\n")

        for req in requirements:
            print(f"ID: {req.id}")
            print(f"  Type: {req.type.value}")
            print(f"  Keywords: {', '.join(req.keywords)}")
            print(f"  Prompt: {req.prompt[:80]}..." if len(req.prompt) > 80 else f"  Prompt: {req.prompt}")
            print(f"  Section: {req.section_id}")
            print(f"  Priority: {req.priority}")
            print(f"  Preferred Source: {req.preferred_source.value}")
            if req.entity_name:
                print(f"  Entity: {req.entity_name}")
            if req.entity_location:
                print(f"  Location: {req.entity_location}")
            print()

        # 결과 저장
        output_path = Path(__file__).parent / "output" / "test_requirements.json"
        analyzer.save_requirements(requirements, str(output_path))
        print(f"Results saved to: {output_path}")

    except Exception as e:
        print(f"ERROR: {e}")
        import traceback
        traceback.print_exc()


def main():
    """메인 함수"""
    print("Blog Image Collection Agent - Analyzer Test")
    print("=" * 60)

    # EntityExtractor 테스트
    test_entity_extractor()

    # ContentAnalyzer 테스트 (API 키가 있는 경우)
    test_content_analyzer()

    print("\n" + "="*60)
    print("Test completed!")
    print("="*60)


if __name__ == "__main__":
    main()
