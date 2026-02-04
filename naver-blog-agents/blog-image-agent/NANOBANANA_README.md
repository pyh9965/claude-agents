# Nanobanana 3.0 Pro Generator

Google Imagen 3 기반 AI 이미지 생성기 for Blog Image Collection Agent

## 개요

나노바나나 3.0 Pro는 Google의 최신 Imagen 3 모델을 활용하여 블로그용 고품질 이미지를 자동 생성합니다.

## 주요 기능

- ✨ **4가지 이미지 유형**: 썸네일, 배너, 푸드 포토, 인포그래픽
- 🎨 **5가지 스타일 프리셋**: food, travel, lifestyle, tech, default
- 🔄 **자동 재시도**: API 실패 시 최대 3회 재시도
- 📝 **커스텀 프롬프트**: 외부 템플릿 파일 지원
- 🚀 **비동기 처리**: async/await로 빠른 배치 생성
- 📊 **메타데이터 포함**: 생성 프롬프트, 크기, 출처 정보

## 설치

### 1. 패키지 설치

```bash
cd D:\AI프로그램제작\agent\naver-blog-agents\blog-image-agent
pip install -r requirements_nanobanana.txt
```

### 2. API 키 설정

```bash
# Windows
set GOOGLE_API_KEY=your_api_key_here

# Linux/Mac
export GOOGLE_API_KEY=your_api_key_here
```

## 빠른 시작

### 기본 사용법

```python
import asyncio
from src.collectors.nanobanana import NanobananGenerator

async def main():
    # Generator 초기화
    generator = NanobananGenerator()

    # 이미지 생성
    result = await generator.collect(
        keywords=["맛집", "리뷰", "강남"],
        max_images=1,
        image_type="thumbnail",
        style="food"
    )

    # 이미지 저장
    if result.success:
        img = result.images[0]
        generator.save_image(img['data'], "output/thumbnail.png")
        print(f"✅ 생성 완료: {img['width']}x{img['height']}")

asyncio.run(main())
```

### 빠른 시작 스크립트

```bash
# 샘플 이미지 생성
python scripts/quick_start_nanobanana.py

# 대화형 모드
python scripts/quick_start_nanobanana.py --interactive
```

## 이미지 유형

### 1. Thumbnail (썸네일)
- **크기**: 1024x576 (16:9)
- **용도**: 블로그 포스트 썸네일
- **특징**: 텍스트 오버레이 공간, 클릭을 유도하는 디자인

```python
result = await generator.collect(
    keywords=["여행", "제주도"],
    image_type="thumbnail",
    style="travel"
)
```

### 2. Banner (배너)
- **크기**: 1024x576 (16:9)
- **용도**: 블로그 헤더 배너
- **특징**: 미니멀 디자인, 부드러운 그라데이션

```python
result = await generator.collect(
    keywords=["기술", "블로그"],
    image_type="banner",
    style="tech"
)
```

### 3. Food Photo (푸드 포토)
- **크기**: 1024x768 (4:3)
- **용도**: 음식 리뷰 사진
- **특징**: 자연광, 얕은 심도, 한식 세팅

```python
result = await generator.collect(
    keywords=["김치찌개", "한식"],
    image_type="food_photo",
    style="food"
)
```

### 4. Infographic (인포그래픽)
- **크기**: 1024x1024 (1:1)
- **용도**: 카드뉴스, 정보 전달
- **특징**: 플랫 디자인, 아이콘, 한글 친화적

```python
result = await generator.collect(
    keywords=["건강", "팁", "5가지"],
    image_type="infographic",
    style="lifestyle",
    brand_color="green"
)
```

## 스타일 프리셋

| 스타일 | 설명 | 추천 분야 |
|--------|------|-----------|
| `food` | 따뜻한 조명, 식욕을 돋우는 | 맛집, 요리, 레시피 |
| `travel` | 생생한 색감, 영화 같은 풍경 | 여행, 관광, 풍경 |
| `lifestyle` | 자연스러운, 현대적 | 일상, 라이프스타일, 건강 |
| `tech` | 세련된, 미래적, 깔끔한 | 기술, IT, 가젯 |
| `default` | 전문적인, 고품질 | 일반 |

## 고급 사용법

### 직접 이미지 생성

```python
generated = await generator.generate_image(
    prompt="서울 야경",
    image_type="banner",
    style="travel",
    negative_prompt="people, cars, traffic"
)

if generated:
    generator.save_image(generated.data, "output/night_view.png")
```

### 배치 생성

```python
tasks = [
    generator.collect(keywords=["여행"], image_type="thumbnail"),
    generator.collect(keywords=["음식"], image_type="food_photo"),
    generator.collect(keywords=["정보"], image_type="infographic")
]

results = await asyncio.gather(*tasks)
```

### 외부 템플릿 사용

```python
# 템플릿 로드
template = generator.load_prompt_template(
    "config/prompts/nanobanana_food.txt"
)

# 포맷팅
formatted = template.format(dish_name="불고기")
```

## 프로젝트 구조

```
blog-image-agent/
├── src/collectors/
│   └── nanobanana.py          # 메인 구현체
├── config/
│   ├── nanobanana_config.yaml # 설정 파일
│   └── prompts/
│       ├── nanobanana_thumbnail.txt
│       ├── nanobanana_food.txt
│       └── nanobanana_infographic.txt
├── tests/
│   └── test_nanobanana.py     # 단위 테스트
├── examples/
│   ├── nanobanana_example.py  # 기본 예제
│   └── nanobanana_integration.py  # 통합 예제
├── scripts/
│   └── quick_start_nanobanana.py  # 빠른 시작 스크립트
├── docs/
│   └── nanobanana_guide.md    # 상세 가이드
└── requirements_nanobanana.txt
```

## 예제 모음

### 1. 기본 예제
```bash
python examples/nanobanana_example.py
```

다음을 포함합니다:
- 썸네일 생성
- 푸드 포토 생성
- 인포그래픽 생성
- 커스텀 프롬프트
- 배치 생성
- 외부 템플릿 로드

### 2. 통합 예제
```bash
python examples/nanobanana_integration.py
```

다음을 포함합니다:
- 하이브리드 접근 (실제 사진 + AI)
- 폴백 전략
- 콘텐츠별 맞춤 생성
- 브랜드 일관성 유지
- SEO 최적화

## 테스트

```bash
# 전체 테스트 실행
pytest tests/test_nanobanana.py -v

# 커버리지 포함
pytest tests/test_nanobanana.py --cov=src.collectors.nanobanana
```

## API 응답 구조

```python
{
    "success": True,
    "images": [
        {
            "url": "data:image/png;base64,...",
            "data": b"...",  # 실제 이미지 바이트
            "width": 1024,
            "height": 576,
            "attribution": "AI Generated by Nanobanana 3.0 Pro (Imagen 3)",
            "source": "nanobanana",
            "prompt": "...",
            "image_type": "thumbnail",
            "style": "food"
        }
    ],
    "error": None
}
```

## 설정 파일

`config/nanobanana_config.yaml`에서 다음을 설정할 수 있습니다:

- API 설정 (모델, 재시도, 타임아웃)
- 기본 이미지 설정
- 이미지 유형별 설정
- 스타일 프리셋
- 네거티브 프롬프트
- 출력 설정
- 로깅 설정

## 성능 최적화

### 병렬 처리
```python
# 느림 (순차)
for kw in keywords:
    result = await generator.collect(keywords=[kw])

# 빠름 (병렬)
tasks = [generator.collect(keywords=[kw]) for kw in keywords]
results = await asyncio.gather(*tasks)
```

### 재시도 조정
```python
# 빠른 실패 (1회 시도)
generator = NanobananGenerator(max_retries=1)

# 안정성 우선 (5회 재시도)
generator = NanobananGenerator(max_retries=5)
```

## 제한사항

- **API 할당량**: Google API 일일 한도 확인 필요
- **생성 시간**: 이미지당 약 5-10초
- **최대 해상도**: 1024px
- **종횡비**: 16:9, 4:3, 1:1만 지원
- **안전 필터**: 부적절한 콘텐츠 자동 차단

## 문제 해결

### API 키 오류
```
ValueError: GOOGLE_API_KEY 환경변수 필요
```
→ 환경변수 설정 또는 `NanobananGenerator(api_key="...")` 사용

### 생성 실패
```
AI 이미지 생성 실패 (모든 재시도 소진)
```
→ API 할당량 확인, 프롬프트 수정, 재시도 횟수 증가

### 안전 필터
일부 키워드가 차단될 수 있습니다. 더 중립적인 표현으로 변경하세요.

## 라이선스

생성된 이미지는 다음 attribution을 포함합니다:
```
AI Generated by Nanobanana 3.0 Pro (Imagen 3)
```

블로그 게시 시 AI 생성 이미지임을 명시하는 것을 권장합니다.

## 참고 자료

- [상세 가이드](docs/nanobanana_guide.md)
- [Google Imagen 3 문서](https://ai.google.dev/gemini-api/docs/imagen)
- [google-genai SDK](https://github.com/googleapis/python-genai)

## 지원

문제가 발생하면 다음을 확인하세요:
1. GOOGLE_API_KEY 환경변수 설정 확인
2. 패키지 설치 확인 (`pip install -r requirements_nanobanana.txt`)
3. API 할당량 확인
4. 테스트 실행 (`pytest tests/test_nanobanana.py`)

---

**Made with Nanobanana 3.0 Pro (Imagen 3)** ✨
