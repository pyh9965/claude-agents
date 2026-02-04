# Pipeline Module

블로그 이미지 수집 전체 파이프라인을 조율하는 오케스트레이터 모듈입니다.

## 구조

```
pipeline/
├── __init__.py           # 모듈 진입점
├── orchestrator.py       # 파이프라인 오케스트레이터
└── README.md            # 문서
```

## 주요 컴포넌트

### PipelineOrchestrator

전체 이미지 수집 파이프라인을 조율하는 메인 클래스입니다.

**파이프라인 흐름:**
1. 콘텐츠 분석 (ContentAnalyzer) → ImageRequirement 목록 생성
2. 하이브리드 이미지 수집 (GooglePlaces → Stock → AI 순서로 Fallback)
3. 이미지 품질 검증 (QualityValidator)
4. 이미지 최적화 (ImageOptimizer)
5. 자동 배치 계산 (AutoPlacer)
6. HTML에 이미지 삽입 (HtmlInserter)

### PipelineConfig

파이프라인 설정을 관리하는 데이터 클래스입니다.

**주요 설정:**
- `output_dir`: 출력 디렉토리
- `min_images_per_content`: 콘텐츠당 최소 이미지 수
- `max_images_per_content`: 콘텐츠당 최대 이미지 수
- `fallback_to_stock`: 스톡 이미지 fallback 활성화
- `fallback_to_ai`: AI 생성 fallback 활성화
- `optimize_images`: 이미지 최적화 활성화
- `convert_to_webp`: WebP 변환 활성화
- `image_quality`: 이미지 품질 (1-100)
- `cache_enabled`: 캐시 활성화
- `collection_priority`: 수집 소스 우선순위 리스트

### PipelineResult

파이프라인 실행 결과를 담는 데이터 클래스입니다.

**필드:**
- `success`: 성공 여부
- `content_id`: 콘텐츠 ID
- `image_map`: 이미지 맵 (수집된 이미지 + 배치 정보)
- `output_html`: 이미지가 삽입된 HTML
- `statistics`: 수집 통계
- `errors`: 에러 목록
- `execution_time`: 실행 시간 (초)

## 사용 예제

### 기본 사용

```python
import asyncio
from pipeline import PipelineOrchestrator

async def main():
    # HTML 콘텐츠
    html_content = """
    <html>
        <body>
            <h1>맛집 탐방</h1>
            <p>오늘은 강남 맛집을 소개합니다...</p>
        </body>
    </html>
    """

    # 오케스트레이터 생성
    orchestrator = PipelineOrchestrator()

    try:
        # 파이프라인 실행
        result = await orchestrator.run(
            html_content=html_content,
            output_dir="output",
            content_id="gangnam_food"
        )

        # 결과 확인
        if result.success:
            print(f"성공! {result.statistics.total}개 이미지 수집")
            print(f"소스별: {result.statistics.by_source}")
        else:
            print(f"실패: {result.errors}")

    finally:
        await orchestrator.close()

asyncio.run(main())
```

### 커스텀 설정

```python
from pipeline import PipelineOrchestrator, PipelineConfig

# 커스텀 설정
config = PipelineConfig(
    output_dir="output/custom",
    max_images_per_content=10,
    fallback_to_ai=False,  # AI 생성 비활성화
    optimize_images=True,
    convert_to_webp=True,
    image_quality=90,
    collection_priority=["google", "stock"]  # Google 우선, AI 제외
)

orchestrator = PipelineOrchestrator(config)
```

### 스톡 이미지만 사용

```python
config = PipelineConfig(
    collection_priority=["stock"],
    fallback_to_ai=False,
    optimize_images=False
)
```

### AI 생성만 사용

```python
config = PipelineConfig(
    collection_priority=["nanobanana"],
    fallback_to_stock=False
)
```

## Fallback 전략

이미지 수집 시 다음 순서로 Fallback을 시도합니다:

### PreferredSource.REAL (실제 사진)
```
Google Places → Stock Images → AI Generated
```

### PreferredSource.STOCK (스톡 이미지)
```
Stock Images → Google Places → AI Generated
```

### PreferredSource.AI (AI 생성)
```
AI Generated → Stock Images → Google Places
```

### PreferredSource.ANY (기본)
```
config.collection_priority에 설정된 순서대로
```

## 캐싱

이미지 캐싱을 통해 중복 다운로드를 방지합니다:

```python
config = PipelineConfig(
    cache_enabled=True,
    cache_dir=".cache/images"
)
```

캐시 히트 시 `statistics.cache_hits`가 증가합니다.

## 이미지 최적화

품질 검증 및 최적화 옵션:

```python
config = PipelineConfig(
    optimize_images=True,      # 최적화 활성화
    convert_to_webp=True,      # WebP 변환
    image_quality=85,          # 품질 (1-100)
)
```

최적화 수행 시:
- 이미지 크기 조정 (최대 1920px)
- WebP 변환 (용량 감소)
- 메타데이터 제거
- 품질 최적화

## 출력 구조

```
output/
├── images/
│   ├── req_001_google.webp
│   ├── req_002_stock.webp
│   └── req_003_nanobanana.webp
├── content_with_images.html
└── image_map.json
```

### image_map.json 구조

```json
{
  "content_id": "gangnam_food",
  "images": [
    {
      "id": "req_001_google.webp",
      "source": "google",
      "local_path": "output/images/req_001_google.webp",
      "width": 1920,
      "height": 1080,
      "alt_text": "강남역 스테이크 이미지",
      "requirement_id": "req_001"
    }
  ],
  "placements": [
    {
      "image_id": "req_001_google.webp",
      "position": 150,
      "html": "<img src='images/req_001_google.webp' alt='...' />"
    }
  ],
  "statistics": {
    "total": 5,
    "by_source": {
      "google": 2,
      "stock": 2,
      "nanobanana": 1
    },
    "cache_hits": 0,
    "failures": 0
  }
}
```

## 통계 및 로깅

파이프라인 실행 중 다음 정보를 출력합니다:

```
[Pipeline] 콘텐츠 분석 중...
[Pipeline] 5개 이미지 요구사항 추출
[Pipeline] 이미지 수집 중...
[Pipeline] Google Places에서 '강남역 스테이크' 검색...
[Pipeline] ✓ google에서 이미지 수집 성공
[Pipeline] 5개 이미지 수집 완료
[Pipeline] 이미지 최적화 중...
[Pipeline] 최적화 완료: 2500000 → 850000 bytes
[Pipeline] 이미지 배치 계산 중...
[Pipeline] HTML에 이미지 삽입 중...
[Pipeline] 완료! (소요 시간: 12.3초)
[Pipeline] 출력: output/content_with_images.html
[Pipeline] 통계: 총 5개, 실패 0개
[Pipeline] 소스별: {'google': 2, 'stock': 2, 'nanobanana': 1}
```

## CLI 실행

orchestrator.py를 직접 실행할 수 있습니다:

```bash
python src/pipeline/orchestrator.py input.html -o output
python src/pipeline/orchestrator.py input.html --no-optimize
python src/pipeline/orchestrator.py input.html --no-stock --no-ai
```

**옵션:**
- `-o, --output`: 출력 디렉토리
- `--no-optimize`: 최적화 비활성화
- `--no-stock`: 스톡 이미지 사용 안함
- `--no-ai`: AI 생성 사용 안함

## 에러 처리

파이프라인은 각 단계에서 발생한 에러를 수집하여 반환합니다:

```python
result = await orchestrator.run(html_content)

if not result.success:
    for error in result.errors:
        print(f"Error: {error}")
```

주요 에러 케이스:
- API 키 누락 (GOOGLE_API_KEY 등)
- 네트워크 오류
- 이미지 다운로드 실패
- 파일 I/O 오류

## 성능 최적화

### 병렬 처리

이미지 수집은 순차적으로 처리되지만, 각 수집기 내부에서는 병렬 처리를 수행합니다.

### 캐싱

동일한 이미지 재사용:
```python
config = PipelineConfig(cache_enabled=True)
```

### 최적화 비활성화

테스트 시 속도 향상:
```python
config = PipelineConfig(optimize_images=False)
```

## 의존성

- **analyzers**: ContentAnalyzer
- **collectors**: GooglePlacesCollector, StockImageCollector, NanobananGenerator
- **processors**: QualityValidator, ImageOptimizer
- **placers**: AutoPlacer, HtmlInserter
- **utils**: ImageCache
- **models**: 모든 데이터 모델

## 테스트

```bash
# 전체 테스트
pytest tests/test_pipeline.py -v

# 특정 테스트
pytest tests/test_pipeline.py::TestPipelineConfig -v

# async 테스트 제외
pytest tests/test_pipeline.py -v -k "not test_run"
```

## 라이센스

MIT License
