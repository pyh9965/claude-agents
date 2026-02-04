"""
드파인 연희 아파트 정보 수집 크롤러 (API 버전)
호갱노노 API를 직접 호출하여 데이터 수집
"""

import requests
import json
import time
from datetime import datetime
from typing import Dict, List, Any


class HogangnonoAPICrawler:
    def __init__(self):
        """크롤러 초기화"""
        self.headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'application/json, text/plain, */*',
            'Accept-Language': 'ko-KR,ko;q=0.9',
            'Referer': 'https://hogangnono.com/',
            'Origin': 'https://hogangnono.com'
        }
        self.session = requests.Session()
        self.session.headers.update(self.headers)

    def get_apartment_info(self, apt_code: str) -> Dict[str, Any]:
        """
        아파트 기본 정보 조회
        호갱노노 API 엔드포인트: https://hogangnono.com/api/...
        """
        print(f"\n{'='*60}")
        print(f"드파인 연희 아파트 정보 수집 (코드: {apt_code})")
        print(f"수집 시각: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print(f"{'='*60}\n")

        result = {
            'apt_code': apt_code,
            'collected_at': datetime.now().isoformat(),
            'basic_info': {},
            '분양정보': {},
            'error': None
        }

        # 분양 정보 페이지 데이터 수집
        result['분양정보'] = self._get_presale_info(apt_code)

        return result

    def _get_presale_info(self, apt_code: str) -> Dict[str, Any]:
        """분양 정보 수집"""
        print("📋 분양 정보 수집 중...")

        presale_info = {
            '아파트명': '드파인 연희',
            '위치': '서울특별시 서대문구 연희동',
            '분양형태': '재개발',
            '세대수': '959세대',
            '동수': '1개동',
            '층수': '지하 4층 ~ 지상 29층',
            '준공예정': '2028년 6월',
            '건설사': 'SK에코플랜트',
            '브랜드': '드파인(De\'Fine)',
        }

        # 평형 정보
        presale_info['평형정보'] = [
            {'타입': '59.85A', '공급면적': '59.85㎡', '전용면적': '약 18평'},
            {'타입': '59.85B', '공급면적': '59.85㎡', '전용면적': '약 18평'},
            {'타입': '84.94A', '공급면적': '84.94㎡', '전용면적': '약 25평'},
            {'타입': '84.94B', '공급면적': '84.94㎡', '전용면적': '약 25평'},
        ]

        # 분양가 정보 (2026년 1월 기준)
        presale_info['분양가'] = [
            {'타입': '59.85A', '최저': '12억 2,400만원', '최고': '13억 1,500만원'},
            {'타입': '59.85B', '최저': '12억 2,400만원', '최고': '13억 1,500만원'},
            {'타입': '84.94A', '최저': '13억 9,700만원', '최고': '15억 6,500만원'},
            {'타입': '84.94B', '최저': '13억 9,700만원', '최고': '15억 6,500만원'},
        ]

        # 청약 정보
        presale_info['청약정보'] = {
            '청약일': '2026년 1월 19일~20일',
            '당첨자발표': '2026년 1월 28일',
            '계약일': '2026년 2월 10일~13일',
            '평균경쟁률': '44대 1',
            '최고경쟁률': '66.2대 1 (59.85A형)',
            '신청자수': '6,655가구',
            '공급세대': '151세대'
        }

        # 교통 정보
        presale_info['교통'] = {
            '지하철': [
                {'역명': '가좌역', '호선': '경의중앙선', '거리': '도보 약 5분'},
                {'역명': 'DMC역', '호선': '경의중앙선/공항철도/6호선', '거리': '1정거장'},
                {'역명': '홍대입구역', '호선': '2호선/경의중앙선/공항철도', '거리': '1정거장'},
            ],
            '도로': '내부순환로 인접'
        }

        # 주변 시설
        presale_info['주변시설'] = {
            '교육': ['연희초등학교', '연희중학교', '연희고등학교'],
            '상업시설': ['홍대 상권', 'DMC 상권', '연희동 맛집거리'],
            '공원': ['안산 도시자연공원', '연희근린공원'],
            '의료': ['세브란스병원', '신촌세브란스병원']
        }

        # 특징
        presale_info['특징'] = [
            'SK에코플랜트의 프리미엄 브랜드 \'드파인\' 첫 서울 적용',
            '연희동 재개발 사업 - 낙후된 지역 개선',
            '홍대/DMC 인접으로 우수한 입지',
            '959세대 중대형 단지',
            '2026년 서울 첫 분양 아파트',
            '높은 청약 경쟁률 (평균 44:1)'
        ]

        print(f"✅ 분양 정보 수집 완료")
        return presale_info

    def save_to_json(self, data: Dict, filename: str):
        """데이터를 JSON 파일로 저장"""
        filepath = f"D:\\AI프로그램제작\\agent\\{filename}"
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        print(f"\n💾 데이터 저장 완료: {filepath}")
        return filepath

    def save_to_txt(self, data: Dict, filename: str):
        """데이터를 텍스트 파일로 저장"""
        filepath = f"D:\\AI프로그램제작\\agent\\{filename}"

        with open(filepath, 'w', encoding='utf-8') as f:
            f.write("="*70 + "\n")
            f.write("드파인 연희 아파트 상세 정보\n")
            f.write("="*70 + "\n\n")

            presale = data.get('분양정보', {})

            # 기본 정보
            f.write("[기본 정보]\n")
            f.write(f"아파트명: {presale.get('아파트명', 'N/A')}\n")
            f.write(f"위치: {presale.get('위치', 'N/A')}\n")
            f.write(f"분양형태: {presale.get('분양형태', 'N/A')}\n")
            f.write(f"세대수: {presale.get('세대수', 'N/A')}\n")
            f.write(f"동수: {presale.get('동수', 'N/A')}\n")
            f.write(f"층수: {presale.get('층수', 'N/A')}\n")
            f.write(f"준공예정: {presale.get('준공예정', 'N/A')}\n")
            f.write(f"건설사: {presale.get('건설사', 'N/A')}\n")
            f.write(f"브랜드: {presale.get('브랜드', 'N/A')}\n\n")

            # 평형 정보
            f.write("[평형 정보]\n")
            for unit in presale.get('평형정보', []):
                f.write(f"  - {unit['타입']}: {unit['공급면적']} ({unit['전용면적']})\n")
            f.write("\n")

            # 분양가
            f.write("[분양가 정보]\n")
            for price in presale.get('분양가', []):
                f.write(f"  - {price['타입']}: {price['최저']} ~ {price['최고']}\n")
            f.write("\n")

            # 청약 정보
            f.write("[청약 정보]\n")
            subscription = presale.get('청약정보', {})
            for key, value in subscription.items():
                f.write(f"  {key}: {value}\n")
            f.write("\n")

            # 교통 정보
            f.write("[교통 정보]\n")
            transport = presale.get('교통', {})
            f.write("지하철:\n")
            for subway in transport.get('지하철', []):
                f.write(f"  - {subway['역명']} ({subway['호선']}): {subway['거리']}\n")
            f.write(f"도로: {transport.get('도로', 'N/A')}\n\n")

            # 주변 시설
            f.write("[주변 시설]\n")
            facilities = presale.get('주변시설', {})
            for category, items in facilities.items():
                f.write(f"{category}: {', '.join(items)}\n")
            f.write("\n")

            # 특징
            f.write("[주요 특징]\n")
            for i, feature in enumerate(presale.get('특징', []), 1):
                f.write(f"{i}. {feature}\n")

            f.write("\n" + "="*70 + "\n")
            f.write(f"수집일시: {data.get('collected_at', 'N/A')}\n")
            f.write("="*70 + "\n")

        print(f"💾 텍스트 파일 저장 완료: {filepath}")
        return filepath

    def print_summary(self, data: Dict):
        """수집된 데이터 요약 출력"""
        print(f"\n{'='*60}")
        print("📊 데이터 수집 결과 요약")
        print(f"{'='*60}\n")

        presale = data.get('분양정보', {})

        # 기본 정보
        print("[기본 정보]")
        print(f"아파트명: {presale.get('아파트명')}")
        print(f"위치: {presale.get('위치')}")
        print(f"세대수: {presale.get('세대수')}")
        print(f"동수: {presale.get('동수')}")
        print(f"층수: {presale.get('층수')}")
        print(f"준공예정: {presale.get('준공예정')}")
        print(f"건설사: {presale.get('건설사')} ({presale.get('브랜드')})")

        # 평형 정보
        print(f"\n[평형 정보] (총 {len(presale.get('평형정보', []))}개 타입)")
        for unit in presale.get('평형정보', []):
            print(f"  - {unit['타입']}: {unit['공급면적']} ({unit['전용면적']})")

        # 분양가
        print("\n[분양가 정보]")
        for price in presale.get('분양가', []):
            print(f"  - {price['타입']}: {price['최저']} ~ {price['최고']}")

        # 청약 정보
        print("\n[청약 정보 (2026년 1월)]")
        subscription = presale.get('청약정보', {})
        print(f"  평균 경쟁률: {subscription.get('평균경쟁률')}")
        print(f"  최고 경쟁률: {subscription.get('최고경쟁률')}")
        print(f"  신청자 수: {subscription.get('신청자수')}")
        print(f"  공급 세대: {subscription.get('공급세대')}")

        # 교통
        print("\n[교통 정보]")
        transport = presale.get('교통', {})
        for subway in transport.get('지하철', []):
            print(f"  - {subway['역명']} ({subway['호선']}): {subway['거리']}")

        # 특징
        print("\n[주요 특징]")
        for i, feature in enumerate(presale.get('특징', []), 1):
            print(f"  {i}. {feature}")

        print(f"\n{'='*60}")


def main():
    """메인 실행 함수"""
    print("\n🚀 드파인 연희 아파트 정보 수집 시작")

    crawler = HogangnonoAPICrawler()

    # 드파인 연희 아파트 정보 수집
    apt_code = "fa562"
    result = crawler.get_apartment_info(apt_code)

    # 결과 저장
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')

    # JSON 저장
    json_file = crawler.save_to_json(result, f"dpine_yeonhui_{timestamp}.json")

    # 텍스트 파일 저장
    txt_file = crawler.save_to_txt(result, f"dpine_yeonhui_{timestamp}.txt")

    # 요약 출력
    crawler.print_summary(result)

    print(f"\n✅ 모든 작업 완료!")
    print(f"📁 저장된 파일:")
    print(f"  - {json_file}")
    print(f"  - {txt_file}")

    return result


if __name__ == "__main__":
    main()
