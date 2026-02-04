"""
드파인 연희 아파트 정보 수집 크롤러 (Selenium 버전)
호갱노노(Hogangnono) 사이트에서 JavaScript 렌더링 후 데이터 수집
"""

from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.options import Options
from selenium.common.exceptions import TimeoutException, NoSuchElementException
import json
import time
from datetime import datetime
from typing import Dict, List, Any


class HogangnonoSeleniumCrawler:
    def __init__(self, headless=True):
        """크롤러 초기화"""
        self.setup_driver(headless)
        self.wait = WebDriverWait(self.driver, 10)

    def setup_driver(self, headless):
        """Chrome 드라이버 설정"""
        chrome_options = Options()
        if headless:
            chrome_options.add_argument('--headless')
        chrome_options.add_argument('--no-sandbox')
        chrome_options.add_argument('--disable-dev-shm-usage')
        chrome_options.add_argument('--disable-gpu')
        chrome_options.add_argument('--window-size=1920,1080')
        chrome_options.add_argument(
            'user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        )

        self.driver = webdriver.Chrome(options=chrome_options)

    def get_apartment_data(self, apt_code: str) -> Dict[str, Any]:
        """아파트 상세 정보 수집"""
        url = f"https://hogangnono.com/apt/{apt_code}"
        print(f"\n{'='*60}")
        print(f"페이지 접속: {url}")
        print(f"{'='*60}\n")

        result = {
            'url': url,
            'apt_code': apt_code,
            'collected_at': datetime.now().isoformat(),
            'basic_info': {},
            'price_info': [],
            'transactions': [],
            'facilities': {},
            'error': None
        }

        try:
            self.driver.get(url)
            time.sleep(3)  # 페이지 로딩 대기

            # 기본 정보 수집
            result['basic_info'] = self._extract_basic_info()

            # 시세 정보 수집
            result['price_info'] = self._extract_price_info()

            # 실거래가 정보 수집
            result['transactions'] = self._extract_transactions()

            # 주변 시설 정보 수집
            result['facilities'] = self._extract_facilities()

        except Exception as e:
            print(f"❌ 오류 발생: {e}")
            result['error'] = str(e)

        return result

    def _extract_basic_info(self) -> Dict[str, Any]:
        """기본 건물 정보 추출"""
        print("📋 기본 정보 수집 중...")
        basic_info = {}

        try:
            # 아파트명
            try:
                apt_name = self.driver.find_element(By.CSS_SELECTOR, 'h1, .apt-name, [class*="aptName"]').text
                basic_info['아파트명'] = apt_name
            except:
                pass

            # 주소
            try:
                address = self.driver.find_element(By.CSS_SELECTOR, '.address, [class*="address"]').text
                basic_info['주소'] = address
            except:
                pass

            # 준공년도
            try:
                completion_year = self.driver.find_element(By.XPATH, "//*[contains(text(), '준공년도')]/following-sibling::*").text
                basic_info['준공년도'] = completion_year
            except:
                pass

            # 세대수
            try:
                households = self.driver.find_element(By.XPATH, "//*[contains(text(), '세대수')]/following-sibling::*").text
                basic_info['세대수'] = households
            except:
                pass

            # 동수
            try:
                buildings = self.driver.find_element(By.XPATH, "//*[contains(text(), '동수')]/following-sibling::*").text
                basic_info['동수'] = buildings
            except:
                pass

            # 최고층
            try:
                max_floor = self.driver.find_element(By.XPATH, "//*[contains(text(), '최고층')]/following-sibling::*").text
                basic_info['최고층'] = max_floor
            except:
                pass

            # 건설사
            try:
                builder = self.driver.find_element(By.XPATH, "//*[contains(text(), '건설사')]/following-sibling::*").text
                basic_info['건설사'] = builder
            except:
                pass

            print(f"✅ 기본 정보 {len(basic_info)}개 항목 수집")

        except Exception as e:
            print(f"❌ 기본 정보 수집 오류: {e}")

        return basic_info

    def _extract_price_info(self) -> List[Dict[str, Any]]:
        """시세 정보 추출"""
        print("\n💰 시세 정보 수집 중...")
        price_list = []

        try:
            # 시세 탭 클릭
            try:
                price_tab = self.driver.find_element(By.XPATH, "//*[contains(text(), '시세')]")
                price_tab.click()
                time.sleep(2)
            except:
                pass

            # 평형별 시세 정보
            price_rows = self.driver.find_elements(By.CSS_SELECTOR, '.price-row, [class*="priceRow"], tr')

            for row in price_rows:
                try:
                    cells = row.find_elements(By.CSS_SELECTOR, 'td, div')
                    if len(cells) >= 3:
                        price_item = {
                            '평형': cells[0].text,
                            '매매가': cells[1].text if len(cells) > 1 else 'N/A',
                            '전세가': cells[2].text if len(cells) > 2 else 'N/A',
                        }
                        if price_item['평형']:
                            price_list.append(price_item)
                except:
                    continue

            print(f"✅ 시세 정보 {len(price_list)}개 항목 수집")

        except Exception as e:
            print(f"❌ 시세 정보 수집 오류: {e}")

        return price_list

    def _extract_transactions(self) -> List[Dict[str, Any]]:
        """실거래가 정보 추출"""
        print("\n📊 실거래가 수집 중...")
        transactions = []

        try:
            # 실거래가 탭 클릭
            try:
                trade_tab = self.driver.find_element(By.XPATH, "//*[contains(text(), '실거래가')]")
                trade_tab.click()
                time.sleep(2)
            except:
                pass

            # 거래 내역 추출
            trade_rows = self.driver.find_elements(By.CSS_SELECTOR, '.trade-row, [class*="tradeRow"], tr')

            for row in trade_rows[:50]:  # 최근 50건
                try:
                    cells = row.find_elements(By.CSS_SELECTOR, 'td, div')
                    if len(cells) >= 4:
                        transaction = {
                            '거래일': cells[0].text,
                            '평형': cells[1].text if len(cells) > 1 else 'N/A',
                            '층': cells[2].text if len(cells) > 2 else 'N/A',
                            '거래가': cells[3].text if len(cells) > 3 else 'N/A',
                        }
                        if transaction['거래일']:
                            transactions.append(transaction)
                except:
                    continue

            print(f"✅ 실거래가 {len(transactions)}건 수집")

        except Exception as e:
            print(f"❌ 실거래가 수집 오류: {e}")

        return transactions

    def _extract_facilities(self) -> Dict[str, Any]:
        """주변 시설 정보 추출"""
        print("\n🏫 주변 시설 수집 중...")
        facilities = {
            '학교': [],
            '지하철': [],
            '편의시설': []
        }

        try:
            # 주변환경 탭 클릭
            try:
                facility_tab = self.driver.find_element(By.XPATH, "//*[contains(text(), '주변환경')]")
                facility_tab.click()
                time.sleep(2)
            except:
                pass

            # 학교 정보
            try:
                school_elements = self.driver.find_elements(By.CSS_SELECTOR, '[class*="school"]')
                for elem in school_elements:
                    school_name = elem.text
                    if school_name:
                        facilities['학교'].append(school_name)
            except:
                pass

            # 지하철 정보
            try:
                subway_elements = self.driver.find_elements(By.CSS_SELECTOR, '[class*="subway"]')
                for elem in subway_elements:
                    subway_info = elem.text
                    if subway_info:
                        facilities['지하철'].append(subway_info)
            except:
                pass

            print(f"✅ 주변 시설 수집 완료")

        except Exception as e:
            print(f"❌ 주변 시설 수집 오류: {e}")

        return facilities

    def save_to_json(self, data: Dict, filename: str):
        """데이터를 JSON 파일로 저장"""
        filepath = f"D:\\AI프로그램제작\\agent\\{filename}"
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        print(f"\n💾 데이터 저장 완료: {filepath}")

    def print_summary(self, data: Dict):
        """수집된 데이터 요약 출력"""
        print(f"\n{'='*60}")
        print("📊 데이터 수집 결과 요약")
        print(f"{'='*60}\n")

        if data.get('error'):
            print(f"❌ 오류: {data['error']}")
            return

        # 기본 정보
        basic = data.get('basic_info', {})
        if basic:
            print("[기본 정보]")
            for key, value in basic.items():
                print(f"  {key}: {value}")

        # 시세 정보
        price_info = data.get('price_info', [])
        if price_info:
            print(f"\n[시세 정보] (총 {len(price_info)}개 평형)")
            for p in price_info[:5]:
                print(f"  {p.get('평형')}: 매매 {p.get('매매가')}, 전세 {p.get('전세가')}")

        # 실거래가
        transactions = data.get('transactions', [])
        if transactions:
            print(f"\n[실거래가] (최근 {len(transactions)}건)")
            for tx in transactions[:5]:
                print(f"  {tx.get('거래일')} - {tx.get('평형')}, {tx.get('층')}, {tx.get('거래가')}")

        # 주변 시설
        facilities = data.get('facilities', {})
        if facilities:
            print(f"\n[주변 시설]")
            for category, items in facilities.items():
                if items:
                    print(f"  {category}: {len(items)}개 ({', '.join(items[:3])}...)")

        print(f"\n{'='*60}")

    def close(self):
        """드라이버 종료"""
        self.driver.quit()


def main():
    """메인 실행 함수"""
    print("\n🚀 드파인 연희 아파트 정보 수집 시작")
    print(f"⏰ 수집 시각: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")

    crawler = HogangnonoSeleniumCrawler(headless=False)  # 브라우저 표시

    try:
        # 드파인 연희 아파트 코드
        apt_code = "fa562"

        result = crawler.get_apartment_data(apt_code)

        # 결과 저장
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        filename = f"dpine_yeonhui_{timestamp}.json"
        crawler.save_to_json(result, filename)

        # 요약 출력
        crawler.print_summary(result)

        return result

    finally:
        crawler.close()


if __name__ == "__main__":
    main()
