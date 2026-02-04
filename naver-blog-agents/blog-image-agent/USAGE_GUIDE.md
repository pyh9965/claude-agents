# Blog Image Agent 사용 가이드

> **Version**: 1.0.0 | **Last Updated**: 2026-01-31

---

## 목차

1. [설치](#1-설치)
2. [환경 설정](#2-환경-설정)
3. [CLI 사용법](#3-cli-사용법)
4. [Python 모듈 사용법](#4-python-모듈-사용법)
5. [출력 구조](#5-출력-구조)
6. [이미지 수집 우선순위](#6-이미지-수집-우선순위)
7. [지원 이미지 유형](#7-지원-이미지-유형)
8. [고급 설정](#8-고급-설정)
9. [문제 해결](#9-문제-해결)

---

## 1. 설치

### 기본 설치

```bash
cd D:\AI프로그램제작\agent\naver-blog-agents\blog-image-agent

# 의존성 설치
pip install -r requirements.txt

# 패키지 설치 (CLI 사용을 위해)
pip install -e .
```

### 설치 확인

```bash
# CLI 명령어 확인
blog-image --help

# 모듈 import 확인
python -c "from blog_image_agent import collect_images; print('OK')"
```

---

## 2. 환경 설정

### .env 파일 생성

프로젝트 루트에 `.env` 파일을 생성하고 API 키를 입력합니다:

```bash
# .env 파일 예제 복사
cp .env.example .env
```

### API 키 설정

```env
# ============================================
# 필수 API 키
# ============================================

# Google Gemini API (콘텐츠 분석 + AI 이미지 생성)
# 발급: https://aistudio.google.com/app/apikey
GOOGLE_API_KEY=your_gemini_api_key

# ============================================
# 선택 API 키 (없어도 동작, Fallback 사용)
# ============================================

# Google Places API (실제 장소 사진 수집)
# 발급: https://console.cloud.google.com/
GOOGLE_PLACES_API_KEY=your_places_api_key

# Unsplash API (스톡 이미지)
# 발급: https://unsplash.com/developers
UNSPLASH_ACCESS_KEY=your_unsplash_key

# Pexels API (스톡 이미지 백업)
# 발급: https://www.pexels.com/api/
PEXELS_API_KEY=your_pexels_key
```

### 설정 확인

```bash
blog-image config
```

---

## 3. CLI 사용법

### 전체 파이프라인 실행

콘텐츠 분석부터 이미지 삽입까지 한 번에 실행:

```bash
blog-image pipeline content.html -o ./output
```

**옵션:**
- `-o, --output`: 출력 디렉토리 (기본: ./output)
- `--model`: AI 모델 선택 (gemini-2.0-flash, gemini-2.0-pro)

### 콘텐츠 분석

블로그 콘텐츠를 분석하여 필요한 이미지 목록 생성:

```bash
blog-image analyze content.html -o requirements.json
```

**출력 예시 (requirements.json):**
```json
[
  {
    "id": "img_001",
    "type": "thumbnail",
    "keywords": ["서울역", "맛집"],
    "prompt": "Seoul station restaurant area, professional food photography",
    "priority": 10,
    "preferred_source": "real"
  }
]
```

### 이미지 수집

분석된 요구사항에 따라 이미지 수집:

```bash
blog-image collect content.html -o ./images
```

**옵션:**
- `-o, --output`: 이미지 저장 디렉토리
- `--max-images`: 최대 이미지 수 (기본: 15)

### AI 이미지 생성

나노바나나 3.0 Pro로 이미지 직접 생성:

```bash
# 음식 사진 생성
blog-image generate -p "맛있는 김치찌개, 뜨거운 김이 모락모락" -t food_photo -o kimchi.png

# 썸네일 생성
blog-image generate -p "서울역 주변 맛집 탐방" -t thumbnail -o thumbnail.png

# 인포그래픽 생성
blog-image generate -p "직장인 점심 추천 TOP 5" -t infographic -o info.png
```

**옵션:**
- `-p, --prompt`: 이미지 생성 프롬프트 (필수)
- `-t, --type`: 이미지 유형 (thumbnail, banner, content, food_photo, infographic)
- `-o, --output`: 출력 파일 경로

### 이미지 HTML 삽입

수집된 이미지를 HTML에 자동 삽입:

```bash
blog-image insert content.html -i ./images -o result.html
```

**옵션:**
- `-i, --images`: 이미지 디렉토리
- `-o, --output`: 출력 HTML 파일

---

## 4. Python 모듈 사용법

### 간단한 사용 (원라인)

```python
import asyncio
from blog_image_agent import collect_images

async def main():
    # HTML 파일 읽기
    with open("blog.html", encoding="utf-8") as f:
        html = f.read()

    # 이미지 수집 및 삽입
    result = await collect_images(html, output_dir="./output")

    if result.success:
        print(f"수집된 이미지: {result.statistics.total}개")
        print(f"출력 HTML 저장됨")
    else:
        print(f"오류: {result.errors}")

asyncio.run(main())
```

### 단계별 사용

```python
import asyncio
from blog_image_agent import (
    ContentAnalyzer,
    PipelineOrchestrator,
    PipelineConfig
)

async def main():
    html_content = open("blog.html", encoding="utf-8").read()

    # 1단계: 콘텐츠 분석
    analyzer = ContentAnalyzer(model="gemini-2.0-flash")
    requirements = analyzer.analyze_content(html_content)

    print(f"분석 완료: {len(requirements)}개 이미지 필요")
    for req in requirements:
        print(f"  - [{req.type}] {req.keywords} (우선순위: {req.priority})")

    # 2단계: 파이프라인 설정
    config = PipelineConfig(
        output_dir="./output",
        collection_priority=["google", "stock", "nanobanana"],
        convert_to_webp=True,
        image_quality=85,
        cache_enabled=True
    )

    # 3단계: 파이프라인 실행
    orchestrator = PipelineOrchestrator(config)
    result = await orchestrator.run(html_content, content_id="my_blog")

    # 4단계: 결과 확인
    if result.success:
        print(f"\n성공!")
        print(f"  총 이미지: {result.statistics.total}개")
        print(f"  소스별: {result.statistics.by_source}")
        print(f"  실행 시간: {result.execution_time:.2f}초")

        # 결과 HTML 저장
        with open("output/final.html", "w", encoding="utf-8") as f:
            f.write(result.output_html)
    else:
        print(f"실패: {result.errors}")

    await orchestrator.close()

asyncio.run(main())
```

### 개별 컴포넌트 사용

#### ContentAnalyzer (콘텐츠 분석)

```python
from blog_image_agent import ContentAnalyzer

analyzer = ContentAnalyzer(
    model="gemini-2.0-flash",  # 또는 "gemini-2.0-pro"
    api_key="your_api_key"     # 생략 시 환경변수 사용
)

# HTML 분석
requirements = analyzer.analyze_content(html, content_type="html")

# Markdown 분석
requirements = analyzer.analyze_content(markdown, content_type="markdown")

# 결과 저장
analyzer.save_requirements(requirements, "requirements.json")
```

#### StockImageCollector (스톡 이미지)

```python
import asyncio
from src.collectors import StockImageCollector

async def main():
    async with StockImageCollector() as collector:
        # 한국어 키워드로 검색 (자동 번역)
        result = await collector.collect(
            keywords=["김치찌개", "한식", "맛집"],
            max_images=5
        )

        if result.success:
            for img in result.images:
                print(f"[{img['source']}] {img['url']}")

                # 다운로드
                await collector.download(img['url'], f"image_{img['id']}.jpg")

asyncio.run(main())
```

#### NanobananGenerator (AI 이미지 생성)

```python
import asyncio
from src.collectors import NanobananGenerator

async def main():
    async with NanobananGenerator() as generator:
        # 음식 사진 생성
        result = await generator.generate(
            prompt="맛있는 김치찌개",
            image_type="food_photo",
            style="food"
        )

        if result.success:
            # 이미지 저장
            with open("kimchi.png", "wb") as f:
                f.write(result.images[0]["data"])

asyncio.run(main())
```

---

## 5. 출력 구조

파이프라인 실행 후 생성되는 파일 구조:

```
output/
├── images/
│   ├── img_001_google.webp      # Google Places에서 수집
│   ├── img_002_stock.webp       # Unsplash/Pexels에서 수집
│   ├── img_003_nanobanana.webp  # AI로 생성
│   └── ...
├── content_with_images.html     # 이미지가 삽입된 최종 HTML
└── image_map.json               # 이미지 매핑 정보
```

### image_map.json 구조

```json
{
  "content_id": "my_blog",
  "created_at": "2026-01-31T12:00:00",
  "images": [
    {
      "id": "img_001",
      "local_path": "images/img_001_google.webp",
      "source": "google",
      "alt_text": "서울역 맛집 이미지",
      "width": 1200,
      "height": 800
    }
  ],
  "statistics": {
    "total": 5,
    "by_source": {"google": 2, "stock": 2, "nanobanana": 1}
  }
}
```

---

## 6. 이미지 수집 우선순위

### 기본 우선순위

| 콘텐츠 유형 | 1순위 | 2순위 | 3순위 (Fallback) |
|------------|-------|-------|------------------|
| 맛집/여행 (real) | Google Places | Stock Images | AI 생성 |
| 라이프스타일 (stock) | Stock Images | Google Places | AI 생성 |
| AI 우선 (ai) | AI 생성 | Stock Images | Google Places |
| 기본 (any) | 설정값 따름 | - | - |

### 커스텀 우선순위 설정

```python
config = PipelineConfig(
    collection_priority=["stock", "nanobanana", "google"]
)
```

---

## 7. 지원 이미지 유형

| 유형 | 비율 | 크기 | 용도 |
|------|------|------|------|
| `thumbnail` | 16:9 | 1024x576 | 블로그 대표 이미지, OG 이미지 |
| `banner` | 16:9 | 1024x576 | 섹션 배너, 헤더 이미지 |
| `content` | 4:3 | 800x600 | 본문 일반 이미지 |
| `food_photo` | 4:3 | 1024x768 | 음식 사진 (푸드 포토그래피) |
| `infographic` | 1:1 | 1024x1024 | 카드뉴스, 정보 요약 |
| `map` | 16:9 | - | 지도 이미지 (향후 지원) |

---

## 8. 고급 설정

### PipelineConfig 전체 옵션

```python
from blog_image_agent import PipelineConfig

config = PipelineConfig(
    # 출력 설정
    output_dir="./output",

    # 이미지 수량 제한
    min_images_per_content=3,
    max_images_per_content=15,

    # Fallback 옵션
    fallback_to_stock=True,
    fallback_to_ai=True,

    # 이미지 최적화
    optimize_images=True,
    convert_to_webp=True,
    image_quality=85,

    # 캐싱
    cache_enabled=True,
    cache_dir=".cache/images",

    # 수집 우선순위
    collection_priority=["google", "stock", "nanobanana"]
)
```

### 캐시 관리

```python
from src.utils import ImageCache

cache = ImageCache(".cache/images", ttl_days=7)

# 캐시 통계
stats = cache.get_stats()
print(f"히트율: {stats.hit_rate:.1%}")

# 캐시 정리
cache.cleanup()

# 캐시 무효화
cache.invalidate(["김치찌개"])
```

---

## 9. 문제 해결

### API 키 오류

```
ValueError: GOOGLE_API_KEY 환경변수가 설정되지 않았습니다.
```

**해결:** `.env` 파일에 API 키 추가 또는 직접 전달

```python
analyzer = ContentAnalyzer(api_key="your_key")
```

### 이미지 수집 실패

```
[Pipeline] ✗ 모든 소스에서 이미지 수집 실패
```

**해결:**
1. API 키 확인 (`blog-image config`)
2. 네트워크 연결 확인
3. Fallback 옵션 활성화 확인

### 캐시 문제

```bash
# 캐시 디렉토리 삭제
rm -rf .cache/images
```

### 로그 확인

```python
import logging
logging.basicConfig(level=logging.DEBUG)
```

---

## 문의

- 프로젝트: `D:\AI프로그램제작\agent\naver-blog-agents\blog-image-agent`
- 이슈: GitHub Issues
- 문서: `README.md`, `USAGE_EXAMPLES.md`
