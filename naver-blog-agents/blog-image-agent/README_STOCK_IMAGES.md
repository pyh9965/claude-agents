# Stock Image Collector - Quick Start

Unsplash와 Pexels에서 고품질 스톡 이미지를 자동 수집합니다.

## 빠른 시작

### 1. API 키 발급

```bash
# Unsplash: https://unsplash.com/developers
# Pexels: https://www.pexels.com/api/
```

### 2. 환경변수 설정

```bash
export UNSPLASH_ACCESS_KEY="your_key_here"
export PEXELS_API_KEY="your_key_here"
```

### 3. 사용 예제

```python
import asyncio
from collectors.stock_images import StockImageCollector

async def main():
    async with StockImageCollector() as collector:
        # 한국어 키워드로 검색
        result = await collector.collect(["김치찌개", "한식"], max_images=5)

        if result.success:
            for img in result.images:
                print(f"[{img['source']}] {img['attribution']}")
                print(f"  → {img['url']}")

asyncio.run(main())
```

## 주요 기능

- ✅ Unsplash & Pexels 통합 검색
- ✅ 한국어 키워드 자동 번역 (60+ 매핑)
- ✅ 가로형 이미지 우선
- ✅ 블로그 최적 해상도 (1080px/940px)
- ✅ Attribution 자동 생성
- ✅ 이미지 다운로드 기능

## 검색 전략

1. **Unsplash 우선 검색** (고품질 큐레이션)
2. **Pexels Fallback** (결과 부족 시)
3. **가로형 우선** (landscape orientation)

## 한국어 지원

```python
# 자동 번역 예시
["김치찌개", "맛집"] → "kimchi stew restaurant"
["서울", "카페"] → "Seoul cafe"
["규동"] → "gyudon beef bowl"
```

### 지원 카테고리
- 한식: 김치찌개, 삼겹살, 비빔밥, 불고기, 떡볶이 등
- 일식: 규동, 돈까스, 초밥, 라멘, 우동 등
- 장소: 서울, 강남, 홍대, 명동, 부산, 제주 등
- 기타: 카페, 디저트, 레스토랑 등

## API 레퍼런스

### collect(keywords, max_images=5)

```python
result = await collector.collect(["김치찌개"], max_images=5)

# CollectorResult
# - success: bool
# - images: List[dict]
# - error: str | None

# Image dict
# - url: str (블로그용 URL)
# - download_url: str (원본 URL)
# - width: int
# - height: int
# - attribution: str
# - photographer: str
# - source: "unsplash" | "pexels"
```

### download(url, output_path)

```python
success = await collector.download(
    img['url'],
    "downloads/image.jpg"
)
```

## 테스트

```bash
# 전체 테스트
cd tests
python test_stock_images.py

# 예제 실행
cd examples
python stock_images_example.py
```

## Attribution

### Unsplash
```
Photo by [Name] on Unsplash
```

### Pexels
```
Photo by [Name] on Pexels
```

반드시 블로그에 표시하세요!

## Rate Limits

### Unsplash
- 데모: 50 requests/hour
- 프로덕션: 5,000 requests/hour

### Pexels
- 무료: 200 requests/hour

## 문서

자세한 내용은 다음 문서를 참고하세요:
- [전체 문서](docs/stock_images_collector.md)
- [API 레퍼런스](docs/stock_images_collector.md#api-레퍼런스)
- [사용 예제](examples/stock_images_example.py)

## 파일 구조

```
blog-image-agent/
├── src/
│   └── collectors/
│       ├── base.py
│       ├── stock_images.py          # ← 구현 파일
│       └── __init__.py
├── tests/
│   └── test_stock_images.py         # ← 테스트
├── examples/
│   └── stock_images_example.py      # ← 예제
├── docs/
│   └── stock_images_collector.md    # ← 문서
└── README_STOCK_IMAGES.md           # ← 이 파일
```

## 라이선스

- Unsplash: 상업적 사용 가능, Attribution 필수
- Pexels: 상업적 사용 가능, Attribution 권장

## 문제 해결

### API 키 에러
```python
import os
print(os.getenv("UNSPLASH_ACCESS_KEY"))  # None이면 미설정
```

### 검색 결과 없음
- 더 일반적인 키워드 사용
- 영어 키워드로 시도
- max_images 값 줄이기

### 다운로드 실패
- URL 유효성 확인
- 네트워크 연결 확인
- 디렉토리 권한 확인

## 향후 개선

- [ ] Gemini API 번역 통합
- [ ] 검색 결과 캐싱
- [ ] 네트워크 재시도 로직
- [ ] 고급 필터링 (색상, 크기 등)
- [ ] 배치 다운로드 최적화
