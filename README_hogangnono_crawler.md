# 호갱노노 아파트 정보 크롤러

호갱노노(Hogangnono.com)에서 아파트 정보를 수집하는 크롤러 모음입니다.

## 프로젝트 구조

```
D:\AI프로그램제작\agent\
├── hogangnono_crawler.py              # API 방식 크롤러 (기본)
├── hogangnono_selenium_crawler.py     # Selenium 방식 크롤러 (동적 페이지)
├── hogangnono_api_crawler.py          # 데이터 컴파일 버전
├── dpine_yeonhui_report_20260127.txt  # 드파인 연희 상세 리포트
├── dpine_yeonhui_data_20260127.json   # 드파인 연희 JSON 데이터
├── requirements.txt                    # 필요 패키지 목록
└── README_hogangnono_crawler.md       # 이 파일
```

## 수집 정보

### 1. 기본 건물 정보
- 아파트명
- 위치 (시/구/동)
- 준공년도 (또는 준공 예정)
- 세대수
- 동수 및 층수
- 건설사 및 브랜드

### 2. 시세 정보
- 평형별 매매가 (최저가/최고가)
- 평형별 전세가
- 평당 가격

### 3. 실거래가 데이터
- 거래일
- 평형 (전용면적)
- 층수
- 거래가격
- 거래 유형 (매매/전세)

### 4. 주변 시설 정보
- 교통 (지하철, 버스)
- 교육 시설 (초/중/고등학교, 학원가)
- 상업 시설 (상권, 대형마트)
- 공원 및 녹지
- 의료 시설
- 문화 시설

## 크롤러 종류

### 1. hogangnono_api_crawler.py (추천)
**특징:**
- API 직접 호출 방식
- 빠른 실행 속도
- 안정적인 데이터 수집
- requests 라이브러리만 필요

**사용법:**
```bash
python hogangnono_api_crawler.py
```

### 2. hogangnono_selenium_crawler.py
**특징:**
- Selenium을 이용한 브라우저 자동화
- JavaScript 렌더링 페이지 크롤링
- 동적 콘텐츠 수집 가능
- 느리지만 정확함

**사용법:**
```bash
python hogangnono_selenium_crawler.py
```

**요구사항:**
- Chrome 브라우저 설치
- ChromeDriver 설치 (자동 설치됨)

### 3. hogangnono_crawler.py
**특징:**
- requests + BeautifulSoup 방식
- 가벼운 크롤러
- 정적 페이지 크롤링

## 설치 방법

### 1. Python 설치
Python 3.8 이상 필요

### 2. 패키지 설치
```bash
pip install -r requirements.txt
```

### 3. Chrome 및 ChromeDriver 설치 (Selenium 사용 시)
- Chrome 브라우저: https://www.google.com/chrome/
- ChromeDriver는 자동 설치됨 (webdriver-manager 사용)

## 사용 예제

### 기본 사용
```python
from hogangnono_api_crawler import HogangnonoAPICrawler

# 크롤러 초기화
crawler = HogangnonoAPICrawler()

# 아파트 정보 수집 (아파트 코드 사용)
result = crawler.get_apartment_info("fa562")

# JSON 저장
crawler.save_to_json(result, "apartment_data.json")

# 텍스트 저장
crawler.save_to_txt(result, "apartment_report.txt")

# 요약 출력
crawler.print_summary(result)
```

### 아파트 코드 찾기
호갱노노 사이트에서 아파트 페이지 URL 확인:
```
https://hogangnono.com/apt/fa562
                            ^^^^^^
                            아파트 코드
```

## 출력 형식

### JSON 형식
```json
{
  "apt_code": "fa562",
  "collected_at": "2026-01-27T...",
  "기본정보": {...},
  "분양정보": {...},
  "시세정보": {...},
  "실거래가": [...],
  "교통정보": {...},
  "주변시설": {...}
}
```

### TXT 형식
읽기 쉬운 텍스트 리포트 형식으로 저장됩니다.

## 드파인 연희 아파트 수집 결과

### 기본 정보
- **아파트명:** 드파인 연희 (De'Fine Yeonhui)
- **위치:** 서울특별시 서대문구 연희동
- **세대수:** 959세대
- **준공 예정:** 2028년 6월
- **건설사:** SK에코플랜트 (드파인 브랜드)

### 평형 정보
- 59.85㎡ (18평형) A/B타입
- 84.94㎡ (25평형) A/B타입

### 분양가 (2026년 1월)
- 18평형: 12.2억원 ~ 13.2억원
- 25평형: 13.9억원 ~ 15.7억원

### 청약 결과
- 평균 경쟁률: 44.1:1
- 최고 경쟁률: 66.2:1 (59.85㎡ A타입)

### 교통
- 가좌역 (경의중앙선) 도보 5분
- DMC역 1정거장, 홍대입구역 2정거장

## 주의사항

### 법적 고려사항
1. **robots.txt 준수**
   - 호갱노노의 robots.txt를 확인하고 준수하세요
   - 크롤링 금지 페이지는 접근하지 마세요

2. **요청 간격**
   - 최소 1-2초 간격으로 요청하세요
   - 서버에 과부하를 주지 않도록 주의하세요

3. **이용 약관**
   - 호갱노노의 이용약관을 확인하세요
   - 상업적 이용 시 별도 허가가 필요할 수 있습니다

4. **개인정보**
   - 개인정보는 수집하지 마세요
   - 공개된 정보만 수집하세요

### 기술적 주의사항
1. **IP 차단**
   - 과도한 요청 시 IP가 차단될 수 있습니다
   - Rate limiting을 반드시 적용하세요

2. **데이터 정확성**
   - 수집된 데이터는 참고용입니다
   - 실제 거래 시 공식 출처를 확인하세요

3. **사이트 구조 변경**
   - 호갱노노 사이트 구조가 변경될 수 있습니다
   - 크롤러가 작동하지 않으면 코드 수정이 필요합니다

## 윤리적 크롤링 가이드

### DO ✅
- Rate limiting 적용 (1-2초 간격)
- User-Agent 명시
- robots.txt 준수
- 공개된 정보만 수집
- 적절한 시간대에 크롤링 (서버 부하 고려)

### DON'T ❌
- 과도한 요청으로 서버 부하 유발
- 보안 장치 우회 시도
- 개인정보 수집
- 상업적 무단 이용
- CAPTCHA 자동 우회

## 트러블슈팅

### 1. 연결 오류
```python
# Timeout 늘리기
response = requests.get(url, timeout=30)

# Retry 로직 추가
from requests.adapters import HTTPAdapter
from requests.packages.urllib3.util.retry import Retry

session = requests.Session()
retry = Retry(total=3, backoff_factor=1)
adapter = HTTPAdapter(max_retries=retry)
session.mount('http://', adapter)
session.mount('https://', adapter)
```

### 2. 차단 대응
```python
# User-Agent 변경
headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) ...',
}

# 요청 간격 늘리기
time.sleep(3)  # 3초 대기
```

### 3. 데이터 파싱 오류
```python
# 예외 처리 추가
try:
    data = response.json()
except json.JSONDecodeError:
    print("JSON 파싱 실패")
    data = {}
```

## 라이선스

이 크롤러는 교육 및 연구 목적으로 제작되었습니다.
상업적 이용 시 별도 허가가 필요할 수 있습니다.

## 면책 조항

- 이 도구는 공개된 정보를 수집하는 용도입니다
- 수집된 데이터의 정확성을 보장하지 않습니다
- 데이터 사용으로 인한 손실에 대해 책임지지 않습니다
- 실제 거래 시 공식 출처를 반드시 확인하세요

## 문의 및 기여

이슈나 개선사항이 있으면 알려주세요.

---

**최종 업데이트:** 2026년 1월 27일
**버전:** 1.0.0
