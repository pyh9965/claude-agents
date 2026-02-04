# Pipeline Orchestrator 구현 완료

## 개요

`PipelineOrchestrator` 클래스가 성공적으로 구현되었습니다. 이 클래스는 웹 수집 → PDF 추출 → 이미지 분류 → 썸네일 생성의 전체 파이프라인을 통합 관리합니다.

## 주요 기능

### 1. 통합 파이프라인 실행
- **수집**: Crawl4AI로 웹 이미지 수집 및 PDF 다운로드
- **추출**: PyMuPDF로 PDF에서 이미지 추출
- **분류**: GPT-4 Vision으로 이미지 타입 분류
- **썸네일**: Pillow로 홍보용 썸네일 생성

### 2. 단계별 진행 상태 추적
```python
PipelineStep:
  - name: "collect" | "extract" | "classify" | "thumbnail"
  - status: "pending" | "running" | "completed" | "failed"
  - started_at, completed_at: datetime
  - error: Optional[str]
```

### 3. 상세 리포트 생성
```python
PipelineReport:
  - url, apartment_name
  - 시작/완료 시간
  - 각 단계 상태
  - 수집/추출/분류/썸네일 통계
  - 분류 결과 요약 (타입별 카운트)
```

### 4. 배치 처리
- 여러 URL을 순차적으로 처리
- 실패한 URL이 있어도 계속 진행
- 배치 요약 리포트 자동 생성

### 5. 에러 처리
- 각 단계가 독립적으로 실행
- 한 단계 실패 시 다음 단계 계속 진행
- 상세한 에러 로그 및 리포트

## 파일 구조

```
D:\AI프로그램제작\agent\이미지수집agent\
├── src/
│   └── pipeline/
│       ├── __init__.py           # 모듈 export
│       └── orchestrator.py       # 메인 구현 (555줄)
├── examples/
│   └── run_pipeline.py           # 실행 예제
├── docs/
│   └── ORCHESTRATOR_GUIDE.md     # 상세 가이드
└── README_ORCHESTRATOR.md        # 이 파일
```

## 구현 내용

### 클래스

1. **PipelineStep** (dataclass)
   - 파이프라인 각 단계의 상태 추적
   - to_dict() 메서드로 JSON 직렬화 지원

2. **PipelineReport** (dataclass)
   - 전체 파이프라인 실행 결과
   - to_dict() 메서드로 JSON 직렬화 지원

3. **PipelineOrchestrator** (메인 클래스)
   - `__init__`: 컴포넌트 초기화 및 디렉토리 설정
   - `run()`: 단일 URL 파이프라인 실행
   - `run_batch()`: 배치 URL 처리
   - `save_report()`: 리포트 JSON 저장
   - `_log_step()`: 단계별 로깅
   - `_save_classification_results()`: 분류 결과 저장
   - `_save_batch_summary()`: 배치 요약 저장

4. **Orchestrator** (레거시 호환)
   - 기존 인터페이스 유지
   - PipelineOrchestrator를 래핑

### 로깅 형식

```
[2026-01-31 10:00:00] [COLLECT] 웹 이미지 수집 중... URL: https://...
[2026-01-31 10:00:05] [COLLECT] 완료: 15개 이미지 수집
[2026-01-31 10:00:05] [EXTRACT] PDF 이미지 추출 중... (2개 PDF)
[2026-01-31 10:00:10] [EXTRACT] 완료: 8개 이미지 추출
[2026-01-31 10:00:10] [CLASSIFY] 이미지 분류 중... (23개)
[2026-01-31 10:00:30] [CLASSIFY] 완료: 23개 이미지 분류 (floor_plan: 10, ...)
[2026-01-31 10:00:30] [THUMBNAIL] 썸네일 생성 중...
[2026-01-31 10:00:32] [THUMBNAIL] 완료: 썸네일 생성 (...)
[2026-01-31 10:00:32] [PIPELINE] 완료: 총 23개 이미지 처리
```

## 사용 예제

### 기본 사용

```python
import asyncio
from src.pipeline.orchestrator import PipelineOrchestrator

async def main():
    orchestrator = PipelineOrchestrator(output_dir="output")

    # 파이프라인 실행
    report = await orchestrator.run(
        url="https://example.com/apartment",
        generate_thumbnails=True
    )

    # 결과 확인
    print(f"아파트: {report.apartment_name}")
    print(f"수집: {report.collected_images}개")
    print(f"분류: {report.classification_summary}")

asyncio.run(main())
```

### 배치 처리

```python
async def batch():
    orchestrator = PipelineOrchestrator(output_dir="output")

    urls = [
        "https://example.com/apt1",
        "https://example.com/apt2",
        "https://example.com/apt3"
    ]

    reports = await orchestrator.run_batch(urls)
    print(f"{len(reports)}개 처리 완료")

asyncio.run(batch())
```

## 출력 예시

### 콘솔 출력
```
================================================================================
[PIPELINE] 시작: https://example.com/apartment
================================================================================
[2026-01-31 10:00:01] [COLLECT] 웹 이미지 수집 중... URL: https://...
[2026-01-31 10:00:05] [COLLECT] 완료: 15개 이미지 수집
[2026-01-31 10:00:05] [EXTRACT] PDF 이미지 추출 중... (2개 PDF)
[2026-01-31 10:00:10] [EXTRACT] 완료: 8개 이미지 추출
[2026-01-31 10:00:10] [CLASSIFY] 이미지 분류 중... (23개)
[2026-01-31 10:00:30] [CLASSIFY] 완료: 23개 이미지 분류 ...
[2026-01-31 10:00:30] [THUMBNAIL] 썸네일 생성 중...
[2026-01-31 10:00:32] [THUMBNAIL] 완료: 썸네일 생성 (...)
================================================================================
[PIPELINE] 완료: 힐스테이트 광명
  - 소요 시간: 32.5초
  - 수집: 15개
  - PDF 추출: 8개
  - 분류: 23개
  - 썸네일: 1개
  - 리포트: D:\...\output\reports\힐스테이트_광명_report_20260131_100032.json
================================================================================
```

### JSON 리포트 (output/reports/*.json)
```json
{
  "url": "https://example.com/apartment",
  "apartment_name": "힐스테이트 광명",
  "started_at": "2026-01-31T10:00:00",
  "completed_at": "2026-01-31T10:00:32",
  "steps": [
    {
      "name": "collect",
      "status": "completed",
      "started_at": "2026-01-31T10:00:01",
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

## 디렉토리 구조

```
output/
├── images/                    # 웹 수집 이미지
│   ├── images/               # 이미지 파일
│   ├── pdfs/                 # PDF 파일
│   └── metadata/             # 메타데이터
├── pdf_images/               # PDF 추출 이미지
├── thumbnails/               # 썸네일
└── reports/                  # 리포트
    ├── {apartment}_report_{timestamp}.json
    ├── {apartment}_classification_{timestamp}.json
    └── batch_summary_{timestamp}.json
```

## 테스트 상태

- [x] Python 구문 검사 통과
- [x] AST 파싱 통과
- [x] 모듈 구조 검증
- [x] 타입 힌팅 완료
- [ ] 통합 테스트 (의존성 패키지 필요)

## 의존성

```
crawl4ai
httpx
aiofiles
pymupdf
Pillow
openai
python-dotenv
```

## 다음 단계

1. **테스트 작성**
   ```bash
   pytest tests/test_orchestrator.py
   ```

2. **실행**
   ```bash
   python examples/run_pipeline.py
   ```

3. **CLI 통합**
   ```bash
   python -m src.cli.main run --url https://example.com/apartment
   ```

## 문서

- 상세 가이드: `docs/ORCHESTRATOR_GUIDE.md`
- 실행 예제: `examples/run_pipeline.py`

## 작성자

- 구현일: 2026-01-31
- 코드 라인: 555줄
- 테스트: 구문 검사 통과
