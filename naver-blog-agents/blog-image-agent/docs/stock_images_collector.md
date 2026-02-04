# Stock Image Collector - Unsplash & Pexels Integration

고품질 스톡 이미지를 Unsplash와 Pexels에서 자동 수집하는 모듈입니다.

## 주요 기능

### 1. 통합 검색 전략
- **Unsplash 우선**: 고품질 이미지 우선 검색
- **Pexels Fallback**: 결과 부족 시 자동 추가 검색
- **가로형 우선**: 블로그에 적합한 landscape orientation

### 2. 한국어 지원
- 자주 사용되는 한국어 키워드 → 영어 자동 변환
- 60개 이상의 음식/장소명 매핑 테이블 내장
- 한식, 일식, 양식 등 다양한 카테고리 지원

### 3. 블로그 최적화
- Unsplash: 1080px width (regular size)
- Pexels: 940px width (large size)
- Attribution 정보 자동 생성
- 다운로드 기능 내장

## 설치

### 필수 패키지
```bash
pip install httpx
```

### API 키 발급

#### Unsplash
1. https://unsplash.com/developers 접속
2. 새 애플리케이션 등록
3. Access Key 복사

#### Pexels
1. https://www.pexels.com/api/ 접속
2. API Key 발급
3. API Key 복사

### 환경변수 설정
```bash
# .env 파일
UNSPLASH_ACCESS_KEY=your_unsplash_access_key
PEXELS_API_KEY=your_pexels_api_key
```

## 사용법

### 기본 사용

```python
import asyncio
from collectors.stock_images import StockImageCollector

async def main():
    # Collector 초기화 (환경변수에서 API 키 자동 로드)
    collector = StockImageCollector()

    # 한국어 키워드로 검색
    result = await collector.collect(["김치찌개", "한식"], max_images=5)

    if result.success:
        for img in result.images:
            print(f"[{img['source']}] {img['url']}")
            print(f"  {img['attribution']}")

    await collector.close()

asyncio.run(main())
```

### 컨텍스트 매니저 (권장)

```python
async def main():
    # 자동 리소스 정리
    async with StockImageCollector() as collector:
        result = await collector.collect(["커피", "카페"], max_images=3)

        if result.success:
            print(f"{len(result.images)}개 이미지 수집")
```

### 사용자 정의 API 키

```python
# 환경변수 대신 직접 전달
collector = StockImageCollector(
    unsplash_key="your_unsplash_key",
    pexels_key="your_pexels_key"
)
```

### 이미지 다운로드

```python
async with StockImageCollector() as collector:
    result = await collector.collect(["food"], max_images=3)

    for i, img in enumerate(result.images, 1):
        output_path = f"downloads/image_{i}.jpg"
        success = await collector.download(img['url'], output_path)

        if success:
            print(f"다운로드 완료: {output_path}")
```

## API 레퍼런스

### StockImageCollector

#### `__init__(unsplash_key=None, pexels_key=None)`

Collector 초기화

**매개변수:**
- `unsplash_key` (str, optional): Unsplash API 키 (기본: 환경변수)
- `pexels_key` (str, optional): Pexels API 키 (기본: 환경변수)

#### `async collect(keywords, max_images=5)`

스톡 이미지 수집

**매개변수:**
- `keywords` (List[str]): 검색 키워드 (한국어/영어 가능)
- `max_images` (int): 최대 이미지 수 (기본: 5)

**반환값:**
- `CollectorResult`: 수집 결과
  - `success` (bool): 성공 여부
  - `images` (List[dict]): 이미지 리스트
  - `error` (str): 에러 메시지

**이미지 정보 구조:**
```python
{
    "url": "https://...",           # 블로그용 URL (1080px/940px)
    "download_url": "https://...",  # 원본 URL
    "width": 1920,
    "height": 1080,
    "attribution": "Photo by ... on Unsplash",
    "photographer": "photographer name",
    "source": "unsplash"  # or "pexels"
}
```

#### `async search_unsplash(query, per_page=5)`

Unsplash 이미지 검색

**매개변수:**
- `query` (str): 검색어 (영어)
- `per_page` (int): 결과 수 (최대 30)

**반환값:**
- `List[dict]`: 이미지 정보 리스트

#### `async search_pexels(query, per_page=5)`

Pexels 이미지 검색

**매개변수:**
- `query` (str): 검색어 (영어)
- `per_page` (int): 결과 수 (최대 80)

**반환값:**
- `List[dict]`: 이미지 정보 리스트

#### `async download(url, output_path)`

이미지 다운로드

**매개변수:**
- `url` (str): 이미지 URL
- `output_path` (str): 저장 경로

**반환값:**
- `bool`: 성공 여부

#### `async close()`

HTTP 클라이언트 종료 (리소스 정리)

## 한국어 번역 매핑 테이블

### 한식
- 김치찌개 → kimchi stew
- 삼겹살 → Korean BBQ pork belly
- 비빔밥 → bibimbap
- 된장찌개 → soybean paste stew
- 불고기 → bulgogi
- 떡볶이 → tteokbokki
- 치킨 → Korean fried chicken
- 라면 → Korean ramen
- 순두부 → soft tofu stew
- 갈비 → Korean short ribs
- 냉면 → cold noodles
- 국수 → Korean noodles
- 파전 → Korean pancake
- (기타 다수...)

### 일식
- 규동 → gyudon beef bowl
- 돈까스 → tonkatsu pork cutlet
- 초밥 → sushi
- 라멘 → ramen
- 우동 → udon
- (기타...)

### 장소
- 서울 → Seoul
- 강남 → Gangnam Seoul
- 홍대 → Hongdae Seoul
- 명동 → Myeongdong Seoul
- 부산 → Busan
- 제주 → Jeju Island
- (기타...)

### 카테고리
- 맛집 → restaurant
- 한식 → Korean food
- 일식 → Japanese food
- 카페 → cafe
- 디저트 → dessert
- (기타...)

## 검색 전략

### 우선순위
1. **Unsplash 우선 검색**
   - 고품질 큐레이션 이미지
   - 예술적 가치 높음
   - 1080px width (블로그 최적)

2. **Pexels Fallback**
   - Unsplash 결과 부족 시 자동 실행
   - 상업적 이미지 풍부
   - 940px width (블로그 최적)

### 이미지 선택 기준
- **Orientation**: landscape (가로형 우선)
- **Size**: 블로그 최적 해상도 (1000px 내외)
- **Quality**: 고해상도, 선명한 이미지

## 에러 처리

### API 키 없음
```python
# 두 API 키 모두 없으면 빈 결과 반환
result = await collector.collect(["food"])
# result.images = []
```

### 네트워크 오류
```python
# 타임아웃, 연결 실패 시 빈 결과 반환
# 다른 소스로 Fallback 시도
```

### 검색 결과 없음
```python
result = await collector.collect(["nonexistent keyword"])
# result.success = False
# result.error = "스톡 이미지를 찾을 수 없습니다: ..."
```

## Attribution 관리

### Unsplash
```
Photo by [Photographer Name] on Unsplash
```

### Pexels
```
Photo by [Photographer Name] on Pexels
```

### 사용 시 주의사항
1. Attribution 정보 반드시 표시
2. Unsplash: 사진가 크레딧 필수
3. Pexels: 크레딧 권장 (필수 아님)

## 성능 최적화

### 타임아웃
- 기본 타임아웃: 30초
- 네트워크 불안정 시 자동 재시도 없음
- 빠른 실패로 다른 소스 활용

### 동시 검색
```python
# 여러 키워드 동시 검색
async with StockImageCollector() as collector:
    tasks = [
        collector.collect(["김치찌개"], max_images=3),
        collector.collect(["파스타"], max_images=3),
        collector.collect(["커피"], max_images=3)
    ]
    results = await asyncio.gather(*tasks)
```

## 테스트

### 테스트 실행
```bash
cd tests
python test_stock_images.py
```

### 테스트 케이스
- 한국어 번역 테스트
- Unsplash 검색 테스트
- Pexels 검색 테스트
- 통합 수집 테스트
- 다운로드 테스트
- 컨텍스트 매니저 테스트

## 사용 예제

### 예제 실행
```bash
cd examples
python stock_images_example.py
```

### 포함된 예제
1. 기본 검색
2. 컨텍스트 매니저 사용
3. 이미지 다운로드
4. 사용자 정의 API 키
5. 소스 우선순위 확인
6. 한국어 번역 확인

## 라이선스 정보

### Unsplash
- **라이선스**: Unsplash License
- **상업적 사용**: 가능
- **Attribution**: 필수
- **제한사항**: 경쟁 서비스 금지

### Pexels
- **라이선스**: Pexels License
- **상업적 사용**: 가능
- **Attribution**: 권장 (필수 아님)
- **제한사항**: 판매 금지

## 제한사항

### API Rate Limits

#### Unsplash
- 시간당 50 requests (데모/개발)
- 시간당 5,000 requests (프로덕션)

#### Pexels
- 시간당 200 requests (무료)
- 더 많은 요청 시 유료 플랜 필요

### 파일 크기
- Unsplash regular: ~500KB-2MB
- Pexels large: ~300KB-1.5MB
- 원본(full/original): 수 MB

## 문제 해결

### API 키 에러
```python
# 환경변수 확인
import os
print(os.getenv("UNSPLASH_ACCESS_KEY"))
print(os.getenv("PEXELS_API_KEY"))
```

### 검색 결과 없음
- 키워드를 영어로 변경
- 더 일반적인 키워드 사용
- max_images 값 줄이기

### 다운로드 실패
- URL 유효성 확인
- 네트워크 연결 확인
- 디스크 공간 확인
- 권한 확인

## 향후 개선 계획

1. **AI 번역 통합**: Gemini API로 정확한 번역
2. **캐싱**: 동일 검색 결과 캐싱
3. **재시도 로직**: 네트워크 오류 시 자동 재시도
4. **필터링**: 색상, 방향, 크기 등 고급 필터
5. **배치 다운로드**: 여러 이미지 동시 다운로드
6. **메타데이터**: EXIF, 색상 팔레트 등 추출
