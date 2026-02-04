"""
AutoPlacer 및 HtmlInserter 테스트
"""
import sys
from pathlib import Path

# 프로젝트 루트를 Python 경로에 추가
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from src.placers import AutoPlacer, HtmlInserter


def test_auto_placer_basic():
    """AutoPlacer 기본 동작 테스트"""
    print("\n=== AutoPlacer 기본 동작 테스트 ===")

    # 샘플 HTML 콘텐츠
    html_content = """
<article>
    <h1>블로그 제목</h1>
    <p>블로그 소개 내용입니다.</p>

    <h2>첫 번째 섹션</h2>
    <p>첫 번째 섹션의 내용입니다. 여기에 관련된 이미지가 필요합니다.</p>

    <h2>두 번째 섹션</h2>
    <p>두 번째 섹션의 내용입니다. 이 섹션도 이미지가 필요합니다.</p>

    <h3>서브 섹션</h3>
    <p>서브 섹션의 내용입니다.</p>
</article>
"""

    placer = AutoPlacer(min_gap=100)

    # 콘텐츠 분석
    positions = placer.analyze_content(html_content)

    print(f"\n발견된 삽입 위치: {len(positions)}개")
    for i, pos in enumerate(positions, 1):
        print(f"\n위치 {i}:")
        print(f"  섹션 ID: {pos.section_id}")
        print(f"  섹션 제목: {pos.section_title}")
        print(f"  위치: {pos.position}")
        print(f"  요소: {pos.after_element}")
        print(f"  컨텍스트: {pos.context[:30]}...")


def test_auto_placer_with_requirements():
    """AutoPlacer 요구사항 매칭 테스트"""
    print("\n\n=== AutoPlacer 요구사항 매칭 테스트 ===")

    html_content = """
<article>
    <h2>맛집 소개</h2>
    <p>맛집에 대한 설명입니다.</p>

    <h2>메뉴 추천</h2>
    <p>추천 메뉴 설명입니다.</p>

    <h2>가격 정보</h2>
    <p>가격 안내입니다.</p>
</article>
"""

    # 이미지 요구사항
    requirements = [
        {
            'id': 'req_1',
            'section_id': 'section_1',
            'keywords': ['맛집', '음식'],
            'entity_name': '서울 맛집',
            'priority': 10
        },
        {
            'id': 'req_2',
            'section_id': 'section_2',
            'keywords': ['메뉴'],
            'entity_name': '추천 메뉴',
            'priority': 8
        }
    ]

    # 수집된 이미지
    collected_images = [
        {
            'id': 'img_001.jpg',
            'requirement_id': 'req_1',
            'source': 'unsplash',
            'attribution': 'Unsplash'
        },
        {
            'id': 'img_002.jpg',
            'requirement_id': 'req_2',
            'source': 'pexels',
            'attribution': 'Pexels'
        }
    ]

    placer = AutoPlacer()
    placements = placer.calculate_placements(
        html_content,
        requirements,
        collected_images
    )

    print(f"\n계산된 배치: {len(placements)}개")
    for i, placement in enumerate(placements, 1):
        print(f"\n배치 {i}:")
        print(f"  이미지 ID: {placement.image_id}")
        print(f"  요구사항 ID: {placement.requirement_id}")
        print(f"  섹션: {placement.position.section_title}")
        print(f"  Alt Text: {placement.alt_text}")
        print(f"  Caption: {placement.caption}")

    # 통계 정보
    stats = placer.get_placement_statistics(placements)
    print(f"\n배치 통계:")
    print(f"  총 배치: {stats['total_placements']}개")
    print(f"  사용된 섹션: {stats['sections_used']}개")

    # 유효성 검증
    is_valid, errors = placer.validate_placements(placements, html_content)
    print(f"\n유효성 검증: {'통과' if is_valid else '실패'}")
    if errors:
        for error in errors:
            print(f"  - {error}")


def test_html_inserter_basic():
    """HtmlInserter 기본 동작 테스트"""
    print("\n\n=== HtmlInserter 기본 동작 테스트 ===")

    inserter = HtmlInserter(
        image_base_url="https://cdn.example.com",
        use_srcset=True,
        lazy_loading=True
    )

    # 단일 이미지 HTML 생성
    image_html = inserter.generate_image_html(
        src="images/test.jpg",
        alt="테스트 이미지",
        caption="이미지 캡션입니다",
        width=800,
        height=600
    )

    print("\n생성된 이미지 HTML:")
    print(image_html)


def test_html_inserter_insertion():
    """HtmlInserter 삽입 테스트"""
    print("\n\n=== HtmlInserter 삽입 테스트 ===")

    html_content = """<article>
    <h2>첫 번째 섹션</h2>
    <p>첫 번째 섹션 내용입니다.</p>

    <h2>두 번째 섹션</h2>
    <p>두 번째 섹션 내용입니다.</p>
</article>"""

    # 배치 정보 (AutoPlacer 결과를 dict로 변환한 형태)
    placements = [
        {
            'image_id': 'image1.jpg',
            'requirement_id': 'req_1',
            'position': {
                'section_id': 'section_1',
                'section_title': '첫 번째 섹션',
                'position': 50,  # h2 태그 다음 위치
                'after_element': 'h2',
                'context': '첫 번째 섹션 내용입니다.'
            },
            'alt_text': '첫 번째 섹션 이미지',
            'caption': '출처: Unsplash'
        }
    ]

    inserter = HtmlInserter()
    result = inserter.insert_images(html_content, placements, image_dir="images")

    print("\n이미지 삽입 후 HTML:")
    print(result)


def test_html_inserter_gallery():
    """HtmlInserter 갤러리 생성 테스트"""
    print("\n\n=== HtmlInserter 갤러리 생성 테스트 ===")

    inserter = HtmlInserter()

    images = [
        {'src': 'image1.jpg', 'alt': '이미지 1', 'caption': '첫 번째 이미지'},
        {'src': 'image2.jpg', 'alt': '이미지 2', 'caption': '두 번째 이미지'},
        {'src': 'image3.jpg', 'alt': '이미지 3', 'caption': '세 번째 이미지'},
        {'src': 'image4.jpg', 'alt': '이미지 4', 'caption': '네 번째 이미지'}
    ]

    gallery_html = inserter.create_image_gallery(images, columns=2)

    print("\n갤러리 HTML:")
    print(gallery_html)


def test_html_inserter_comparison():
    """HtmlInserter 비교 슬라이더 테스트"""
    print("\n\n=== HtmlInserter 비교 슬라이더 테스트 ===")

    inserter = HtmlInserter()

    before = {'src': 'before.jpg', 'alt': '개선 전'}
    after = {'src': 'after.jpg', 'alt': '개선 후'}

    slider_html = inserter.create_comparison_slider(before, after)

    print("\n비교 슬라이더 HTML:")
    print(slider_html)


def test_html_validation():
    """HTML 유효성 검증 테스트"""
    print("\n\n=== HTML 유효성 검증 테스트 ===")

    inserter = HtmlInserter()

    # 유효한 HTML
    valid_html = '''
<article>
    <figure>
        <img src="test.jpg" alt="테스트 이미지" loading="lazy">
        <figcaption>캡션</figcaption>
    </figure>
</article>
'''

    # 유효하지 않은 HTML (alt 없음)
    invalid_html = '''
<article>
    <figure>
        <img src="test.jpg">
        <figcaption>캡션</figcaption>
    </figure>
</article>
'''

    is_valid, warnings = inserter.validate_html(valid_html)
    print(f"\n유효한 HTML 검증: {'통과' if is_valid else '실패'}")
    if warnings:
        for warning in warnings:
            print(f"  - {warning}")

    is_valid, warnings = inserter.validate_html(invalid_html)
    print(f"\n유효하지 않은 HTML 검증: {'통과' if is_valid else '실패'}")
    if warnings:
        for warning in warnings:
            print(f"  - {warning}")


def test_integration():
    """AutoPlacer와 HtmlInserter 통합 테스트"""
    print("\n\n=== 통합 테스트: AutoPlacer + HtmlInserter ===")

    # HTML 콘텐츠
    html_content = """<article>
    <h1>여행 블로그</h1>
    <p>여행 소개 내용입니다.</p>

    <h2>여행지 소개</h2>
    <p>여행지에 대한 상세한 설명이 들어갑니다. 아름다운 풍경과 다양한 볼거리가 있습니다.</p>

    <h2>맛집 추천</h2>
    <p>현지 맛집 정보를 공유합니다. 현지인들이 자주 찾는 숨은 맛집들을 소개합니다.</p>

    <h2>여행 팁</h2>
    <p>여행 시 유용한 팁들을 정리했습니다.</p>
</article>"""

    # 요구사항
    requirements = [
        {
            'id': 'req_1',
            'section_id': 'section_1',
            'keywords': ['여행지', '풍경'],
            'entity_name': '제주도 풍경',
            'priority': 10
        },
        {
            'id': 'req_2',
            'section_id': 'section_2',
            'keywords': ['맛집', '음식'],
            'entity_name': '제주 맛집',
            'priority': 8
        }
    ]

    # 수집된 이미지
    collected_images = [
        {
            'id': 'jeju_landscape.jpg',
            'requirement_id': 'req_1',
            'source': 'unsplash',
            'attribution': 'Unsplash'
        },
        {
            'id': 'jeju_food.jpg',
            'requirement_id': 'req_2',
            'source': 'pexels',
            'attribution': 'Pexels'
        }
    ]

    # 1. AutoPlacer로 배치 계산
    placer = AutoPlacer()
    placements = placer.calculate_placements(
        html_content,
        requirements,
        collected_images
    )

    print(f"\n계산된 배치: {len(placements)}개")

    # 배치를 dict로 변환
    placement_dicts = []
    for p in placements:
        placement_dicts.append({
            'image_id': p.image_id,
            'requirement_id': p.requirement_id,
            'position': {
                'section_id': p.position.section_id,
                'section_title': p.position.section_title,
                'position': p.position.position,
                'after_element': p.position.after_element,
                'context': p.position.context
            },
            'alt_text': p.alt_text,
            'caption': p.caption
        })

    # 2. HtmlInserter로 이미지 삽입
    inserter = HtmlInserter(
        image_base_url="https://blog-cdn.example.com",
        use_srcset=True,
        lazy_loading=True
    )

    result_html = inserter.insert_images(
        html_content,
        placement_dicts,
        image_dir="images"
    )

    print("\n최종 HTML (이미지 삽입 완료):")
    print(result_html)

    # 3. 통계 확인
    stats = inserter.get_image_stats(result_html)
    print(f"\n이미지 통계:")
    print(f"  총 이미지: {stats['total_images']}개")
    print(f"  Alt 텍스트 있음: {stats['with_alt']}개")
    print(f"  캡션 있음: {stats['with_caption']}개")
    print(f"  Lazy loading: {stats['lazy_loading']}개")
    print(f"  평균 Alt 텍스트 길이: {stats['average_alt_length']:.1f}자")


if __name__ == "__main__":
    print("=" * 80)
    print("Blog Image Agent - Placers 테스트")
    print("=" * 80)

    try:
        test_auto_placer_basic()
        test_auto_placer_with_requirements()
        test_html_inserter_basic()
        test_html_inserter_insertion()
        test_html_inserter_gallery()
        test_html_inserter_comparison()
        test_html_validation()
        test_integration()

        print("\n" + "=" * 80)
        print("모든 테스트 완료!")
        print("=" * 80)

    except Exception as e:
        print(f"\n테스트 실패: {e}")
        import traceback
        traceback.print_exc()
