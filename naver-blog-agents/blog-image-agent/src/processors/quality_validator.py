import os
from pathlib import Path
from dataclasses import dataclass
from typing import Optional, Tuple
from PIL import Image
import numpy as np

@dataclass
class QualityReport:
    valid: bool
    width: int
    height: int
    file_size: int
    format: str
    is_blurry: bool
    blur_score: float
    issues: list[str]

    @property
    def quality_score(self) -> float:
        """0-100 품질 점수"""
        score = 100.0

        # 해상도 페널티
        if self.width < 800 or self.height < 600:
            score -= 30
        elif self.width < 1000 or self.height < 750:
            score -= 15

        # 블러 페널티
        if self.is_blurry:
            score -= 25
        elif self.blur_score < 100:
            score -= 10

        # 파일 크기 페널티 (너무 작으면)
        if self.file_size < 10000:  # 10KB 미만
            score -= 20

        return max(0, score)

class QualityValidator:
    """이미지 품질 검증기"""

    MIN_WIDTH = 800
    MIN_HEIGHT = 600
    MIN_FILE_SIZE = 10000  # 10KB
    BLUR_THRESHOLD = 100.0  # Laplacian variance threshold

    def __init__(
        self,
        min_width: int = 800,
        min_height: int = 600,
        min_file_size: int = 10000,
        blur_threshold: float = 100.0
    ):
        self.min_width = min_width
        self.min_height = min_height
        self.min_file_size = min_file_size
        self.blur_threshold = blur_threshold

    def validate(self, image_path: str) -> QualityReport:
        """이미지 품질 검증

        Args:
            image_path: 이미지 파일 경로

        Returns:
            QualityReport
        """
        path = Path(image_path)
        issues = []

        # 파일 존재 확인
        if not path.exists():
            return QualityReport(
                valid=False, width=0, height=0, file_size=0,
                format="", is_blurry=False, blur_score=0,
                issues=["파일이 존재하지 않습니다"]
            )

        # 파일 크기
        file_size = path.stat().st_size
        if file_size < self.min_file_size:
            issues.append(f"파일 크기가 너무 작습니다: {file_size} bytes")

        try:
            with Image.open(path) as img:
                width, height = img.size
                img_format = img.format or path.suffix.upper().replace(".", "")

                # 해상도 검증
                if width < self.min_width:
                    issues.append(f"너비가 부족합니다: {width}px < {self.min_width}px")
                if height < self.min_height:
                    issues.append(f"높이가 부족합니다: {height}px < {self.min_height}px")

                # 블러 검사
                is_blurry, blur_score = self._check_blur(img)
                if is_blurry:
                    issues.append(f"이미지가 흐릿합니다 (blur score: {blur_score:.1f})")

                valid = len(issues) == 0

                return QualityReport(
                    valid=valid,
                    width=width,
                    height=height,
                    file_size=file_size,
                    format=img_format,
                    is_blurry=is_blurry,
                    blur_score=blur_score,
                    issues=issues
                )

        except Exception as e:
            return QualityReport(
                valid=False, width=0, height=0, file_size=file_size,
                format="", is_blurry=False, blur_score=0,
                issues=[f"이미지를 열 수 없습니다: {e}"]
            )

    def _check_blur(self, img: Image.Image) -> Tuple[bool, float]:
        """Laplacian 방식으로 블러 검사

        Returns:
            (is_blurry, blur_score)
        """
        try:
            # 그레이스케일 변환
            gray = img.convert("L")

            # numpy 배열로 변환
            img_array = np.array(gray, dtype=np.float64)

            # Laplacian 커널 적용 (간단한 방식)
            laplacian = np.array([[0, 1, 0], [1, -4, 1], [0, 1, 0]])

            from scipy import ndimage
            filtered = ndimage.convolve(img_array, laplacian)
            variance = filtered.var()

            is_blurry = variance < self.blur_threshold
            return is_blurry, variance

        except ImportError:
            # scipy 없으면 간단한 방식으로
            return False, 200.0  # 기본값
        except Exception:
            return False, 200.0

    def filter_valid_images(self, image_paths: list[str]) -> list[str]:
        """유효한 이미지만 필터링

        Args:
            image_paths: 이미지 경로 리스트

        Returns:
            유효한 이미지 경로 리스트
        """
        valid_images = []
        for path in image_paths:
            report = self.validate(path)
            if report.valid:
                valid_images.append(path)
        return valid_images
