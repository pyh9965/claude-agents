# Blog Image Collection Agent - Usage Examples

블로그 이미지 수집 에이전트의 다양한 사용 예제를 제공합니다.

## 기본 사용법

### 1. 간편 사용 (Quick Start)

```python
import asyncio
from blog_image_agent import collect_images

async def main():
    # HTML 콘텐츠 읽기
    with open("my_blog.html", encoding="utf-8") as f:
        html_content = f.read()

    # 이미지 수집 실행
    result = await collect_images(html_content, "output")

    # 결과 확인
    print(f"총 수집된 이미지: {result.statistics.total}개")
    print(f"소스별 통계: {result.statistics.by_source}")

    # 수집된 이미지 목록
    for img in result.images:
        print(f"- {img.alt_text}: {img.local_path}")

asyncio.run(main())
```

### 2. 상세 설정 사용

```python
import asyncio
from blog_image_agent import PipelineOrchestrator, PipelineConfig

async def main():
    # 파이프라인 설정
    config = PipelineConfig(
        output_dir="output/blog_images",
        collection_priority=["google", "stock", "nanobanana"],
        convert_to_webp=True,
        image_quality=85,
        min_image_width=800,
        min_image_height=600,
        cache_enabled=True,
        cache_ttl_days=7
    )

    # HTML 콘텐츠
    html = open("blog_post.html", encoding="utf-8").read()

    # 오케스트레이터 초기화
    orchestrator = PipelineOrchestrator(config)

    # 파이프라인 실행
    result = await orchestrator.run(html, "output")

    # 결과 저장
    result.save_json("output/result.json")

    # 정리
    await orchestrator.close()

asyncio.run(main())
```

## 모듈별 사용 예제

### ContentAnalyzer - 콘텐츠 분석

```python
from blog_image_agent import ContentAnalyzer
import os

# 환경 변수에서 API 키 자동 로드 (.env 파일 사용)
analyzer = ContentAnalyzer()

# 또는 직접 API 키 지정
analyzer = ContentAnalyzer(
    api_key="your-google-api-key",
    model="gemini-2.0-flash"
)

# HTML 콘텐츠 분석
html_content = """
<h1>서울 최고의 맛집 베스트 5</h1>
<h2>1. 강남 이탈리안 레스토랑</h2>
<p>강남역 근처에 위치한 정통 이탈리안...</p>
<h2>2. 홍대 브런치 카페</h2>
<p>홍대입구에서 도보 5분...</p>
"""

requirements = analyzer.analyze_content(html_content, content_type="html")

# 결과 확인
for req in requirements:
    print(f"{req.id}: {req.type.value}")
    print(f"  키워드: {req.keywords}")
    print(f"  AI 프롬프트: {req.prompt}")
    print(f"  우선순위: {req.priority}")
    print(f"  선호 소스: {req.preferred_source.value}")
    if req.entity_name:
        print(f"  엔티티: {req.entity_name}")
    print()

# 결과 저장
analyzer.save_requirements(requirements, "output/requirements.json")
```

### Image Collectors - 이미지 수집

#### Google Places Collector

```python
import asyncio
from blog_image_agent.collectors import GooglePlacesCollector

async def main():
    collector = GooglePlacesCollector(api_key="your-google-api-key")

    # 장소 검색 (장소명 + 위치)
    result = await collector.collect_by_place(
        place_name="카페 ABC",
        location="서울 강남구 테헤란로"
    )

    if result.success:
        for img_data in result.images:
            print(f"URL: {img_data['url']}")
            print(f"크기: {img_data['width']}x{img_data['height']}")

            # 다운로드
            await collector.download(img_data['url'], "output/place.jpg")

asyncio.run(main())
```

#### Stock Images Collector

```python
import asyncio
from blog_image_agent.collectors import StockImageCollector

async def main():
    collector = StockImageCollector(
        unsplash_key="your-unsplash-key",
        pexels_key="your-pexels-key"
    )

    # 키워드로 검색
    result = await collector.collect(
        keywords=["korean food", "kimchi", "traditional"],
        max_images=5
    )

    if result.success:
        for i, img_data in enumerate(result.images):
            url = img_data['url']
            attribution = img_data['attribution']

            print(f"{i+1}. {url}")
            print(f"   출처: {attribution}")

            # 다운로드
            await collector.download(url, f"output/stock_{i}.jpg")

asyncio.run(main())
```

#### AI Image Generator (Nanobanana)

```python
import asyncio
from blog_image_agent.collectors import NanobananGenerator
from blog_image_agent import ImageType

async def main():
    generator = NanobananGenerator(api_key="your-google-api-key")

    # AI 이미지 생성
    result = await generator.generate(
        prompt="A delicious Korean kimchi stew bubbling in a stone pot, "
               "garnished with green onions, traditional restaurant setting",
        image_type=ImageType.FOOD_PHOTO,
        aspect_ratio="4:3"
    )

    if result.success:
        print(f"생성 완료: {result.local_path}")
        print(f"크기: {result.width}x{result.height}")

asyncio.run(main())
```

### Image Processors - 이미지 처리

#### Quality Validator - 품질 검증

```python
from blog_image_agent.processors import QualityValidator

# 검증기 초기화
validator = QualityValidator(
    min_width=800,
    min_height=600,
    min_file_size=10000,
    blur_threshold=100.0
)

# 이미지 검증
report = validator.validate("output/image.jpg")

print(f"유효: {report.valid}")
print(f"해상도: {report.width}x{report.height}")
print(f"파일 크기: {report.file_size} bytes")
print(f"블러 여부: {report.is_blurry} (score: {report.blur_score:.1f})")
print(f"품질 점수: {report.quality_score}/100")

if report.issues:
    print("문제점:")
    for issue in report.issues:
        print(f"  - {issue}")

# 배치 검증
valid_images = validator.filter_valid_images([
    "output/img1.jpg",
    "output/img2.jpg",
    "output/img3.jpg"
])
print(f"유효한 이미지: {len(valid_images)}개")
```

#### Image Optimizer - 이미지 최적화

```python
from blog_image_agent.processors import ImageOptimizer

# 최적화기 초기화
optimizer = ImageOptimizer(
    max_width=1200,
    max_height=1200,
    quality=85,
    convert_to_webp=True
)

# 단일 이미지 최적화
result = optimizer.optimize(
    input_path="input/photo.jpg",
    output_path="output/photo.webp",
    target_size="thumbnail"  # 1200x630
)

if result.success:
    print(f"원본: {result.original_dimensions} ({result.original_size} bytes)")
    print(f"최적화: {result.new_dimensions} ({result.optimized_size} bytes)")
    print(f"압축률: {result.compression_ratio:.1f}%")

# 배치 최적화
results = optimizer.batch_optimize(
    image_paths=["img1.jpg", "img2.jpg", "img3.jpg"],
    output_dir="output/optimized",
    target_size="content"
)

for i, result in enumerate(results):
    print(f"{i+1}. 압축률: {result.compression_ratio:.1f}%")
```

### Auto Placer - 자동 이미지 배치

```python
from blog_image_agent.placers import AutoPlacer

# HTML 콘텐츠
html = """
<h1>블로그 제목</h1>
<h2>첫 번째 섹션</h2>
<p>내용...</p>
<h2>두 번째 섹션</h2>
<p>더 많은 내용...</p>
"""

# 요구사항과 수집된 이미지
requirements = [...]  # ContentAnalyzer 결과
collected_images = [...]  # Collector 결과

# 배치 계산
placer = AutoPlacer(min_gap=300)
placements = placer.calculate_placements(html, requirements, collected_images)

# 배치 정보 확인
for placement in placements:
    print(f"이미지 ID: {placement.image_id}")
    print(f"섹션: {placement.position.section_title}")
    print(f"위치: {placement.position.position}")
    print(f"Alt text: {placement.alt_text}")
    print(f"Caption: {placement.caption}")
    print()

# 통계 확인
stats = placer.get_placement_statistics(placements)
print(f"총 배치: {stats['total_placements']}개")
print(f"섹션 사용: {stats['sections_used']}개")

# 유효성 검증
valid, errors = placer.validate_placements(placements, html)
if not valid:
    for error in errors:
        print(f"오류: {error}")
```

### HTML Inserter - HTML 삽입

```python
from blog_image_agent.placers import HtmlInserter

inserter = HtmlInserter()

# 이미지 HTML 생성
html_code = inserter.generate_image_html(
    image_path="output/image.webp",
    alt_text="서울 강남 맛집",
    caption="전통 한식당의 따뜻한 분위기",
    width=800,
    height=600
)

print(html_code)
# <figure>
#   <img src="output/image.webp" alt="서울 강남 맛집" width="800" height="600">
#   <figcaption>전통 한식당의 따뜻한 분위기</figcaption>
# </figure>

# HTML에 이미지 삽입
original_html = "<h1>제목</h1><p>내용</p>"
placements = [...]  # AutoPlacer 결과

updated_html = inserter.insert_images(original_html, placements, collected_images)

# 결과 저장
with open("output/blog_with_images.html", "w", encoding="utf-8") as f:
    f.write(updated_html)
```

### Image Cache - 캐싱 시스템

```python
from blog_image_agent.utils import ImageCache

# 캐시 초기화
cache = ImageCache(
    cache_dir=".cache/images",
    ttl_days=7,
    max_size_mb=500
)

# 캐시 조회
cached_path = cache.get(
    keywords=["korean food", "kimchi"],
    source="unsplash"
)

if cached_path:
    print(f"캐시 히트: {cached_path}")
else:
    print("캐시 미스, 이미지 수집 필요")

    # 이미지 수집 후 캐시에 저장
    collected_image_path = "output/kimchi.jpg"
    cached_path = cache.put(
        keywords=["korean food", "kimchi"],
        source="unsplash",
        local_path=collected_image_path,
        url="https://example.com/kimchi.jpg",
        metadata={"width": 1920, "height": 1080}
    )
    print(f"캐시 저장: {cached_path}")

# 통계 확인
stats = cache.get_stats()
print(f"캐시 엔트리: {stats.total_entries}개")
print(f"총 크기: {stats.total_size_mb:.2f} MB")
print(f"히트율: {stats.hit_rate * 100:.1f}%")
print(f"히트: {stats.hits}, 미스: {stats.misses}")

# 만료된 캐시 정리
removed = cache.cleanup_expired()
print(f"만료된 {removed}개 엔트리 삭제")
```

## CLI 사용 예제

### 전체 파이프라인 실행

```bash
# 기본 사용
python -m cli.main pipeline my_blog.html -o ./output

# 상세 옵션
python -m cli.main pipeline my_blog.html \
  -o ./output \
  --quality 90 \
  --webp \
  --priority google,stock,nanobanana \
  --cache
```

### 콘텐츠 분석만 실행

```bash
# 분석 결과를 JSON으로 저장
python -m cli.main analyze my_blog.html -o requirements.json

# 특정 모델 사용
python -m cli.main analyze my_blog.html \
  -o requirements.json \
  --model gemini-2.0-pro
```

### AI 이미지 생성

```bash
# 썸네일 생성
python -m cli.main generate \
  -p "Korean traditional restaurant interior" \
  -t thumbnail \
  -o output/thumbnail.webp

# 음식 사진 생성
python -m cli.main generate \
  -p "Delicious Korean kimchi stew" \
  -t food_photo \
  -a "4:3" \
  -o output/food.webp
```

### 설정 확인

```bash
# 현재 설정 확인
python -m cli.main config

# API 키 확인
python -m cli.main config --check-keys
```

## 환경 설정 예제

### .env 파일

```env
# Google API (필수)
GOOGLE_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX

# Unsplash API (권장)
UNSPLASH_ACCESS_KEY=your_unsplash_access_key

# Pexels API (선택)
PEXELS_API_KEY=your_pexels_api_key

# Google Places API (선택)
GOOGLE_PLACES_API_KEY=your_google_places_key
```

### config/custom.yaml

```yaml
# 사용자 정의 설정
pipeline:
  output_dir: "output/blog_images"
  cache_enabled: true
  cache_ttl_days: 14

collection:
  priority:
    - google
    - stock
    - nanobanana
  max_images_per_requirement: 3

optimization:
  convert_to_webp: true
  image_quality: 85
  max_width: 1200
  max_height: 1200

validation:
  min_width: 800
  min_height: 600
  blur_threshold: 100.0
```

## 고급 사용 예제

### 커스텀 워크플로우

```python
import asyncio
from blog_image_agent import (
    ContentAnalyzer,
    StockImageCollector,
    NanobananGenerator,
    QualityValidator,
    ImageOptimizer,
    AutoPlacer,
    HtmlInserter,
    ImageCache
)

async def custom_workflow(html_content: str):
    # 1. 콘텐츠 분석
    analyzer = ContentAnalyzer()
    requirements = analyzer.analyze_content(html_content)

    # 2. 이미지 수집
    collector = StockImageCollector()
    generator = NanobananGenerator()
    cache = ImageCache()

    collected_images = []

    for req in requirements:
        # 캐시 확인
        cached = cache.get(req.keywords, "stock")
        if cached:
            collected_images.append({
                "requirement_id": req.id,
                "local_path": cached,
                "source": "cache"
            })
            continue

        # 스톡 이미지 시도
        result = await collector.collect(req.keywords, max_images=1)

        if result.success and result.images:
            img_url = result.images[0]['url']
            local_path = f"temp/{req.id}.jpg"
            await collector.download(img_url, local_path)

            # 캐시에 저장
            cache.put(req.keywords, "stock", local_path, img_url)

            collected_images.append({
                "requirement_id": req.id,
                "local_path": local_path,
                "source": "stock"
            })
        else:
            # AI 생성 폴백
            result = await generator.generate(req.prompt, req.type)
            collected_images.append({
                "requirement_id": req.id,
                "local_path": result.local_path,
                "source": "ai"
            })

    # 3. 품질 검증
    validator = QualityValidator()
    valid_images = []

    for img in collected_images:
        report = validator.validate(img['local_path'])
        if report.valid:
            valid_images.append(img)

    # 4. 최적화
    optimizer = ImageOptimizer(convert_to_webp=True)

    for img in valid_images:
        result = optimizer.optimize(
            img['local_path'],
            target_size="content"
        )
        img['optimized_path'] = result.output_path

    # 5. 배치 계산
    placer = AutoPlacer()
    placements = placer.calculate_placements(
        html_content,
        [req.to_dict() for req in requirements],
        valid_images
    )

    # 6. HTML 삽입
    inserter = HtmlInserter()
    final_html = inserter.insert_images(html_content, placements, valid_images)

    return final_html

# 실행
html = open("blog.html", encoding="utf-8").read()
result_html = asyncio.run(custom_workflow(html))

with open("output/final.html", "w", encoding="utf-8") as f:
    f.write(result_html)
```

## 라이선스

MIT License
