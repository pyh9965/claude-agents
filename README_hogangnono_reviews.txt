
================================================================================
호갱노노 드파인 연희 아파트 이야기(리뷰) 크롤링 프로젝트
================================================================================

프로젝트 개요
-------------
호갱노노(https://hogangnono.com)에서 드파인 연희 아파트의 이야기(리뷰/커뮤니티 댓글)
데이터를 수집한 프로젝트입니다.

대상 URL: https://hogangnono.com/apt/fa562

수집 결과 요약
--------------
- 총 리뷰 수: 13개
- 총 좋아요: 195개
- 총 댓글: 56개
- 사진 포함 리뷰: 10개 (76.9%)
- 리뷰당 평균 좋아요: 15.0개
- 리뷰당 평균 댓글: 4.31개

수집 데이터 구조
----------------
각 리뷰는 다음 정보를 포함합니다:
- 리뷰 ID
- 작성자 이름
- 작성 날짜
- 리뷰 내용
- 좋아요 수 (countUp)
- 싫어요 수 (countDown)
- 댓글 수 (countComment)
- 사진 첨부 여부 (hasPhoto)
- 사진 URL (photos)
- 댓글 목록 (comments)
  * 댓글 ID
  * 댓글 작성자
  * 댓글 내용
  * 댓글 작성일

생성된 파일
-----------
1. hogangnono_reviews_extracted.json
   - 전체 리뷰 데이터 (JSON 형식)
   - 프로그래밍 방식으로 데이터 활용 가능

2. hogangnono_reviews_FINAL_REPORT.txt
   - 사람이 읽기 쉬운 형식의 최종 보고서
   - 모든 리뷰와 댓글의 상세 내용 포함

3. hogangnono_reviews_summary.json
   - 통계 요약 및 인기 리뷰 TOP 5
   - 빠른 개요 파악용

4. hogangnono_screenshot.png
   - 크롤링 당시 페이지 스크린샷

TOP 5 인기 리뷰 (좋아요 순)
---------------------------
1. 디벨로퍼 (29 likes) - 2026-01-03
   "드파인 조합원 입니다. 좋은 얘기 별로인 얘기 관심받고있구나 싶네요..."

2. 알럽댓 (29 likes) - 2025-12-08
   "드파인연희 관련 정보를 한장에 담아봤습니다"

3. 9**1 (25 likes) - 2024-02-11
   "2024년 2월 1일 철거 시작."

4. 26년다자녀 (22 likes) - 2026-01-03
   "59A 선택의 기회비용 - 얻는 것: 선호도 높은 4-Bay 판상형 구조..."

5. 옐로우321 (20 likes) - 2026-01-20
   "여기 이야기방에 가장 많이 올라오는 질문 중의 하나가 연희초등학교 통학문제..."

기술적 접근 방식
----------------
1. 초기 시도: API 직접 호출
   - 결과: 대부분의 API 엔드포인트가 400/404 반환
   - 호갱노노는 인증이 필요하거나 동적 렌더링 사용

2. Selenium을 통한 브라우저 자동화
   - Chrome WebDriver를 사용하여 실제 브라우저로 페이지 접근
   - JavaScript로 렌더링된 동적 컨텐츠 수집
   - 페이지 소스 HTML 저장

3. HTML 분석 및 JSON 추출
   - BeautifulSoup를 사용한 HTML 파싱
   - React/Next.js 애플리케이션의 __NEXT_DATA__ 추출
   - queryState에서 리뷰 데이터 발견 및 추출

사용된 기술 스택
----------------
- Python 3.10
- requests: HTTP 요청
- BeautifulSoup4: HTML 파싱
- Selenium: 브라우저 자동화
- webdriver-manager: ChromeDriver 자동 관리
- json: 데이터 직렬화

크롤링 코드
-----------
주요 크롤러 스크립트:
- hogangnono_stories_crawler.py: 기본 API 탐색
- hogangnono_advanced_crawler.py: 고급 분석
- Selenium 기반 동적 크롤링 (인라인 스크립트)

데이터 활용 예시
----------------
# JSON 데이터 읽기
import json

with open('hogangnono_reviews_extracted.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

# 모든 리뷰 순회
for review in data['reviews']:
    print(f"작성자: {review['name']}")
    print(f"내용: {review['content']}")
    print(f"좋아요: {review['countUp']}")
    print(f"날짜: {review['date']}")
    print("---")

주의사항
--------
- 크롤링 시 robots.txt 준수 및 적절한 Rate Limiting 적용
- 수집된 데이터의 저작권은 원 작성자와 호갱노노에 있음
- 상업적 이용 시 호갱노노의 이용약관 확인 필요

프로젝트 정보
-------------
수집 일시: 2026-01-27 19:20:34
크롤러 버전: 1.0
작성자: Claude Code Agent

================================================================================
