"""
드파인 연희 아파트 정보 수집 크롤러
호갱노노(Hogangnono) 사이트에서 아파트 정보를 수집합니다.
"""

import requests
import json
import time
from datetime import datetime
from typing import Dict, List, Any
import urllib.parse

class HogangnonoCrawler:
    def __init__(self):
        self.base_url = "https://hogangnono.com"
        self.api_base = "https://api.hogangnono.com"
        self.headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'application/json, text/plain, */*',
            'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
            'Referer': 'https://hogangnono.com/',
            'Origin': 'https://hogangnono.com'
        }
        self.session = requests.Session()
        self.session.headers.update(self.headers)

    def search_apartment(self, keyword: str) -> List[Dict]:
        """아파트 검색"""
        print(f"검색 중: {keyword}")

        # 호갱노노 검색 API 엔드포인트
        search_url = f"{self.api_base}/apt/search"

        params = {
            'keyword': keyword,
            'limit': 10
        }

        try:
            response = self.session.get(search_url, params=params, timeout=10)
            time.sleep(1)  # Rate limiting

            if response.status_code == 200:
                data = response.json()
                print(f"검색 결과: {len(data.get('list', []))}건")
                return data.get('list', [])
            else:
                print(f"검색 실패: Status {response.status_code}")
                print(f"Response: {response.text[:200]}")
        except Exception as e:
            print(f"검색 오류: {e}")

        return []

    def get_apartment_basic_info(self, apt_id: str) -> Dict[str, Any]:
        """아파트 기본 정보 조회"""
        print(f"기본 정보 조회 중: {apt_id}")

        url = f"{self.api_base}/apt/{apt_id}/info"

        try:
            response = self.session.get(url, timeout=10)
            time.sleep(1)

            if response.status_code == 200:
                return response.json()
            else:
                print(f"기본 정보 조회 실패: Status {response.status_code}")
        except Exception as e:
            print(f"기본 정보 조회 오류: {e}")

        return {}

    def get_apartment_price(self, apt_id: str) -> Dict[str, Any]:
        """아파트 시세 정보 조회"""
        print(f"시세 정보 조회 중: {apt_id}")

        url = f"{self.api_base}/apt/{apt_id}/price"

        try:
            response = self.session.get(url, timeout=10)
            time.sleep(1)

            if response.status_code == 200:
                return response.json()
            else:
                print(f"시세 정보 조회 실패: Status {response.status_code}")
        except Exception as e:
            print(f"시세 정보 조회 오류: {e}")

        return {}

    def get_real_transactions(self, apt_id: str) -> List[Dict]:
        """실거래가 데이터 조회"""
        print(f"실거래가 조회 중: {apt_id}")

        url = f"{self.api_base}/apt/{apt_id}/trades"

        params = {
            'limit': 50,
            'offset': 0
        }

        try:
            response = self.session.get(url, params=params, timeout=10)
            time.sleep(1)

            if response.status_code == 200:
                data = response.json()
                return data.get('list', [])
            else:
                print(f"실거래가 조회 실패: Status {response.status_code}")
        except Exception as e:
            print(f"실거래가 조회 오류: {e}")

        return []

    def get_nearby_facilities(self, apt_id: str) -> Dict[str, Any]:
        """주변 시설 정보 조회"""
        print(f"주변 시설 조회 중: {apt_id}")

        url = f"{self.api_base}/apt/{apt_id}/facilities"

        try:
            response = self.session.get(url, timeout=10)
            time.sleep(1)

            if response.status_code == 200:
                return response.json()
            else:
                print(f"주변 시설 조회 실패: Status {response.status_code}")
        except Exception as e:
            print(f"주변 시설 조회 오류: {e}")

        return {}

    def crawl_apartment(self, apartment_name: str) -> Dict[str, Any]:
        """아파트 전체 정보 수집"""
        print(f"\n{'='*60}")
        print(f"아파트 정보 수집 시작: {apartment_name}")
        print(f"수집 시각: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print(f"{'='*60}\n")

        result = {
            'apartment_name': apartment_name,
            'collected_at': datetime.now().isoformat(),
            'basic_info': {},
            'price_info': {},
            'transactions': [],
            'facilities': {},
            'error': None
        }

        # 1. 아파트 검색
        search_results = self.search_apartment(apartment_name)

        if not search_results:
            result['error'] = "검색 결과 없음"
            return result

        # 첫 번째 검색 결과 사용
        apt_data = search_results[0]
        apt_id = apt_data.get('id') or apt_data.get('aptId')

        if not apt_id:
            result['error'] = "아파트 ID를 찾을 수 없음"
            return result

        result['apt_id'] = apt_id
        result['search_result'] = apt_data

        # 2. 기본 정보 수집
        result['basic_info'] = self.get_apartment_basic_info(apt_id)

        # 3. 시세 정보 수집
        result['price_info'] = self.get_apartment_price(apt_id)

        # 4. 실거래가 수집
        result['transactions'] = self.get_real_transactions(apt_id)

        # 5. 주변 시설 정보 수집
        result['facilities'] = self.get_nearby_facilities(apt_id)

        return result

    def save_to_json(self, data: Dict, filename: str):
        """데이터를 JSON 파일로 저장"""
        filepath = f"D:\\AI프로그램제작\\agent\\{filename}"
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        print(f"\n데이터 저장 완료: {filepath}")

    def print_summary(self, data: Dict):
        """수집된 데이터 요약 출력"""
        print(f"\n{'='*60}")
        print("데이터 수집 결과 요약")
        print(f"{'='*60}")

        if data.get('error'):
            print(f"❌ 오류: {data['error']}")
            return

        # 기본 정보
        basic = data.get('basic_info', {})
        if basic:
            print("\n[기본 정보]")
            print(f"아파트명: {basic.get('aptName', 'N/A')}")
            print(f"준공년도: {basic.get('useApproveYmd', 'N/A')}")
            print(f"세대수: {basic.get('householdCount', 'N/A')}세대")
            print(f"동수: {basic.get('dongCount', 'N/A')}동")
            print(f"최고층: {basic.get('maxFloor', 'N/A')}층")
            print(f"주소: {basic.get('address', 'N/A')}")

        # 시세 정보
        price = data.get('price_info', {})
        if price:
            print("\n[시세 정보]")
            price_list = price.get('list', [])
            for p in price_list[:3]:  # 상위 3개만 출력
                area = p.get('area', 'N/A')
                sale = p.get('salePrice', 'N/A')
                jeonse = p.get('jeonsePrice', 'N/A')
                print(f"  {area}㎡: 매매 {sale}, 전세 {jeonse}")

        # 실거래가
        transactions = data.get('transactions', [])
        print(f"\n[실거래가]")
        print(f"최근 거래 건수: {len(transactions)}건")
        for tx in transactions[:5]:  # 최근 5건만 출력
            date = tx.get('dealDate', 'N/A')
            area = tx.get('area', 'N/A')
            price = tx.get('dealPrice', 'N/A')
            floor = tx.get('floor', 'N/A')
            print(f"  {date} - {area}㎡, {floor}층, {price}")

        # 주변 시설
        facilities = data.get('facilities', {})
        if facilities:
            print("\n[주변 시설]")
            schools = facilities.get('schools', [])
            if schools:
                print(f"  학교: {len(schools)}개")
            subways = facilities.get('subways', [])
            if subways:
                print(f"  지하철역: {len(subways)}개")

        print(f"\n{'='*60}")


def main():
    """메인 실행 함수"""
    crawler = HogangnonoCrawler()

    # 드파인 연희 아파트 정보 수집
    apartment_name = "드파인 연희"

    result = crawler.crawl_apartment(apartment_name)

    # 결과 저장
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    filename = f"dpine_yeonhui_{timestamp}.json"
    crawler.save_to_json(result, filename)

    # 요약 출력
    crawler.print_summary(result)

    return result


if __name__ == "__main__":
    main()
