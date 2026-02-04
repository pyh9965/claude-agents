# Blog Image Collection Agent PRD

> **Version**: 1.0.0 | **Status**: Draft | **Created**: 2026-01-31

---

## 1. Executive Summary

### 문제 정의
자동화된 블로그 콘텐츠 생성 시스템에서 **이미지 수집은 여전히 수동 작업**으로 남아있어 전체 워크플로우의 병목이 됨. 콘텐츠 유형별로 필요한 이미지가 다르고, 저작권 안전한 이미지 확보가 어려움.

### 솔루션
**AI 기반 콘텐츠 분석**으로 필요 이미지를 자동 판단하고, **다중 소스 하이브리드 수집**(Google Places → 스톡 이미지 → 나노바나나 AI 생성)으로 최적의 이미지 세트 제공.

### 핵심 기능
```
┌─────────────────────────────────────────────────────────┐
│                    Image Agent Flow                      │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  [블로그 콘텐츠] ──▶ [AI 분석] ──▶ [이미지 요구사항]      │
│                          │                              │
│                          ▼                              │
│  ┌───────────────────────────────────────────────────┐ │
│  │            Hybrid Collection Pipeline              │ │
│  │  ┌─────────┐   ┌─────────┐   ┌─────────────────┐  │ │
│  │  │ Google  │──▶│  Stock  │──▶│  Nanobanana 3.0 │  │ │
│  │  │ Places  │   │ Images  │   │  Pro (AI Gen)   │  │ │
│  │  └─────────┘   └─────────┘   └─────────────────┘  │ │
│  │      1순위         2순위           3순위           │ │
│  └───────────────────────────────────────────────────┘ │
│                          │                              │
│                          ▼                              │
│  [품질 검증] ──▶ [자동 배치] ──▶ [완성된 HTML]           │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## 2. 인터뷰 결과 요약

| 항목 | 결정 사항 |
|------|-----------|
| 콘텐츠 유형 | **범용** (맛집, 여행, 라이프스타일 등 모든 주제) |
| 수집 우선순위 | **실제 사진 우선** → 스톡 → AI 생성 |
| AI 생성 범위 | 썸네일/배너, 음식 사진, 인포그래픽 |
| 이미지 수량 | **콘텐츠 분석 기반 자동 결정** |
| 이미지 배치 | **AI 자동 분석 배치** |
| 시스템 통합 | **모듈 + CLI 둘 다** 지원 |
| API 예산 | **비용 무관** (품질 우선) |
| AI 모델 | **선택 가능** (Gemini Flash/Pro, Claude) |

---

## 3. User Stories

### P0 - Must Have (핵심 기능)

#### US-001: 콘텐츠 분석 및 이미지 요구사항 추출
```
As a 블로그 자동화 시스템
I want HTML/Markdown 콘텐츠를 분석하여 필요한 이미지 목록을 자동 생성
So that 수동으로 이미지 요구사항을 정의하지 않아도 됨

Acceptance Criteria:
✓ 콘텐츠에서 주요 엔티티(장소명, 음식명, 제품명 등) 추출
✓ 섹션별 이미지 유형 판단 (썸네일, 본문, 인포그래픽 등)
✓ 콘텐츠 길이와 유형에 따른 적정 이미지 수량 결정
✓ 각 이미지에 대한 검색 키워드 및 생성 프롬프트 자동 생성
```

#### US-002: 실제 장소 사진 수집 (Google Places)
```
As a 맛집/여행 블로그 작성자
I want 언급된 실제 장소의 사진을 Google Places API에서 자동 수집
So that 실제 장소 사진으로 블로그 신뢰도를 높일 수 있음

Acceptance Criteria:
✓ 장소명 + 위치로 Google Places 검색
✓ 장소당 최대 5장의 고품질 사진 수집
✓ 사진 출처(attribution) 자동 기록
✓ 수집 실패 시 다음 소스로 자동 Fallback
```

#### US-004: AI 이미지 생성 (나노바나나 3.0 Pro)
```
As a 블로그 운영자
I want 나노바나나 3.0 Pro를 사용하여 썸네일, 배너, 인포그래픽, 음식 사진 생성
So that 실제 사진 수집 불가 시에도 고품질 이미지 확보 가능

Acceptance Criteria:
✓ 콘텐츠 분석 기반 자동 프롬프트 생성
✓ 썸네일/배너: 16:9 비율, 텍스트 오버레이 고려
✓ 음식 사진: 푸드 포토그래피 스타일
✓ 인포그래픽: 정보 요약 카드뉴스 스타일
✓ 생성 이미지에 'AI Generated' 메타데이터 포함
```

#### US-005: 하이브리드 수집 파이프라인
```
As a 시스템
I want 실제 사진 → 스톡 → AI 생성 순서로 Fallback하는 파이프라인
So that 항상 최적의 이미지를 확보할 수 있음

Acceptance Criteria:
✓ 이미지 유형별 수집 우선순위 설정 가능
✓ 1차 소스 실패 시 자동으로 다음 소스 시도
✓ 모든 소스 실패 시 AI 생성으로 최종 Fallback
✓ 수집 소스별 통계 로깅
```

#### US-008: CLI 및 모듈 인터페이스
```
As a 개발자/운영자
I want CLI로 독립 실행하거나, 모듈로 import하여 사용
So that 다양한 환경에서 유연하게 사용 가능

Acceptance Criteria:
✓ CLI: blog-image collect <content.html> --output <dir>
✓ CLI: blog-image generate --prompt <text> --type thumbnail
✓ 모듈: from blog_image_agent import ImageCollector
✓ 설정 파일(.env)로 API 키 관리
```

### P1 - Should Have

#### US-003: 스톡 이미지 수집 (Unsplash/Pexels)
- Unsplash API 우선, Pexels Fallback
- 한국어 키워드 → 영어 번역 자동 처리
- 가로형(landscape) 우선, 1200px 다운로드

#### US-006: 이미지 품질 검증 및 후처리
- 해상도 최소 기준(800x600) 검증
- 블러/노이즈 감지로 저품질 필터링
- WebP 변환으로 용량 최적화

#### US-007: 자동 이미지 배치 및 HTML 삽입
- 섹션(h2/h3) 시작에 관련 이미지 배치
- alt text 및 caption 자동 생성
- 반응형 이미지 태그 생성 (srcset)

### P2 - Nice to Have

#### US-009: AI 모델 선택 기능
- 지원: Gemini Flash, Gemini Pro, Claude
- 설정 파일 또는 CLI 옵션으로 선택

#### US-010: 이미지 캐싱 시스템
- 키워드 기반 캐시, 7일 만료
- 캐시 히트율 통계 제공

---

## 4. 나노바나나 3.0 Pro 통합

### 생성 이미지 유형별 설정

| 유형 | 비율 | 스타일 | 프롬프트 템플릿 |
|------|------|--------|-----------------|
| **Thumbnail** | 16:9 | 블로그 대표 이미지, 텍스트 오버레이 공간 | `Professional blog thumbnail for {topic}, clean composition with space for text overlay...` |
| **Banner** | 3:1 | 섹션 구분, 미니멀 디자인 | `Minimal banner image for {section_title}, subtle gradient, modern design...` |
| **Food Photo** | 4:3 | 푸드 포토그래피, 식욕 자극 | `Appetizing {dish_name}, professional food photography, warm lighting...` |
| **Infographic** | 1:1 | 카드뉴스 스타일, 정보 요약 | `Clean infographic card summarizing {topic}, minimal icons...` |

### 품질 설정
```yaml
nanobanana:
  resolution: "1024x1024"  # 기본, 최대 2048x2048
  format: "PNG → WebP"
  retry_on_failure: 3
  style_presets:
    food: "professional food photography, warm lighting, shallow depth of field"
    travel: "travel photography, vivid colors, cinematic composition"
    lifestyle: "lifestyle photography, natural lighting, candid feel"
```

---

## 5. 시스템 아키텍처

### 컴포넌트 구조

```
blog-image-agent/
├── src/
│   ├── analyzers/
│   │   ├── content_analyzer.py    # AI 콘텐츠 분석
│   │   └── entity_extractor.py    # 엔티티 추출
│   │
│   ├── collectors/
│   │   ├── base.py                # 추상 베이스
│   │   ├── google_places.py       # Google Places API
│   │   ├── stock_images.py        # Unsplash + Pexels
│   │   └── nanobanana.py          # 나노바나나 3.0 Pro
│   │
│   ├── processors/
│   │   ├── quality_validator.py   # 품질 검증
│   │   └── image_optimizer.py     # 리사이즈, WebP
│   │
│   ├── placers/
│   │   ├── auto_placer.py         # 자동 배치 로직
│   │   └── html_inserter.py       # HTML 삽입
│   │
│   ├── pipeline/
│   │   └── orchestrator.py        # 파이프라인 조율
│   │
│   └── cli/
│       └── main.py                # Click CLI
│
├── config/
│   ├── default.yaml
│   └── prompts/
│       ├── content_analysis.txt
│       ├── nanobanana_thumbnail.txt
│       └── nanobanana_food.txt
│
└── tests/
```

### 데이터 모델

```python
@dataclass
class ImageRequirement:
    id: str
    type: Literal["thumbnail", "banner", "content", "infographic", "map"]
    keywords: List[str]
    prompt: str  # AI 생성용
    section_id: str
    priority: int
    preferred_source: Literal["real", "stock", "ai", "any"]

@dataclass
class CollectedImage:
    id: str
    url: str
    local_path: str
    source: Literal["google", "unsplash", "pexels", "nanobanana"]
    width: int
    height: int
    attribution: Optional[str]
    alt_text: str
    caption: str
    requirement_id: str
```

---

## 6. API 요구사항

### Required APIs

| API | 용도 | 비용 |
|-----|------|------|
| **Google Places API (New)** | 실제 장소 사진 | $17/1000 Search + $7/1000 Photos |
| **Unsplash API** | 스톡 이미지 | 무료 (5000건/월) |
| **Pexels API** | 스톡 이미지 백업 | 무료 (20000건/월) |
| **Nanobanana 3.0 Pro** | AI 이미지 생성 | Google AI Studio 기반 |
| **Gemini API** | 콘텐츠 분석 | Flash 무료 / Pro $0.00125/1K tokens |

### Optional APIs

| API | 용도 |
|-----|------|
| Kakao Map API | 위치 지도 이미지 |
| Claude API | 콘텐츠 분석 대안 |

---

## 7. CLI 인터페이스

```bash
# 블로그 콘텐츠에서 이미지 수집
blog-image collect content.html --output ./images

# AI 이미지 직접 생성
blog-image generate --prompt "맛있는 김치찌개" --type food --output thumbnail.png

# 콘텐츠 분석만 실행
blog-image analyze content.html --output requirements.json

# 이미지 삽입된 HTML 생성
blog-image insert content.html --images ./images --output content_with_images.html

# 파이프라인 전체 실행
blog-image pipeline content.html --output ./output
```

### 모듈 사용

```python
from blog_image_agent import ImageCollector, ContentAnalyzer

# 콘텐츠 분석
analyzer = ContentAnalyzer(model="gemini-2.0-flash")
requirements = analyzer.analyze("content.html")

# 이미지 수집
collector = ImageCollector(config_path=".env")
images = await collector.collect(requirements)

# HTML 삽입
html = collector.insert_images("content.html", images)
```

---

## 8. 구현 일정

| Phase | 기간 | 주요 산출물 |
|-------|------|-------------|
| **Phase 1: Core Pipeline** | 5일 | ContentAnalyzer, Pipeline Orchestrator, 기본 CLI |
| **Phase 2: Collectors** | 4일 | Google Places, Stock, Nanobanana Collectors |
| **Phase 3: Processing** | 3일 | Image Processor, Auto Placer, HTML Inserter |
| **Phase 4: Polish** | 2일 | 모델 선택, 캐싱, naver-blog-agents 통합, 문서화 |

**총 개발 기간: 2주**

---

## 9. 성공 지표

| 지표 | 목표 |
|------|------|
| 이미지 수집 성공률 | 95% 이상 |
| 수집→배치 완료 시간 | 3분 이내 |
| 저작권 안전 이미지 | 100% |
| 이미지 품질 점수 | 80점 이상 |

---

## 10. 위험 요소

| 위험 | 확률 | 영향 | 대응 |
|------|------|------|------|
| Google Places API 비용 초과 | 중 | 중 | 캐싱 적극 활용, 스톡 우선 옵션 |
| 나노바나나 생성 품질 불균일 | 중 | 중 | 프롬프트 최적화, 재생성 로직 |
| 한국어 키워드 번역 품질 | 저 | 저 | Gemini 번역, 수동 매핑 보조 |
| 콘텐츠 분석 정확도 | 중 | 중 | Few-shot 프롬프팅, 검증 로직 |

---

**문서 작성**: Claude AI
**다음 단계**: PRD 승인 후 `/oh-my-claudecode:ralph`로 구현 시작
