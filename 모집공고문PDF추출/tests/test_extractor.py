"""분양가 추출기 테스트"""
import pytest
import json
from pathlib import Path
import tempfile
import shutil

from src.schemas import ApartmentData, HousingType, LayerPrice, PaymentSchedule
from src.saver import save_results, save_csv, save_markdown
from src.utils import format_price, ensure_dir, setup_logging


class TestSchemas:
    """스키마 테스트"""

    def test_layer_price_creation(self):
        """LayerPrice 모델 생성 테스트"""
        layer = LayerPrice(
            층구분="2층",
            세대수=6,
            대지비=441180000,
            건축비=719820000,
            분양가_원=1161000000
        )
        assert layer.층구분 == "2층"
        assert layer.분양가_원 == 1161000000

    def test_housing_type_creation(self):
        """HousingType 모델 생성 테스트"""
        housing = HousingType(
            주택형="59A",
            전용면적_m2=59.86,
            공급세대수=97,
            층별_분양가=[],
            최저가_억=11.61,
            최고가_억=12.43
        )
        assert housing.주택형 == "59A"
        assert housing.전용면적_m2 == 59.86

    def test_payment_schedule_creation(self):
        """PaymentSchedule 모델 생성 테스트"""
        schedule = PaymentSchedule(
            계약금="10%",
            중도금="60%",
            잔금="30%"
        )
        assert schedule.계약금 == "10%"

    def test_apartment_data_full(self):
        """ApartmentData 전체 모델 테스트"""
        data = ApartmentData(
            단지명="테스트 아파트",
            위치="서울시 강남구",
            총세대수=500,
            분양가=[
                HousingType(
                    주택형="59A",
                    전용면적_m2=59.86,
                    공급세대수=100,
                    층별_분양가=[
                        LayerPrice(
                            층구분="2층",
                            세대수=5,
                            대지비=400000000,
                            건축비=600000000,
                            분양가_원=1000000000
                        )
                    ],
                    최저가_억=10.0,
                    최고가_억=12.0
                )
            ],
            납부일정=PaymentSchedule(
                계약금="10%",
                중도금="60%",
                잔금="30%"
            )
        )
        assert data.단지명 == "테스트 아파트"
        assert len(data.분양가) == 1
        assert data.분양가[0].주택형 == "59A"


class TestUtils:
    """유틸리티 함수 테스트"""

    def test_format_price_억(self):
        """억 단위 포맷 테스트"""
        assert format_price(1161000000) == "11억 6,100만원"

    def test_format_price_억_only(self):
        """억 단위만 있는 경우"""
        assert format_price(1000000000) == "10억원"

    def test_format_price_만_only(self):
        """만 단위만 있는 경우"""
        assert format_price(50000000) == "5,000만원"

    def test_format_price_원_only(self):
        """원 단위만 있는 경우"""
        assert format_price(5000) == "5,000원"

    def test_ensure_dir(self):
        """디렉토리 생성 테스트"""
        with tempfile.TemporaryDirectory() as tmpdir:
            new_dir = Path(tmpdir) / "test" / "nested"
            result = ensure_dir(new_dir)
            assert result.exists()
            assert result.is_dir()


class TestSaver:
    """저장 기능 테스트"""

    @pytest.fixture
    def sample_data(self) -> ApartmentData:
        """테스트용 샘플 데이터"""
        return ApartmentData(
            단지명="테스트 아파트",
            위치="서울시 강남구",
            총세대수=500,
            분양가=[
                HousingType(
                    주택형="59A",
                    전용면적_m2=59.86,
                    공급세대수=100,
                    층별_분양가=[
                        LayerPrice(
                            층구분="2층",
                            세대수=5,
                            대지비=400000000,
                            건축비=600000000,
                            분양가_원=1000000000
                        )
                    ],
                    최저가_억=10.0,
                    최고가_억=12.0
                )
            ],
            납부일정=PaymentSchedule(
                계약금="10%",
                중도금="60%",
                잔금="30%"
            )
        )

    def test_save_results(self, sample_data):
        """save_results 전체 테스트"""
        with tempfile.TemporaryDirectory() as tmpdir:
            setup_logging(log_level="WARNING")  # 테스트 중 로그 최소화

            saved_files = save_results(sample_data, tmpdir)

            assert "json" in saved_files
            assert "csv" in saved_files
            assert "markdown" in saved_files

            # JSON 파일 검증
            assert saved_files["json"].exists()
            with open(saved_files["json"], encoding="utf-8") as f:
                loaded = json.load(f)
            assert loaded["단지명"] == "테스트 아파트"

            # CSV 파일 검증
            assert saved_files["csv"].exists()

            # Markdown 파일 검증
            assert saved_files["markdown"].exists()
            content = saved_files["markdown"].read_text(encoding="utf-8")
            assert "테스트 아파트" in content
            assert "59A" in content


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
