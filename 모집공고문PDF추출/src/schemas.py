"""아파트 분양가 데이터 스키마 정의"""
from pydantic import BaseModel, Field
from typing import Optional


class LayerPrice(BaseModel):
    """층별 분양가 정보"""
    층구분: str = Field(..., description="층 구분 (예: 2층, 3~10층)")
    세대수: int = Field(..., description="해당 층의 세대수")
    대지비: int = Field(..., description="대지비 (원)")
    건축비: int = Field(..., description="건축비 (원)")
    분양가_원: int = Field(..., description="분양가 합계 (원)")


class HousingType(BaseModel):
    """주택형별 분양가 정보"""
    주택형: str = Field(..., description="주택형 (예: 59A, 84B)")
    전용면적_m2: float = Field(..., description="전용면적 (m2)")
    공급세대수: int = Field(..., description="공급 세대수")
    층별_분양가: list[LayerPrice] = Field(default_factory=list, description="층별 분양가 목록")
    최저가_억: float = Field(..., description="최저 분양가 (억 원)")
    최고가_억: float = Field(..., description="최고 분양가 (억 원)")


class PaymentSchedule(BaseModel):
    """납부일정 정보"""
    계약금: str = Field(..., description="계약금 비율 (예: 10%)")
    중도금: str = Field(..., description="중도금 비율 (예: 60%)")
    잔금: str = Field(..., description="잔금 비율 (예: 30%)")


class ApartmentData(BaseModel):
    """아파트 모집공고 전체 데이터"""
    단지명: str = Field(..., description="아파트 단지명")
    위치: str = Field(..., description="아파트 위치 주소")
    총세대수: int = Field(..., description="총 공급 세대수")
    분양가: list[HousingType] = Field(default_factory=list, description="주택형별 분양가 목록")
    납부일정: Optional[PaymentSchedule] = Field(None, description="납부일정 정보")
