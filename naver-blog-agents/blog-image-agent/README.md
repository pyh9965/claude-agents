# Blog Image Collection Agent

블로그 콘텐츠를 분석하여 필요한 이미지를 자동으로 수집하고 생성하는 AI 에이전트.

## 주요 기능

- **콘텐츠 분석**: AI가 블로그 콘텐츠를 분석하여 필요한 이미지 자동 판단
- **하이브리드 수집**: 실제 사진 → 스톡 이미지 → AI 생성 순서로 최적의 이미지 확보
- **AI 이미지 생성**: 나노바나나 3.0 Pro (Imagen 3)로 고품질 이미지 생성
- **자동 배치**: 콘텐츠의 적절한 위치에 이미지 자동 삽입
- **품질 최적화**: WebP 변환, 리사이즈, 블러 검사 등

## 설치

```bash
cd blog-image-agent
pip install -r requirements.txt
```

## 환경 설정

`.env` 파일을 생성하고 API 키를 설정하세요:

```env
# 필수: Google API (Gemini, Nanobanana)
GOOGLE_API_KEY=your_google_api_key

# 선택: 스톡 이미지 API
UNSPLASH_ACCESS_KEY=your_unsplash_key
PEXELS_API_KEY=your_pexels_key
```

## 사용법

### CLI 사용

```bash
# 전체 파이프라인 실행
python -m cli.main pipeline content.html -o ./output

# 콘텐츠 분석만
python -m cli.main analyze content.html -o requirements.json

# AI 이미지 생성
python -m cli.main generate -p "맛있는 김치찌개" -t food_photo

# 설정 확인
python -m cli.main config
```

### Python 모듈 사용

```python
import asyncio
from blog_image_agent import collect_images, PipelineOrchestrator, PipelineConfig

# 간편 사용
async def main():
    html = open("my_blog.html", encoding="utf-8").read()
    result = await collect_images(html, "output")
    print(f"수집된 이미지: {result.statistics.total}개")

asyncio.run(main())

# 상세 설정 사용
async def advanced():
    config = PipelineConfig(
        output_dir="output",
        collection_priority=["google", "stock", "nanobanana"],
        convert_to_webp=True,
        image_quality=85
    )

    orchestrator = PipelineOrchestrator(config)
    result = await orchestrator.run(html_content, "output")
    await orchestrator.close()

    return result
```

## 이미지 수집 우선순위

1. **Google Places API**: 맛집, 여행지 등 실제 장소 사진
2. **Unsplash/Pexels**: 무료 스톡 이미지
3. **나노바나나 3.0 Pro**: AI 생성 이미지 (최후의 수단)

## 지원하는 이미지 유형

| 유형 | 비율 | 용도 |
|------|------|------|
| thumbnail | 16:9 | 블로그 대표 이미지 |
| banner | 3:1 | 섹션 구분 배너 |
| content | 4:3 | 본문 이미지 |
| food_photo | 4:3 | 음식 사진 |
| infographic | 1:1 | 정보 요약 카드 |

## 프로젝트 구조

```
blog-image-agent/
├── src/
│   ├── __init__.py          # 패키지 공개 API
│   ├── models.py            # 데이터 모델
│   ├── analyzers/           # 콘텐츠 분석
│   │   ├── content_analyzer.py
│   │   └── entity_extractor.py
│   ├── collectors/          # 이미지 수집
│   │   ├── base.py
│   │   ├── google_places.py
│   │   ├── stock_images.py
│   │   └── nanobanana.py
│   ├── processors/          # 이미지 처리
│   │   ├── quality_validator.py
│   │   └── image_optimizer.py
│   ├── placers/             # 이미지 배치
│   │   ├── auto_placer.py
│   │   └── html_inserter.py
│   ├── pipeline/            # 파이프라인 오케스트레이션
│   │   └── orchestrator.py
│   ├── cli/                 # CLI 인터페이스
│   │   └── main.py
│   └── utils/               # 유틸리티
│       ├── config.py
│       ├── cache.py
│       └── translator.py
├── config/
│   ├── default.yaml         # 기본 설정
│   ├── nanobanana_config.yaml
│   └── prompts/             # AI 프롬프트
│       ├── content_analysis.txt
│       ├── nanobanana_food.txt
│       ├── nanobanana_infographic.txt
│       └── nanobanana_thumbnail.txt
├── requirements.txt
├── setup.py
├── pyproject.toml
└── README.md
```

## API 요구사항

| API | 용도 | 필수 여부 |
|-----|------|-----------|
| Google API (Gemini) | 콘텐츠 분석, AI 이미지 생성 | 필수 |
| Unsplash API | 스톡 이미지 | 권장 |
| Pexels API | 스톡 이미지 백업 | 선택 |
| Google Places API | 실제 장소 사진 | 선택 |

## 주요 컴포넌트

### 1. Content Analyzer
AI 모델(Gemini)을 사용하여 블로그 콘텐츠를 분석하고 이미지 요구사항을 생성합니다.

```python
from blog_image_agent import ContentAnalyzer

analyzer = ContentAnalyzer(api_key="your-key", model="gemini-2.0-flash")
requirements = analyzer.analyze_content(html_content, content_type="html")
```

### 2. Image Collectors
다양한 소스에서 이미지를 수집합니다.

- **GooglePlacesCollector**: 실제 장소 사진
- **StockImageCollector**: Unsplash/Pexels 무료 스톡 이미지
- **NanobananGenerator**: AI 이미지 생성

### 3. Image Processors
이미지 품질 검증 및 최적화를 수행합니다.

- **QualityValidator**: 블러 검사, 해상도 검증
- **ImageOptimizer**: WebP 변환, 리사이즈, 압축

### 4. Auto Placer
콘텐츠 구조를 분석하여 이미지를 최적의 위치에 자동 배치합니다.

### 5. Pipeline Orchestrator
전체 이미지 수집 프로세스를 조율합니다.

## 분석 규칙

ContentAnalyzer는 다음 규칙에 따라 이미지 요구사항을 생성합니다:

1. **썸네일**: 항상 1개 필요 (type: thumbnail, priority: 10)
2. **섹션별 이미지**: 각 h2/h3 섹션당 최소 1개의 content 이미지
3. **맛집/여행 콘텐츠**: 실제 사진(real) 우선
4. **라이프스타일/제품**: 스톡 이미지(stock) 우선
5. **음식명 감지**: 해당 음식 이미지 필요
6. **장소명+위치**: Google Places 검색 가능
7. **이미지 간격**: 최소 300자 이상 간격 유지
8. **총 이미지 수**: 콘텐츠 길이에 비례 (1000자당 약 2장)

## 개발 설정

```bash
# 개발 의존성 설치
pip install -r requirements.txt
pip install pytest pytest-asyncio black

# 테스트 실행
pytest tests/

# 코드 포맷팅
black src/
```

## 라이선스

MIT License
