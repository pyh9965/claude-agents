# -*- coding: utf-8 -*-
import requests
import json
import time
from datetime import datetime
from bs4 import BeautifulSoup

print("="*70)
print("호갱노노 드파인 연희 아파트 이야기 크롤러 (고급 버전)")
print("="*70)

# 1단계: 메인 페이지 분석
url = "https://hogangnono.com/apt/fa562"
headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
}

session = requests.Session()
session.headers.update(headers)

print("
[1] 메인 페이지 분석 중...")
try:
    response = session.get(url, timeout=30)
    soup = BeautifulSoup(response.text, 'html.parser')
    
    # HTML 저장
    with open('hogangnono_full_page.html', 'w', encoding='utf-8') as f:
        f.write(soup.prettify())
    print("    OK - HTML 저장: hogangnono_full_page.html")
    
    # 모든 script 태그 분석
    scripts = soup.find_all('script')
    print(f"    발견된 스크립트: {len(scripts)}개")
    
    # API 패턴 찾기
    api_patterns = []
    for script in scripts:
        if script.string:
            if 'api' in script.string.lower():
                lines = [l.strip() for l in script.string.split('
') if 'api' in l.lower()]
                api_patterns.extend(lines[:5])
    
    if api_patterns:
        print("    발견된 API 패턴:")
        for p in api_patterns[:3]:
            print(f"      {p[:80]}")
    
except Exception as e:
    print(f"    FAIL: {e}")

# 2단계: 다양한 API 엔드포인트 시도
print("
[2] API 엔드포인트 탐색...")

test_endpoints = [
    "/api/v1/apt/fa562/community",
    "/api/v1/apt/fa562/board",
    "/api/v1/apt/fa562/story",
    "/api/v2/apt/fa562/story",
    "/api/apt/fa562/story",
    "/api/apt/fa562/board",
    "/api/community/apt/fa562",
    "/api/story/apt/fa562",
]

api_results = {}
for endpoint in test_endpoints:
    test_url = "https://hogangnono.com" + endpoint
    try:
        resp = session.get(test_url, timeout=5)
        status = resp.status_code
        print(f"    {status:>3} - {endpoint}")
        
        if status == 200:
            try:
                data = resp.json()
                api_results[endpoint] = data
                with open(f'api_data_{endpoint.replace("/", "_")}.json', 'w', encoding='utf-8') as f:
                    json.dump(data, f, ensure_ascii=False, indent=2)
                print(f"          [JSON 저장 완료]")
            except:
                pass
        
        time.sleep(0.5)
    except Exception as e:
        pass

# 3단계: HTML에서 직접 데이터 추출
print("
[3] HTML 분석...")

# 이야기 관련 키워드
keywords = ['이야기', 'story', '리뷰', 'review']
found_sections = []

for keyword in keywords:
    elements = soup.find_all(text=lambda t: t and keyword in t.lower())
    if elements:
        print(f"    '{keyword}' 키워드: {len(elements)}회 발견")

# article, section, div 분석
print("
    HTML 구조 분석:")
print(f"      - article 태그: {len(soup.find_all('article'))}개")
print(f"      - section 태그: {len(soup.find_all('section'))}개")

# 최종 결과 저장
result = {
    'timestamp': datetime.now().isoformat(),
    'apt_name': '드파인 연희',
    'apt_code': 'fa562',
    'url': url,
    'html_saved': 'hogangnono_full_page.html',
    'api_results': api_results,
    'note': '추가 분석 필요 - 브라우저 개발자 도구로 네트워크 탭 확인 권장'
}

with open('hogangnono_analysis_result.json', 'w', encoding='utf-8') as f:
    json.dump(result, f, ensure_ascii=False, indent=2)

print("
" + "="*70)
print("분석 완료!")
print("저장된 파일:")
print("  - hogangnono_full_page.html (전체 HTML)")
print("  - hogangnono_analysis_result.json (분석 결과)")
if api_results:
    print(f"  - API 데이터 파일 {len(api_results)}개")
print("="*70)
