"""간단한 이미지 분류 스크립트"""
import os
import sys
import json
from pathlib import Path

os.environ["GOOGLE_API_KEY"] = "AIzaSyDMKBbyKN5-Kg-eC3-rlBkYReQ76khP5_o"

# 프로젝트 경로 추가
sys.path.insert(0, str(Path(__file__).parent))

from src.classifier.vision_classifier import VisionClassifier

def main():
    print("=" * 60)
    print("이미지 분류 (Gemini Vision)")
    print("=" * 60)

    # 이미지 디렉토리
    image_dir = Path("D:/AI프로그램제작/agent/이미지수집agent/output/images")

    if not image_dir.exists():
        print(f"[ERROR] 이미지 디렉토리가 없습니다: {image_dir}")
        return

    # 이미지 파일 목록
    image_extensions = {'.jpg', '.jpeg', '.png', '.webp'}
    image_files = [
        f for f in image_dir.iterdir()
        if f.suffix.lower() in image_extensions and f.stat().st_size > 10000  # 10KB 이상
    ]

    print(f"\n분류할 이미지: {len(image_files)}개")

    if not image_files:
        print("[ERROR] 분류할 이미지가 없습니다.")
        return

    # 분류기 초기화
    classifier = VisionClassifier()

    # 분류 실행 (처음 5개만)
    results = []
    for i, img_path in enumerate(image_files[:5], 1):
        print(f"\n[{i}/{min(5, len(image_files))}] {img_path.name}")
        try:
            result = classifier.classify_image(str(img_path))
            results.append(result)

            type_names = {
                "floor_plan": "평면도",
                "site_plan": "배치도",
                "aerial_view": "조감도",
                "location_map": "위치도",
                "other": "기타"
            }
            print(f"    유형: {type_names.get(result.image_type, result.image_type)}")
            print(f"    신뢰도: {result.confidence:.0%}")
            print(f"    설명: {result.description}")

        except Exception as e:
            print(f"    [ERROR] {e}")

    # 결과 저장
    if results:
        output_path = image_dir.parent / "classification_results.json"
        classifier.save_results(results, str(output_path))
        print(f"\n결과 저장: {output_path}")

    # 통계
    print("\n" + "=" * 60)
    print("분류 결과 요약")
    print("=" * 60)

    type_counts = {}
    for r in results:
        type_counts[r.image_type] = type_counts.get(r.image_type, 0) + 1

    type_names = {
        "floor_plan": "평면도",
        "site_plan": "배치도",
        "aerial_view": "조감도",
        "location_map": "위치도",
        "other": "기타"
    }
    for img_type, count in type_counts.items():
        print(f"  {type_names.get(img_type, img_type)}: {count}개")

if __name__ == "__main__":
    main()
