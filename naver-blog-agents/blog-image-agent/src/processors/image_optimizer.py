import os
from pathlib import Path
from typing import Optional, Tuple
from PIL import Image
from dataclasses import dataclass

@dataclass
class OptimizationResult:
    success: bool
    original_size: int
    optimized_size: int
    original_dimensions: Tuple[int, int]
    new_dimensions: Tuple[int, int]
    format: str
    error: Optional[str] = None

    @property
    def compression_ratio(self) -> float:
        if self.original_size == 0:
            return 0
        return (1 - self.optimized_size / self.original_size) * 100

class ImageOptimizer:
    """이미지 리사이즈 및 최적화"""

    # 블로그 최적 크기
    BLOG_SIZES = {
        "thumbnail": (1200, 630),   # 16:9 OG 이미지
        "content": (800, 600),      # 본문 이미지
        "banner": (1200, 400),      # 배너
        "square": (800, 800),       # 정사각형
    }

    def __init__(
        self,
        max_width: int = 1200,
        max_height: int = 1200,
        quality: int = 85,
        convert_to_webp: bool = True
    ):
        self.max_width = max_width
        self.max_height = max_height
        self.quality = quality
        self.convert_to_webp = convert_to_webp

    def optimize(
        self,
        input_path: str,
        output_path: Optional[str] = None,
        target_size: Optional[str] = None,
        max_width: Optional[int] = None,
        max_height: Optional[int] = None
    ) -> OptimizationResult:
        """이미지 최적화

        Args:
            input_path: 입력 이미지 경로
            output_path: 출력 경로 (None이면 자동 생성)
            target_size: 대상 크기 (thumbnail, content, banner, square)
            max_width: 최대 너비 (target_size보다 우선)
            max_height: 최대 높이

        Returns:
            OptimizationResult
        """
        path = Path(input_path)

        if not path.exists():
            return OptimizationResult(
                success=False,
                original_size=0,
                optimized_size=0,
                original_dimensions=(0, 0),
                new_dimensions=(0, 0),
                format="",
                error="파일이 존재하지 않습니다"
            )

        original_size = path.stat().st_size

        try:
            with Image.open(path) as img:
                original_dimensions = img.size

                # 대상 크기 결정
                if max_width and max_height:
                    target_w, target_h = max_width, max_height
                elif target_size and target_size in self.BLOG_SIZES:
                    target_w, target_h = self.BLOG_SIZES[target_size]
                else:
                    target_w, target_h = self.max_width, self.max_height

                # 리사이즈 (비율 유지)
                new_img = self._resize_with_ratio(img, target_w, target_h)
                new_dimensions = new_img.size

                # 출력 경로 결정
                if output_path is None:
                    suffix = ".webp" if self.convert_to_webp else path.suffix
                    output_path = str(path.with_suffix(suffix))

                # 출력 디렉토리 생성
                Path(output_path).parent.mkdir(parents=True, exist_ok=True)

                # 저장
                output_format = "WEBP" if self.convert_to_webp else None

                # RGBA면 RGB로 변환 (JPEG/WebP 호환)
                if new_img.mode in ("RGBA", "P"):
                    new_img = new_img.convert("RGB")

                new_img.save(
                    output_path,
                    format=output_format,
                    quality=self.quality,
                    optimize=True
                )

                optimized_size = Path(output_path).stat().st_size

                return OptimizationResult(
                    success=True,
                    original_size=original_size,
                    optimized_size=optimized_size,
                    original_dimensions=original_dimensions,
                    new_dimensions=new_dimensions,
                    format="WEBP" if self.convert_to_webp else path.suffix.upper()
                )

        except Exception as e:
            return OptimizationResult(
                success=False,
                original_size=original_size,
                optimized_size=0,
                original_dimensions=(0, 0),
                new_dimensions=(0, 0),
                format="",
                error=str(e)
            )

    def _resize_with_ratio(
        self,
        img: Image.Image,
        max_width: int,
        max_height: int
    ) -> Image.Image:
        """비율 유지하면서 리사이즈"""
        original_width, original_height = img.size

        # 이미 충분히 작으면 그대로
        if original_width <= max_width and original_height <= max_height:
            return img.copy()

        # 비율 계산
        width_ratio = max_width / original_width
        height_ratio = max_height / original_height
        ratio = min(width_ratio, height_ratio)

        new_width = int(original_width * ratio)
        new_height = int(original_height * ratio)

        # 고품질 리사이즈
        return img.resize((new_width, new_height), Image.Resampling.LANCZOS)

    def batch_optimize(
        self,
        image_paths: list[str],
        output_dir: str,
        target_size: Optional[str] = None
    ) -> list[OptimizationResult]:
        """배치 이미지 최적화

        Args:
            image_paths: 이미지 경로 리스트
            output_dir: 출력 디렉토리
            target_size: 대상 크기

        Returns:
            OptimizationResult 리스트
        """
        results = []
        output_path = Path(output_dir)
        output_path.mkdir(parents=True, exist_ok=True)

        for path in image_paths:
            input_name = Path(path).stem
            suffix = ".webp" if self.convert_to_webp else Path(path).suffix
            out_file = output_path / f"{input_name}{suffix}"

            result = self.optimize(
                path,
                str(out_file),
                target_size=target_size
            )
            results.append(result)

        return results
