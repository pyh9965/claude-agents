# Placers Module

자동 이미지 배치 및 HTML 삽입 모듈

## 개요

Placers 모듈은 블로그 콘텐츠에 이미지를 자동으로 배치하고 HTML 태그를 생성하여 삽입하는 기능을 제공합니다.

## 주요 컴포넌트

### 1. AutoPlacer - 자동 이미지 배치

HTML 콘텐츠를 분석하여 이미지를 배치할 최적의 위치를 찾습니다.

#### 주요 기능
- 섹션 헤더(h2, h3) 기반 위치 분석
- 요구사항과 섹션 자동 매칭
- 키워드 기반 위치 선정
- 이미지 간 최소 간격 유지
- SEO 친화적 alt text 자동 생성
- 배치 통계 및 유효성 검증

#### 사용 예제

```python
from placers import AutoPlacer

# AutoPlacer 초기화
placer = AutoPlacer(min_gap=300)  # 이미지 간 최소 300자 간격

# HTML 콘텐츠 분석
html_content = """
<article>
    <h2>여행지 소개</h2>
    <p>내용...</p>

    <h2>맛집 추천</h2>
    <p>내용...</p>
</article>
"""

# 삽입 가능한 위치 찾기
positions = placer.analyze_content(html_content)

for pos in positions:
    print(f"섹션: {pos.section_title}")
    print(f"위치: {pos.position}")
    print(f"컨텍스트: {pos.context}")

# 이미지 배치 계산
requirements = [
    {
        'id': 'req_1',
        'section_id': 'section_1',
        'keywords': ['여행', '풍경'],
        'entity_name': '제주도 풍경',
        'priority': 10
    }
]

collected_images = [
    {
        'id': 'jeju.jpg',
        'requirement_id': 'req_1',
        'source': 'unsplash',
        'attribution': 'Unsplash'
    }
]

placements = placer.calculate_placements(
    html_content,
    requirements,
    collected_images
)

# 배치 정보 확인
for p in placements:
    print(f"이미지: {p.image_id}")
    print(f"섹션: {p.position.section_title}")
    print(f"Alt: {p.alt_text}")
    print(f"Caption: {p.caption}")

# 통계
stats = placer.get_placement_statistics(placements)
print(f"총 배치: {stats['total_placements']}개")

# 유효성 검증
is_valid, errors = placer.validate_placements(placements, html_content)
if not is_valid:
    for error in errors:
        print(f"Error: {error}")
```

### 2. HtmlInserter - HTML 이미지 태그 삽입

반응형이고 SEO 최적화된 이미지 HTML을 생성하고 콘텐츠에 삽입합니다.

#### 주요 기능
- 반응형 이미지 태그 생성 (srcset)
- Lazy loading 지원
- SEO 친화적 alt text
- 캡션 및 출처 표시
- 이미지 갤러리 생성
- Before/After 비교 슬라이더
- 네이버 블로그 최적화
- HTML 유효성 검증

#### 사용 예제

```python
from placers import HtmlInserter

# HtmlInserter 초기화
inserter = HtmlInserter(
    image_base_url="https://cdn.example.com",
    use_srcset=True,
    lazy_loading=True
)

# 단일 이미지 HTML 생성
image_html = inserter.generate_image_html(
    src="images/photo.jpg",
    alt="제주도 풍경",
    caption="출처: Unsplash",
    width=800,
    height=600
)

print(image_html)
# Output:
# <figure class="blog-image" style="...">
#     <img src="images/photo.jpg" alt="제주도 풍경" ... />
#     <figcaption>출처: Unsplash</figcaption>
# </figure>

# HTML에 이미지 삽입
html_content = "<article><h2>제목</h2><p>내용</p></article>"

placements = [
    {
        'image_id': 'photo.jpg',
        'position': {'position': 20},
        'alt_text': '제주도 풍경',
        'caption': '출처: Unsplash'
    }
]

result_html = inserter.insert_images(
    html_content,
    placements,
    image_dir="images"
)

print(result_html)

# 썸네일 삽입
html_with_thumbnail = inserter.insert_thumbnail(
    html_content,
    thumbnail_src="thumbnail.jpg",
    alt="블로그 썸네일"
)

# 이미지 갤러리 생성
images = [
    {'src': 'img1.jpg', 'alt': '이미지 1', 'caption': '설명 1'},
    {'src': 'img2.jpg', 'alt': '이미지 2', 'caption': '설명 2'},
    {'src': 'img3.jpg', 'alt': '이미지 3', 'caption': '설명 3'},
    {'src': 'img4.jpg', 'alt': '이미지 4', 'caption': '설명 4'}
]

gallery_html = inserter.create_image_gallery(images, columns=2)

# Before/After 비교
before = {'src': 'before.jpg', 'alt': '개선 전'}
after = {'src': 'after.jpg', 'alt': '개선 후'}
comparison_html = inserter.create_comparison_slider(before, after)

# 네이버 블로그 최적화
optimized_html = inserter.optimize_for_naver_blog(html_content)

# HTML 유효성 검증
is_valid, warnings = inserter.validate_html(html_content)
if warnings:
    for warning in warnings:
        print(f"Warning: {warning}")

# 이미지 통계
stats = inserter.get_image_stats(html_content)
print(f"총 이미지: {stats['total_images']}개")
print(f"Alt 텍스트: {stats['with_alt']}개")
print(f"평균 Alt 길이: {stats['average_alt_length']:.1f}자")
```

### 3. 통합 사용 예제

AutoPlacer와 HtmlInserter를 함께 사용하는 전체 워크플로우:

```python
from placers import AutoPlacer, HtmlInserter

# 1. HTML 콘텐츠 준비
html_content = """
<article>
    <h1>제주도 여행 가이드</h1>
    <p>소개...</p>

    <h2>여행지 추천</h2>
    <p>내용...</p>

    <h2>맛집 정보</h2>
    <p>내용...</p>
</article>
"""

# 2. 이미지 요구사항
requirements = [
    {
        'id': 'req_1',
        'keywords': ['여행지', '풍경'],
        'entity_name': '제주도 풍경',
        'priority': 10
    },
    {
        'id': 'req_2',
        'keywords': ['맛집', '음식'],
        'entity_name': '제주 흑돼지',
        'priority': 8
    }
]

# 3. 수집된 이미지
collected_images = [
    {
        'id': 'landscape.jpg',
        'requirement_id': 'req_1',
        'attribution': 'Unsplash'
    },
    {
        'id': 'food.jpg',
        'requirement_id': 'req_2',
        'attribution': 'Pexels'
    }
]

# 4. AutoPlacer로 배치 계산
placer = AutoPlacer(min_gap=300)
placements = placer.calculate_placements(
    html_content,
    requirements,
    collected_images
)

# 5. 배치를 dict로 변환
placement_dicts = [
    {
        'image_id': p.image_id,
        'position': {'position': p.position.position},
        'alt_text': p.alt_text,
        'caption': p.caption
    }
    for p in placements
]

# 6. HtmlInserter로 이미지 삽입
inserter = HtmlInserter(
    image_base_url="https://blog-cdn.example.com",
    use_srcset=True,
    lazy_loading=True
)

final_html = inserter.insert_images(
    html_content,
    placement_dicts,
    image_dir="images"
)

# 7. 네이버 블로그 최적화
naver_html = inserter.optimize_for_naver_blog(final_html)

# 8. 결과 확인
stats = inserter.get_image_stats(final_html)
print(f"이미지 {stats['total_images']}개 삽입 완료!")

# 9. 유효성 검증
is_valid, errors = placer.validate_placements(placements, html_content)
if is_valid:
    print("배치 검증 통과!")
```

## 데이터 모델

### PlacementPosition
```python
@dataclass
class PlacementPosition:
    section_id: str         # 섹션 ID (section_1, section_2, ...)
    section_title: str      # 섹션 제목
    position: int          # HTML 문자 위치
    after_element: str     # 요소 태그 (h2, h3, p 등)
    context: str          # 주변 텍스트 (50자)
```

### ImagePlacement
```python
@dataclass
class ImagePlacement:
    image_id: str              # 이미지 ID
    requirement_id: str        # 요구사항 ID
    position: PlacementPosition  # 배치 위치
    alt_text: str             # SEO alt text
    caption: str              # 이미지 캡션
```

## 설정 옵션

### AutoPlacer
- `min_gap`: 이미지 간 최소 간격 (기본: 300자)

### HtmlInserter
- `image_base_url`: 이미지 기본 URL (CDN 등)
- `use_srcset`: srcset 사용 여부 (기본: True)
- `lazy_loading`: lazy loading 사용 여부 (기본: True)

## 테스트

```bash
# 전체 테스트 실행
python tests/test_placers_simple.py

# 개별 테스트
python -m pytest tests/test_placers_simple.py::test_auto_placer_basic -v
```

## 의존성

- beautifulsoup4: HTML 파싱
- Python 3.8+

## 라이선스

MIT License
