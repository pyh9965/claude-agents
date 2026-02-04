# 부동산 블로그 이미지 수집 자동화

청약홈 및 분양사이트에서 이미지를 자동 수집하고, AI로 분류하며, 블로그용 썸네일을 자동 생성하는 도구입니다.

---

## 설치

### 1. 의존성 설치

```bash
cd D:\AI프로그램제작\agent\이미지수집agent
pip install -r requirements.txt
```

### 2. CLI 도구 설치

```bash
pip install -e .
```

### 3. 환경변수 설정

`.env` 파일을 생성하고 API 키를 설정합니다:

```env
GOOGLE_API_KEY=your-google-gemini-api-key
BANNERBEAR_API_KEY=your-bannerbear-api-key  # 선택사항
```

> **참고:** 이 프로젝트는 Google Gemini API를 사용합니다. [Google AI Studio](https://aistudio.google.com/)에서 API 키를 발급받으세요.

---

## CLI 사용법

### 전체 파이프라인 실행

URL에서 이미지 수집 → 분류 → 썸네일 생성을 한 번에 실행합니다.

```bash
image-agent pipeline https://www.applyhome.co.kr/...
```

**옵션:**
- `-o, --output` : 출력 디렉토리 (기본값: `output`)
- `--no-thumbnail` : 썸네일 생성 건너뛰기

```bash
# 썸네일 생성 없이 수집+분류만
image-agent pipeline https://www.applyhome.co.kr/... --no-thumbnail

# 출력 디렉토리 지정
image-agent pipeline https://www.applyhome.co.kr/... -o ./my_output
```

---

### 이미지 수집 (collect)

웹사이트에서 이미지와 PDF를 수집합니다.

```bash
image-agent collect https://www.applyhome.co.kr/...
```

**옵션:**
- `-o, --output` : 출력 디렉토리 (기본값: `output`)
- `--api-key` : OpenAI API 키 (환경변수 대체 가능)

```bash
image-agent collect https://www.applyhome.co.kr/... -o ./collected_images
```

**출력 구조:**
```
output/
├── images/       # 다운로드된 이미지
├── pdfs/         # 다운로드된 PDF
└── metadata/     # 수집 결과 JSON
```

---

### 이미지 분류 (classify)

Gemini Vision을 사용해 이미지를 자동 분류합니다.

**단일 이미지 분류:**
```bash
image-agent classify ./output/images/image.jpg
```

**디렉토리 내 모든 이미지 배치 분류:**
```bash
image-agent classify ./output/images --batch
```

**옵션:**
- `-b, --batch` : 디렉토리 내 모든 이미지 처리
- `-o, --output` : 결과 JSON 저장 경로

```bash
# 분류 결과를 JSON으로 저장
image-agent classify ./output/images --batch -o classification_results.json
```

**분류 카테고리:**
| 타입 | 설명 |
|------|------|
| `floor_plan` | 평면도 (집 내부 구조도) |
| `site_plan` | 배치도 (단지 내 건물 배치) |
| `aerial_view` | 조감도 (단지 전체 외관) |
| `location_map` | 위치도 (교통, 주변시설) |
| `other` | 기타 |

---

### 썸네일 생성 (generate-thumbnail)

블로그용 썸네일 이미지를 생성합니다.

```bash
image-agent generate-thumbnail -n "힐스테이트 광명" -p "3.5억원~"
```

**필수 옵션:**
- `-n, --name` : 단지명
- `-p, --price` : 분양가

**선택 옵션:**
- `-bg, --background` : 배경 이미지 경로
- `-s, --subtitle` : 부제목 (예: "2024년 입주 예정")
- `-o, --output` : 출력 디렉토리 (기본값: `output/thumbnails`)

```bash
# 배경 이미지와 부제목 포함
image-agent generate-thumbnail \
  -n "힐스테이트 광명" \
  -p "3.5억원~" \
  -bg ./aerial_view.jpg \
  -s "2024년 12월 입주 예정"
```

**생성되는 썸네일:**
- 크기: 1280x720 (YouTube 표준)
- 형식: JPEG (고품질)
- 텍스트: 단지명, 분양가, 부제목 (그림자 효과)

---

## Python API 사용법

### 웹 크롤러

```python
import asyncio
from src.collector.web_crawler import WebCrawler

async def main():
    crawler = WebCrawler(output_dir="output")
    result = await crawler.collect_and_download(
        "https://www.applyhome.co.kr/..."
    )

    print(f"단지명: {result.apartment_name}")
    print(f"수집된 이미지: {len(result.images)}개")
    print(f"PDF 링크: {len(result.pdf_urls)}개")

asyncio.run(main())
```

### PDF 이미지 추출

```python
from src.collector.pdf_extractor import PDFExtractor

extractor = PDFExtractor(output_dir="output/pdf_images")
result = extractor.extract_images(
    pdf_path="./모집공고.pdf",
    apartment_name="힐스테이트 광명"
)

print(f"추출된 이미지: {len(result.images)}개")
for img in result.images:
    print(f"  - {img.local_path} ({img.width}x{img.height})")
```

### 이미지 분류

```python
from src.classifier.vision_classifier import VisionClassifier

classifier = VisionClassifier()  # GOOGLE_API_KEY 환경변수 사용

# 단일 이미지
result = classifier.classify_image("./floor_plan.jpg")
print(f"타입: {result.image_type}")
print(f"평면도 타입: {result.floor_plan_type}")  # 예: 59A, 84D
print(f"신뢰도: {result.confidence}")

# 배치 분류
results = classifier.classify_batch([
    "./image1.jpg",
    "./image2.jpg",
    "./image3.jpg"
])

# JSON으로 저장
classifier.save_results(results, "classification_results.json")
```

### 썸네일 생성

```python
from src.generator.thumbnail_generator import ThumbnailGenerator, ThumbnailData

generator = ThumbnailGenerator(output_dir="output/thumbnails")

data = ThumbnailData(
    apartment_name="힐스테이트 광명",
    price="분양가 3.5억원~",
    background_image="./aerial_view.jpg",  # 선택사항
    subtitle="2024년 12월 입주 예정"  # 선택사항
)

result = generator.generate(data)
print(f"썸네일 저장: {result.output_path}")
```

### 전체 파이프라인

```python
import asyncio
from src.pipeline.orchestrator import PipelineOrchestrator

async def main():
    pipeline = PipelineOrchestrator(output_dir="output")

    report = await pipeline.run(
        url="https://www.applyhome.co.kr/...",
        generate_thumbnails=True
    )

    print(f"단지명: {report.apartment_name}")
    print(f"수집된 이미지: {report.collected_images}개")
    print(f"PDF 추출 이미지: {report.extracted_images}개")
    print(f"분류 완료: {report.classified_images}개")
    print(f"분류 요약: {report.classification_summary}")

asyncio.run(main())
```

---

## n8n 워크플로우

`workflows/n8n_workflow.json` 파일을 n8n에 import하여 자동화할 수 있습니다.

### 워크플로우 구조

```
[트리거] → [URL 입력] → [이미지 수집] → [PDF 추출] → [분류] → [썸네일] → [Slack 알림]
```

### 설정 방법

1. n8n에서 워크플로우 import
2. Slack Webhook URL 설정 (알림용)
3. API 서버 URL 설정 (기본: `http://localhost:8000`)
4. 트리거 설정:
   - Manual Trigger: 수동 실행
   - Schedule Trigger: 매일 오전 9시 자동 실행

> **참고:** n8n 연동을 위해서는 별도 API 서버(FastAPI 등)가 필요합니다.

---

## 설정 파일

`config/config.yaml`에서 상세 설정을 조정할 수 있습니다.

```yaml
# 출력 디렉토리
output:
  base_dir: "output"
  images_dir: "output/images"
  thumbnails_dir: "output/thumbnails"

# 웹 크롤러 설정
crawler:
  max_concurrent: 5
  timeout: 30
  min_image_size: 300  # 최소 이미지 크기 (픽셀)

# PDF 추출 설정
pdf:
  dpi: 300
  min_width: 300
  min_height: 300

# Vision 분류 설정
classifier:
  model: "gemini-2.0-flash"
  temperature: 0.3

# 썸네일 설정
thumbnail:
  width: 1280
  height: 720
  quality: 95
```

---

## 프로젝트 구조

```
이미지수집agent/
├── src/
│   ├── collector/
│   │   ├── web_crawler.py      # Crawl4AI 웹 크롤러
│   │   └── pdf_extractor.py    # PyMuPDF PDF 추출
│   ├── classifier/
│   │   └── vision_classifier.py # Gemini Vision 분류
│   ├── generator/
│   │   └── thumbnail_generator.py # 썸네일 생성
│   ├── pipeline/
│   │   └── orchestrator.py     # 통합 파이프라인
│   └── cli/
│       └── main.py             # CLI 인터페이스
├── config/
│   └── config.yaml             # 설정 파일
├── workflows/
│   └── n8n_workflow.json       # n8n 워크플로우
├── output/                     # 출력 디렉토리
├── requirements.txt
├── pyproject.toml
└── README.md
```

---

## 의존성

| 패키지 | 버전 | 용도 |
|--------|------|------|
| crawl4ai | >=0.4.0 | 웹 크롤링 |
| pymupdf | >=1.24.0 | PDF 처리 |
| google-generativeai | >=0.8.0 | Gemini Vision API |
| pillow | >=10.0.0 | 이미지 처리 |
| click | >=8.1.0 | CLI 프레임워크 |
| rich | >=13.0.0 | 터미널 UI |
| httpx | >=0.27.0 | HTTP 클라이언트 |
| aiofiles | >=24.1.0 | 비동기 파일 I/O |
| pyyaml | >=6.0.0 | 설정 파일 |
| python-dotenv | >=1.0.0 | 환경변수 |

---

## 라이선스

MIT License

---

## 문의

이 프로젝트는 Claude AI로 생성되었습니다.
