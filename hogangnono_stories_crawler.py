
"""
호갱노노 드파인 연희 아파트 이야기(리뷰/커뮤니티) 크롤러
URL: https://hogangnono.com/apt/fa562
목표: 이야기/리뷰 데이터 수집
"""

import requests
import json
import time
from datetime import datetime
from typing import List, Dict, Optional
from bs4 import BeautifulSoup

class HogangnonoStoriesCrawler:
    def __init__(self):
        self.base_url = "https://hogangnono.com"
        self.apt_code = "fa562"
        self.apt_url = f"{self.base_url}/apt/{self.apt_code}"
        
        self.headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'application/json, text/plain, */*',
            'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
            'Referer': self.base_url,
            'Origin': self.base_url,
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
        }
        
        self.session = requests.Session()
        self.session.headers.update(self.headers)

    def fetch_page(self, url: str) -> Optional[requests.Response]:
        try:
            print(f"  Fetching: {url}")
            response = self.session.get(url, timeout=30)
            response.raise_for_status()
            time.sleep(2)
            return response
        except Exception as e:
            print(f"  Error: {e}")
            return None

    def try_api_endpoints(self) -> Dict:
        print("\n" + "="*70)
        print("API 엔드포인트 탐색")
        print("="*70)
        
        endpoints = [
            f"/api/apt/{self.apt_code}/stories",
            f"/api/apt/{self.apt_code}/reviews",
            f"/api/apt/{self.apt_code}/comments",
        ]
        
        results = {}
        
        for endpoint in endpoints:
            url = self.base_url + endpoint
            try:
                print(f"  시도: {endpoint}")
                response = self.session.get(url, timeout=10)
                
                results[endpoint] = {
                    "status_code": response.status_code,
                    "content_length": len(response.content),
                }
                
                if response.status_code == 200:
                    print(f"    OK 성공!")
                    data = response.json()
                    results[endpoint]["data"] = data
                else:
                    print(f"    FAIL 실패 ({response.status_code})")
                
                time.sleep(1)
                
            except Exception as e:
                results[endpoint] = {"error": str(e)}
                print(f"    FAIL 오류: {e}")
        
        return results

    def save_results(self, data: Dict):
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')

        json_file = f"hogangnono_stories_{timestamp}.json"
        with open(json_file, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        print(f"\nOK JSON 저장: {json_file}")

        return json_file


def main():
    print("="*70)
    print("호갱노노 드파인 연희 아파트 이야기(리뷰) 크롤링")
    print("="*70)
    
    crawler = HogangnonoStoriesCrawler()
    
    result = {
        "timestamp": datetime.now().isoformat(),
        "apt_name": "드파인 연희",
        "apt_code": "fa562",
        "api_results": crawler.try_api_endpoints()
    }
    
    crawler.save_results(result)
    print("\n" + "="*70)
    print("작업 완료!")
    print("="*70)

if __name__ == "__main__":
    main()
