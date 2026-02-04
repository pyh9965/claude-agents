#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
서대문구 아파트 실거래가 데이터 수집 및 분석
국토교통부 아파트매매 실거래 상세 자료 API 활용
"""

import requests
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import matplotlib.pyplot as plt
import matplotlib.font_manager as fm
from urllib.parse import quote
import warnings
warnings.filterwarnings('ignore')

# 한글 폰트 설정
plt.rcParams['font.family'] = 'Malgun Gothic'
plt.rcParams['axes.unicode_minus'] = False

class ApartmentDataCollector:
    """아파트 실거래가 데이터 수집 클래스"""

    def __init__(self, service_key):
        self.service_key = service_key
        # HTTPS 엔드포인트 사용 (인코딩된 키 사용)
        self.base_url = "https://apis.data.go.kr/1613000/RTMSDataSvcAptTradeDev/getRTMSDataSvcAptTradeDev"

    def fetch_data(self, lawd_cd, deal_ymd):
        """
        API를 통해 실거래가 데이터 수집

        Parameters:
        - lawd_cd: 지역코드 (서대문구: 11410)
        - deal_ymd: 계약년월 (YYYYMM)

        Returns:
        - DataFrame: 실거래가 데이터
        """
        params = {
            'serviceKey': self.service_key,
            'LAWD_CD': lawd_cd,
            'DEAL_YMD': deal_ymd,
            'numOfRows': 10000,
            'pageNo': 1
        }

        try:
            response = requests.get(self.base_url, params=params, timeout=30)
            response.raise_for_status()

            # XML 파싱
            from xml.etree import ElementTree as ET
            root = ET.fromstring(response.content)

            # 데이터 추출
            items = root.findall('.//item')

            if not items:
                print(f"[경고] {deal_ymd} 데이터 없음")
                return pd.DataFrame()

            data_list = []
            for item in items:
                data = {}
                for child in item:
                    data[child.tag] = child.text.strip() if child.text else ''
                data_list.append(data)

            df = pd.DataFrame(data_list)
            print(f"[수집완료] {deal_ymd}: {len(df)}건")
            return df

        except Exception as e:
            print(f"[오류] {deal_ymd} 수집 실패: {str(e)}")
            return pd.DataFrame()

    def collect_period_data(self, lawd_cd, start_month, end_month):
        """
        기간별 데이터 수집

        Parameters:
        - lawd_cd: 지역코드
        - start_month: 시작월 (YYYYMM)
        - end_month: 종료월 (YYYYMM)

        Returns:
        - DataFrame: 전체 기간 데이터
        """
        all_data = []

        start = datetime.strptime(start_month, '%Y%m')
        end = datetime.strptime(end_month, '%Y%m')

        current = start
        while current <= end:
            deal_ymd = current.strftime('%Y%m')
            df = self.fetch_data(lawd_cd, deal_ymd)

            if not df.empty:
                all_data.append(df)

            # 다음 달로 이동
            if current.month == 12:
                current = current.replace(year=current.year + 1, month=1)
            else:
                current = current.replace(month=current.month + 1)

        if all_data:
            return pd.concat(all_data, ignore_index=True)
        else:
            return pd.DataFrame()


class ApartmentDataAnalyzer:
    """아파트 실거래가 데이터 분석 클래스"""

    def __init__(self, df):
        self.df = df.copy()
        self.preprocess_data()

    def preprocess_data(self):
        """데이터 전처리"""
        if self.df.empty:
            return

        # 거래금액 전처리 (쉼표 제거 및 숫자 변환)
        self.df['거래금액'] = self.df['거래금액'].str.replace(',', '').str.strip().astype(float)

        # 전용면적 숫자 변환
        self.df['전용면적'] = pd.to_numeric(self.df['전용면적'], errors='coerce')

        # 건축년도 숫자 변환
        self.df['건축년도'] = pd.to_numeric(self.df['건축년도'], errors='coerce')

        # 층 정보 숫자 변환
        self.df['층'] = pd.to_numeric(self.df['층'], errors='coerce')

        # 거래일자 생성 (년, 월, 일 결합)
        self.df['거래년월일'] = pd.to_datetime(
            self.df['년'].astype(str) + '-' +
            self.df['월'].astype(str).str.zfill(2) + '-' +
            self.df['일'].astype(str).str.zfill(2)
        )

        # 평수 계산 (1평 = 3.3058㎡)
        self.df['평수'] = (self.df['전용면적'] / 3.3058).round(1)

        # 평당가 계산 (만원)
        self.df['평당가'] = (self.df['거래금액'] / self.df['평수'] * 10000).round(0)

        # ㎡당가 계산 (만원)
        self.df['㎡당가'] = (self.df['거래금액'] / self.df['전용면적'] * 10000).round(0)

        # 평형대 분류
        self.df['평형대'] = pd.cut(
            self.df['평수'],
            bins=[0, 15, 20, 25, 30, 40, 50, 100],
            labels=['10평대', '15평대', '20평대', '25평대', '30평대', '40평대', '50평대이상']
        )

        # 건축연수 계산
        current_year = datetime.now().year
        self.df['건축연수'] = current_year - self.df['건축년도']

        # 이상치 제거 (거래금액 기준)
        Q1 = self.df['거래금액'].quantile(0.01)
        Q3 = self.df['거래금액'].quantile(0.99)
        IQR = Q3 - Q1
        lower_bound = Q1 - 1.5 * IQR
        upper_bound = Q3 + 1.5 * IQR

        original_count = len(self.df)
        self.df = self.df[(self.df['거래금액'] >= lower_bound) & (self.df['거래금액'] <= upper_bound)]
        removed_count = original_count - len(self.df)

        if removed_count > 0:
            print(f"[전처리] 이상치 {removed_count}건 제거 (전체 {original_count}건 중 {removed_count/original_count*100:.1f}%)")

        print(f"[전처리 완료] 최종 데이터: {len(self.df)}건")

    def get_summary_statistics(self):
        """기술 통계 분석"""
        if self.df.empty:
            return None

        stats = {
            '전체거래건수': len(self.df),
            '평균거래가': self.df['거래금액'].mean(),
            '중위거래가': self.df['거래금액'].median(),
            '최고거래가': self.df['거래금액'].max(),
            '최저거래가': self.df['거래금액'].min(),
            '평균평당가': self.df['평당가'].mean(),
            '평균㎡당가': self.df['㎡당가'].mean(),
            '평균전용면적': self.df['전용면적'].mean(),
            '평균건축연수': self.df['건축연수'].mean(),
        }

        return stats

    def analyze_by_complex(self, top_n=10):
        """단지별 분석"""
        if self.df.empty:
            return None

        complex_analysis = self.df.groupby('아파트').agg({
            '거래금액': ['count', 'mean', 'median', 'max', 'min'],
            '평당가': 'mean',
            '전용면적': 'mean',
            '건축년도': 'first'
        }).round(2)

        complex_analysis.columns = ['거래건수', '평균가격', '중위가격', '최고가격', '최저가격', '평균평당가', '평균면적', '건축년도']
        complex_analysis = complex_analysis.sort_values('거래건수', ascending=False)

        return complex_analysis.head(top_n)

    def analyze_by_area_type(self):
        """평형대별 분석"""
        if self.df.empty:
            return None

        area_analysis = self.df.groupby('평형대').agg({
            '거래금액': ['count', 'mean', 'median'],
            '평당가': 'mean',
            '㎡당가': 'mean'
        }).round(2)

        area_analysis.columns = ['거래건수', '평균가격', '중위가격', '평균평당가', '평균㎡당가']

        return area_analysis

    def analyze_monthly_trend(self):
        """월별 거래 동향 분석"""
        if self.df.empty:
            return None

        monthly = self.df.groupby(self.df['거래년월일'].dt.to_period('M')).agg({
            '거래금액': ['count', 'mean', 'median'],
            '평당가': 'mean'
        }).round(2)

        monthly.columns = ['거래건수', '평균가격', '중위가격', '평균평당가']
        monthly.index = monthly.index.to_timestamp()

        return monthly

    def calculate_yoy_change(self):
        """전년 대비 변동률 계산"""
        if self.df.empty:
            return None

        # 최근 3개월과 1년 전 3개월 비교
        latest_date = self.df['거래년월일'].max()
        recent_3m = self.df[self.df['거래년월일'] >= (latest_date - timedelta(days=90))]
        yoy_3m = self.df[
            (self.df['거래년월일'] >= (latest_date - timedelta(days=455))) &
            (self.df['거래년월일'] < (latest_date - timedelta(days=365)))
        ]

        if recent_3m.empty or yoy_3m.empty:
            return None

        recent_avg = recent_3m['거래금액'].mean()
        yoy_avg = yoy_3m['거래금액'].mean()

        change_rate = ((recent_avg - yoy_avg) / yoy_avg * 100)

        recent_count = len(recent_3m)
        yoy_count = len(yoy_3m)
        volume_change = ((recent_count - yoy_count) / yoy_count * 100) if yoy_count > 0 else 0

        return {
            '최근3개월평균가': recent_avg,
            '1년전3개월평균가': yoy_avg,
            '가격변동률': change_rate,
            '최근3개월거래량': recent_count,
            '1년전3개월거래량': yoy_count,
            '거래량변동률': volume_change
        }

    def analyze_by_location(self, top_n=10):
        """법정동별 분석"""
        if self.df.empty:
            return None

        location_analysis = self.df.groupby('법정동').agg({
            '거래금액': ['count', 'mean', 'median'],
            '평당가': 'mean'
        }).round(2)

        location_analysis.columns = ['거래건수', '평균가격', '중위가격', '평균평당가']
        location_analysis = location_analysis.sort_values('거래건수', ascending=False)

        return location_analysis.head(top_n)

    def find_high_value_deals(self, top_n=10):
        """고가 거래 분석"""
        if self.df.empty:
            return None

        high_value = self.df.nlargest(top_n, '거래금액')[
            ['거래년월일', '법정동', '아파트', '전용면적', '평수', '거래금액', '평당가', '층', '건축년도']
        ].copy()

        high_value['거래년월일'] = high_value['거래년월일'].dt.strftime('%Y-%m-%d')

        return high_value


def create_visualizations(analyzer):
    """데이터 시각화"""

    # 월별 추이 분석
    monthly_trend = analyzer.analyze_monthly_trend()

    if monthly_trend is not None and not monthly_trend.empty:
        fig, axes = plt.subplots(2, 2, figsize=(16, 12))
        fig.suptitle('서대문구 아파트 실거래가 분석 대시보드', fontsize=16, fontweight='bold')

        # 1. 월별 평균 거래가 추이
        axes[0, 0].plot(monthly_trend.index, monthly_trend['평균가격'], marker='o', linewidth=2, color='#1f77b4')
        axes[0, 0].set_title('월별 평균 거래가 추이', fontsize=12, fontweight='bold')
        axes[0, 0].set_xlabel('거래월')
        axes[0, 0].set_ylabel('거래금액 (만원)')
        axes[0, 0].grid(True, alpha=0.3)
        axes[0, 0].tick_params(axis='x', rotation=45)

        # 2. 월별 거래량 추이
        axes[0, 1].bar(monthly_trend.index, monthly_trend['거래건수'], color='#2ca02c', alpha=0.7)
        axes[0, 1].set_title('월별 거래량 추이', fontsize=12, fontweight='bold')
        axes[0, 1].set_xlabel('거래월')
        axes[0, 1].set_ylabel('거래건수')
        axes[0, 1].grid(True, alpha=0.3, axis='y')
        axes[0, 1].tick_params(axis='x', rotation=45)

        # 3. 평형대별 평균 거래가
        area_analysis = analyzer.analyze_by_area_type()
        if area_analysis is not None:
            axes[1, 0].barh(range(len(area_analysis)), area_analysis['평균가격'], color='#ff7f0e', alpha=0.7)
            axes[1, 0].set_yticks(range(len(area_analysis)))
            axes[1, 0].set_yticklabels(area_analysis.index)
            axes[1, 0].set_title('평형대별 평균 거래가', fontsize=12, fontweight='bold')
            axes[1, 0].set_xlabel('평균 거래금액 (만원)')
            axes[1, 0].grid(True, alpha=0.3, axis='x')

        # 4. 법정동별 거래건수
        location_analysis = analyzer.analyze_by_location(top_n=8)
        if location_analysis is not None:
            axes[1, 1].barh(range(len(location_analysis)), location_analysis['거래건수'], color='#d62728', alpha=0.7)
            axes[1, 1].set_yticks(range(len(location_analysis)))
            axes[1, 1].set_yticklabels(location_analysis.index)
            axes[1, 1].set_title('법정동별 거래건수 (상위 8개)', fontsize=12, fontweight='bold')
            axes[1, 1].set_xlabel('거래건수')
            axes[1, 1].grid(True, alpha=0.3, axis='x')

        plt.tight_layout()
        plt.savefig('D:/AI프로그램제작/agent/apt_analysis_dashboard.png', dpi=300, bbox_inches='tight')
        print("\n[시각화] 대시보드 저장: apt_analysis_dashboard.png")
        plt.close()


def generate_analysis_report(analyzer):
    """종합 분석 리포트 생성"""

    print("\n" + "="*80)
    print("서대문구 아파트 실거래가 분석 리포트")
    print("="*80)

    # 1. 분석 개요
    print("\n## 분석 개요")
    print("-" * 80)

    if analyzer.df.empty:
        print("[오류] 분석할 데이터가 없습니다.")
        return

    min_date = analyzer.df['거래년월일'].min().strftime('%Y-%m-%d')
    max_date = analyzer.df['거래년월일'].max().strftime('%Y-%m-%d')

    print(f"분석 기간: {min_date} ~ {max_date}")
    print(f"데이터 출처: 국토교통부 실거래가 공개시스템")
    print(f"분석 지역: 서울특별시 서대문구")

    # 2. 핵심 인사이트
    print("\n## 핵심 인사이트")
    print("-" * 80)

    stats = analyzer.get_summary_statistics()
    if stats:
        print(f"✓ 전체 거래건수: {stats['전체거래건수']:,}건")
        print(f"✓ 평균 거래가: {stats['평균거래가']:,.0f}만원")
        print(f"✓ 중위 거래가: {stats['중위거래가']:,.0f}만원")
        print(f"✓ 평균 평당가: {stats['평균평당가']:,.0f}만원")
        print(f"✓ 평균 전용면적: {stats['평균전용면적']:.1f}㎡ ({stats['평균전용면적']/3.3058:.1f}평)")
        print(f"✓ 평균 건축연수: {stats['평균건축연수']:.1f}년")

    # 전년 대비 변동률
    yoy_change = analyzer.calculate_yoy_change()
    if yoy_change:
        print(f"\n[전년 대비 변동 분석]")
        print(f"✓ 가격 변동률: {yoy_change['가격변동률']:+.2f}%")
        print(f"  - 최근 3개월 평균: {yoy_change['최근3개월평균가']:,.0f}만원")
        print(f"  - 1년 전 3개월 평균: {yoy_change['1년전3개월평균가']:,.0f}만원")
        print(f"✓ 거래량 변동률: {yoy_change['거래량변동률']:+.2f}%")
        print(f"  - 최근 3개월: {yoy_change['최근3개월거래량']:,}건")
        print(f"  - 1년 전 3개월: {yoy_change['1년전3개월거래량']:,}건")

        # 시장 상황 해석
        if yoy_change['가격변동률'] > 5:
            trend = "상승세"
        elif yoy_change['가격변동률'] < -5:
            trend = "하락세"
        else:
            trend = "보합세"

        print(f"\n→ 시장 현황: {trend} (가격 {yoy_change['가격변동률']:+.2f}%, 거래량 {yoy_change['거래량변동률']:+.2f}%)")

    # 3. 상세 분석
    print("\n## 상세 분석")
    print("-" * 80)

    # 3-1. 단지별 분석
    print("\n### 주요 아파트 단지별 시세 현황 (거래량 상위 10개)")
    complex_analysis = analyzer.analyze_by_complex(top_n=10)
    if complex_analysis is not None:
        print(complex_analysis.to_string())

        print("\n[단지별 주요 발견사항]")
        top_complex = complex_analysis.index[0]
        top_avg_price = complex_analysis.loc[top_complex, '평균가격']
        top_count = complex_analysis.loc[top_complex, '거래건수']
        print(f"✓ 거래량 1위: {top_complex} ({top_count:.0f}건, 평균 {top_avg_price:,.0f}만원)")

        highest_price_complex = complex_analysis['평균가격'].idxmax()
        highest_price = complex_analysis.loc[highest_price_complex, '평균가격']
        print(f"✓ 평균가격 최고: {highest_price_complex} ({highest_price:,.0f}만원)")

    # 3-2. 평형대별 분석
    print("\n### 평형대별 가격 분석")
    area_analysis = analyzer.analyze_by_area_type()
    if area_analysis is not None:
        print(area_analysis.to_string())

        print("\n[평형대별 주요 발견사항]")
        most_traded_area = area_analysis['거래건수'].idxmax()
        most_traded_count = area_analysis.loc[most_traded_area, '거래건수']
        print(f"✓ 거래량 최다 평형: {most_traded_area} ({most_traded_count:.0f}건)")

        highest_price_area = area_analysis['평균가격'].idxmax()
        highest_area_price = area_analysis.loc[highest_price_area, '평균가격']
        print(f"✓ 평균가격 최고 평형: {highest_price_area} ({highest_area_price:,.0f}만원)")

    # 3-3. 법정동별 분석
    print("\n### 법정동별 거래 현황 (상위 10개)")
    location_analysis = analyzer.analyze_by_location(top_n=10)
    if location_analysis is not None:
        print(location_analysis.to_string())

    # 3-4. 월별 추이
    print("\n### 월별 거래 동향")
    monthly_trend = analyzer.analyze_monthly_trend()
    if monthly_trend is not None:
        print(monthly_trend.tail(12).to_string())

        # 최근 추세 분석
        if len(monthly_trend) >= 3:
            recent_3m_avg = monthly_trend['평균가격'].tail(3).mean()
            prev_3m_avg = monthly_trend['평균가격'].tail(6).head(3).mean()

            if prev_3m_avg > 0:
                recent_change = ((recent_3m_avg - prev_3m_avg) / prev_3m_avg * 100)
                print(f"\n[단기 추세] 최근 3개월 vs 직전 3개월: {recent_change:+.2f}%")

    # 3-5. 고가 거래
    print("\n### 고가 거래 상위 10건")
    high_value = analyzer.find_high_value_deals(top_n=10)
    if high_value is not None:
        print(high_value.to_string(index=False))

    # 4. 투자 분석 및 시사점
    print("\n## 투자 분석 및 시사점")
    print("-" * 80)

    if yoy_change and stats:
        print("\n### 시장 종합 평가")

        # 가격 수준 평가
        avg_price_per_py = stats['평균평당가']
        if avg_price_per_py > 4000:
            price_level = "고가"
        elif avg_price_per_py > 3000:
            price_level = "중고가"
        elif avg_price_per_py > 2000:
            price_level = "중가"
        else:
            price_level = "저가"

        print(f"✓ 가격 수준: {price_level} (평당 {avg_price_per_py:,.0f}만원)")

        # 시장 활성도 평가
        total_deals = stats['전체거래건수']
        months = (analyzer.df['거래년월일'].max() - analyzer.df['거래년월일'].min()).days / 30
        monthly_avg = total_deals / months if months > 0 else 0

        print(f"✓ 시장 활성도: 월평균 {monthly_avg:.0f}건 거래")

        # 투자 관점 분석
        print("\n### 투자 관점 분석")

        if yoy_change['가격변동률'] > 10:
            print("✓ 가격 급등 국면 - 단기 과열 가능성 점검 필요")
            print("  → 추가 상승 여력보다는 조정 리스크 고려")
        elif yoy_change['가격변동률'] > 5:
            print("✓ 완만한 상승 국면 - 안정적인 가격 상승세")
            print("  → 중장기 보유 관점에서 긍정적")
        elif yoy_change['가격변동률'] > -5:
            print("✓ 보합 국면 - 가격 안정화 단계")
            print("  → 저점 매수 기회 또는 관망 전략 유효")
        else:
            print("✓ 조정 국면 - 가격 하락 추세")
            print("  → 추가 하락 가능성 모니터링, 저점 매수 타이밍 포착")

        if yoy_change['거래량변동률'] > 20:
            print("✓ 거래량 급증 - 시장 관심도 증가")
        elif yoy_change['거래량변동률'] < -20:
            print("✓ 거래량 감소 - 관망세 강화 또는 유동성 부족")

        # 평형대별 투자 전략
        if area_analysis is not None:
            print("\n### 평형대별 투자 포인트")

            # 거래량 기준 유동성 평가
            liquid_area = area_analysis['거래건수'].idxmax()
            print(f"✓ 유동성 최고: {liquid_area} (매도 용이성 우수)")

            # 평당가 효율성
            area_with_price = area_analysis.copy()
            area_with_price['평당가대비거래량'] = area_with_price['거래건수'] / area_with_price['평균평당가'] * 1000
            efficient_area = area_with_price['평당가대비거래량'].idxmax()
            print(f"✓ 가격 효율성 우수: {efficient_area} (가성비 투자)")

        # 지역별 투자 전략
        if location_analysis is not None:
            print("\n### 법정동별 투자 포인트")
            top_location = location_analysis.index[0]
            top_loc_price = location_analysis.loc[top_location, '평균가격']
            print(f"✓ 거래 활발 지역: {top_location} (평균 {top_loc_price:,.0f}만원)")

            premium_location = location_analysis['평균가격'].idxmax()
            premium_price = location_analysis.loc[premium_location, '평균가격']
            print(f"✓ 프리미엄 지역: {premium_location} (평균 {premium_price:,.0f}만원)")

    # 5. 주의사항 및 추가 고려사항
    print("\n## 주의사항 및 추가 고려사항")
    print("-" * 80)
    print("✓ 실거래가는 신고 후 공개까지 1-2개월 시차 존재")
    print("✓ 최근 1-2개월 데이터는 일부 미반영 거래 있을 수 있음")
    print("✓ 단지별 분석 시 소수 거래는 대표성 제한적")
    print("✓ 투자 결정 시 금리, 대출규제, 세금 등 추가 고려 필수")
    print("✓ 전세가율, 학군, 교통 등 입지 요인 별도 분석 권장")
    print("✓ 본 분석은 과거 데이터 기반이며, 미래 가격 보장하지 않음")

    print("\n" + "="*80)
    print("분석 리포트 완료")
    print("="*80 + "\n")


def main():
    """메인 실행 함수"""

    print("="*80)
    print("서대문구 아파트 실거래가 데이터 수집 및 분석 시작")
    print("="*80 + "\n")

    # API 설정
    SERVICE_KEY = "70411bb72109c3a6837f306f86cc59f9643ab27b0cc997c6a463b99469f43842"
    LAWD_CD = "11410"  # 서대문구

    # 수집 기간 설정 (최근 24개월)
    end_date = datetime.now()
    start_date = end_date - timedelta(days=730)  # 약 24개월

    start_month = start_date.strftime('%Y%m')
    end_month = end_date.strftime('%Y%m')

    print(f"[수집 설정]")
    print(f"- 지역: 서울특별시 서대문구 (코드: {LAWD_CD})")
    print(f"- 기간: {start_month} ~ {end_month}")
    print(f"- API: 국토교통부 아파트매매 실거래 상세 자료\n")

    # 1. 데이터 수집
    print("[1단계] 데이터 수집 중...")
    collector = ApartmentDataCollector(SERVICE_KEY)
    df = collector.collect_period_data(LAWD_CD, start_month, end_month)

    if df.empty:
        print("\n[오류] 수집된 데이터가 없습니다. API 키 및 네트워크 상태를 확인하세요.")
        return

    print(f"\n[수집 완료] 총 {len(df)}건의 거래 데이터 수집\n")

    # 2. 데이터 저장
    output_file = 'D:/AI프로그램제작/agent/seodaemun_apt_data.csv'
    df.to_csv(output_file, index=False, encoding='utf-8-sig')
    print(f"[데이터 저장] {output_file}\n")

    # 3. 데이터 분석
    print("[2단계] 데이터 분석 중...")
    analyzer = ApartmentDataAnalyzer(df)

    # 4. 분석 리포트 생성
    print("\n[3단계] 분석 리포트 생성...")
    generate_analysis_report(analyzer)

    # 5. 시각화
    print("\n[4단계] 데이터 시각화...")
    create_visualizations(analyzer)

    print("\n[완료] 모든 분석 프로세스가 완료되었습니다.")
    print(f"\n생성된 파일:")
    print(f"- 원본 데이터: D:/AI프로그램제작/agent/seodaemun_apt_data.csv")
    print(f"- 시각화 대시보드: D:/AI프로그램제작/agent/apt_analysis_dashboard.png")


if __name__ == "__main__":
    main()
