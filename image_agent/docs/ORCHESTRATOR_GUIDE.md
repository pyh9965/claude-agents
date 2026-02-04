# Pipeline Orchestrator 사용 가이드

## 개요

`PipelineOrchestrator`는 이미지 수집 파이프라인의 모든 단계를 통합 관리하는 핵심 컴포넌트입니다.

## 주요 기능

1. **웹 이미지 수집**: Crawl4AI를 사용하여 웹사이트에서 이미지 수집
2. **PDF 이미지 추출**: PyMuPDF를 사용하여 PDF 파일에서 이미지 추출
3. **이미지 분류**: GPT-4 Vision을 사용하여 이미지 타입 분류
4. **썸네일 생성**: Pillow로 홍보용 썸네일 생성
5. **상세 리포트**: JSON 형식의 실행 결과 리포트 생성

## 빠른 시작

### 기본 사용법

```python
import asyncio
from src.pipeline.orchestrator import PipelineOrchestrator

async def main():
    # Orchestrator 초기화
    orchestrator = PipelineOrchestrator(output_dir="output")

    # 파이프라인 실행
    url = "https://example.com/apartment"
    report = await orchestrator.run(url, generate_thumbnails=True)

    # 결과 확인
    print(f"수집: {report.collected_images}개")
    print(f"분류: {report.classified_images}개")
    print(f"분류 결과: {report.classification_summary}")

asyncio.run(main())
```

### 배치 처리

```python
async def batch_process():
    orchestrator = PipelineOrchestrator(output_dir="output")

    urls = [
        "https://example.com/apt1",
        "https://example.com/apt2",
        "https://example.com/apt3"
    ]

    reports = await orchestrator.run_batch(urls, generate_thumbnails=True)

    for report in reports:
        print(f"{report.apartment_name}: {report.classified_images}개 분류")

asyncio.run(batch_process())
```

## 파이프라인 단계

### 1단계: 웹 이미지 수집 (COLLECT)

- Crawl4AI로 웹 페이지 크롤링
- LLM을 사용하여 이미지 URL 추출
- 이미지와 PDF 파일 다운로드

**로그 예시:**
```
[2026-01-31 10:00:01] [COLLECT] 웹 이미지 수집 중... URL: https://example.com
[2026-01-31 10:00:05] [COLLECT] 완료: 15개 이미지 수집
```

### 2단계: PDF 이미지 추출 (EXTRACT)

- 다운로드된 PDF 파일 탐색
- PyMuPDF로 이미지 추출
- 최소 크기 이하 이미지 필터링

**로그 예시:**
```
[2026-01-31 10:00:05] [EXTRACT] PDF 이미지 추출 중... (2개 PDF)
[2026-01-31 10:00:10] [EXTRACT] 완료: 8개 이미지 추출
```

### 3단계: 이미지 분류 (CLASSIFY)

- GPT-4 Vision으로 이미지 타입 분류
  - floor_plan: 평면도
  - site_plan: 배치도
  - aerial_view: 조감도
  - location_map: 위치도
  - other: 기타
- 평면도의 경우 타입 정보 추출 (예: 59A, 84D)

**로그 예시:**
```
[2026-01-31 10:00:10] [CLASSIFY] 이미지 분류 중... (23개)
[2026-01-31 10:00:30] [CLASSIFY] 완료: 23개 이미지 분류
(floor_plan: 10, site_plan: 3, aerial_view: 5, location_map: 2, other: 3)
```

### 4단계: 썸네일 생성 (THUMBNAIL, 선택사항)

- 대표 이미지 선택 (조감도 우선)
- Pillow로 홍보용 썸네일 생성
- 단지명, 분양가 등 텍스트 오버레이

**로그 예시:**
```
[2026-01-31 10:00:30] [THUMBNAIL] 썸네일 생성 중...
[2026-01-31 10:00:32] [THUMBNAIL] 완료: 썸네일 생성 (output/thumbnails/apt_12345678.jpg)
```

## PipelineReport 구조

```python
@dataclass
class PipelineReport:
    url: str                              # 처리한 URL
    apartment_name: str                   # 아파트/단지명
    started_at: datetime                  # 시작 시간
    completed_at: Optional[datetime]      # 완료 시간
    steps: List[PipelineStep]            # 각 단계 상태
    collected_images: int                 # 웹에서 수집한 이미지 수
    extracted_images: int                 # PDF에서 추출한 이미지 수
    classified_images: int                # 분류된 이미지 수
    thumbnails_generated: int             # 생성된 썸네일 수
    classification_summary: Dict[str, int] # 타입별 분류 결과
```

## 출력 디렉토리 구조

```
output/
├── images/                    # 웹 수집 이미지
│   ├── images/               # 실제 이미지 파일
│   ├── pdfs/                 # 다운로드된 PDF 파일
│   └── metadata/             # 수집 메타데이터 (JSON)
├── pdf_images/               # PDF 추출 이미지
├── thumbnails/               # 생성된 썸네일
└── reports/                  # 파이프라인 리포트 (JSON)
    ├── {apartment}_report_{timestamp}.json
    ├── {apartment}_classification_{timestamp}.json
    └── batch_summary_{timestamp}.json
```

## 리포트 파일 예시

### 파이프라인 리포트
```json
{
  "url": "https://example.com/apartment",
  "apartment_name": "힐스테이트 광명",
  "started_at": "2026-01-31T10:00:00",
  "completed_at": "2026-01-31T10:00:35",
  "steps": [
    {
      "name": "collect",
      "status": "completed",
      "started_at": "2026-01-31T10:00:00",
      "completed_at": "2026-01-31T10:00:05",
      "error": null
    },
    ...
  ],
  "collected_images": 15,
  "extracted_images": 8,
  "classified_images": 23,
  "thumbnails_generated": 1,
  "classification_summary": {
    "floor_plan": 10,
    "site_plan": 3,
    "aerial_view": 5,
    "location_map": 2,
    "other": 3
  }
}
```

### 배치 요약 리포트
```json
{
  "timestamp": "20260131_100500",
  "total_urls": 3,
  "successful": 3,
  "failed": 0,
  "total_images_collected": 45,
  "total_images_extracted": 20,
  "total_images_classified": 65,
  "total_thumbnails": 3,
  "reports": [
    {
      "url": "https://example.com/apt1",
      "apartment_name": "힐스테이트 광명",
      "status": "success",
      "images": 23
    },
    ...
  ]
}
```

## 에러 처리

각 단계는 독립적으로 실행되며, 한 단계가 실패해도 다음 단계를 계속 진행합니다.

```python
# 단계별 상태 확인
for step in report.steps:
    if step.status == "failed":
        print(f"{step.name} 실패: {step.error}")
    elif step.status == "completed":
        duration = (step.completed_at - step.started_at).total_seconds()
        print(f"{step.name} 완료 ({duration:.1f}초)")
```

## 고급 사용법

### 썸네일 생성 비활성화

```python
report = await orchestrator.run(url, generate_thumbnails=False)
```

### 커스텀 출력 디렉토리

```python
orchestrator = PipelineOrchestrator(output_dir="custom_output")
```

### 리포트 수동 저장

```python
report_path = orchestrator.save_report(report, output_path="custom_report.json")
print(f"리포트 저장됨: {report_path}")
```

## 로깅 설정

```python
import logging

# 상세 로깅
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler('pipeline.log', encoding='utf-8')
    ]
)

# 특정 모듈만 로깅
logging.getLogger('src.pipeline').setLevel(logging.DEBUG)
logging.getLogger('src.collector').setLevel(logging.INFO)
logging.getLogger('src.classifier').setLevel(logging.WARNING)
```

## 성능 최적화

### 배치 처리 병렬화 (향후 개선)

현재는 순차 처리이지만, asyncio.gather로 병렬화 가능:

```python
# 현재 구현 (순차)
for url in urls:
    report = await orchestrator.run(url)

# 병렬화 (향후)
tasks = [orchestrator.run(url) for url in urls]
reports = await asyncio.gather(*tasks)
```

## 문제 해결

### OpenAI API 키 오류

```bash
# 환경변수 설정
export OPENAI_API_KEY="your-api-key"

# 또는 .env 파일
echo "OPENAI_API_KEY=your-api-key" > .env
```

### 메모리 부족

대량 이미지 처리 시:
- 배치 크기 줄이기
- 이미지 품질 설정 조정
- 썸네일 생성 비활성화

### 크롤링 실패

- 네트워크 연결 확인
- URL이 유효한지 확인
- 웹사이트 접근 권한 확인

## 레거시 호환성

기존 `Orchestrator` 클래스도 계속 지원됩니다:

```python
from src.pipeline.orchestrator import Orchestrator

config = {"output_dir": "output"}
orchestrator = Orchestrator(config)

result = await orchestrator.run_pipeline(urls=["https://example.com"])
```

## 참고 자료

- [WebCrawler 문서](./WEB_CRAWLER.md)
- [PDFExtractor 문서](./PDF_EXTRACTOR.md)
- [VisionClassifier 문서](./VISION_CLASSIFIER.md)
- [ThumbnailGenerator 문서](./THUMBNAIL_GENERATOR.md)
