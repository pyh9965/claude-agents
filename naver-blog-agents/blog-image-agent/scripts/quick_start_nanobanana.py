#!/usr/bin/env python3
"""나노바나나 3.0 Pro 빠른 시작 스크립트"""

import asyncio
import os
import sys
from pathlib import Path

# 프로젝트 루트 추가
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from src.collectors.nanobanana import NanobananGenerator


def check_api_key():
    """API 키 확인"""
    api_key = os.getenv("GOOGLE_API_KEY")
    if not api_key:
        print("❌ GOOGLE_API_KEY 환경변수가 설정되지 않았습니다.")
        print("\n설정 방법:")
        print("  Windows: set GOOGLE_API_KEY=your_api_key")
        print("  Linux/Mac: export GOOGLE_API_KEY=your_api_key")
        return False
    print("✅ API 키 확인 완료")
    return True


async def generate_sample_images():
    """샘플 이미지 생성"""

    print("\n" + "="*60)
    print("나노바나나 3.0 Pro Generator - 빠른 시작")
    print("="*60)

    if not check_api_key():
        return

    # 출력 디렉토리 생성
    output_dir = Path("output/quick_start")
    output_dir.mkdir(parents=True, exist_ok=True)
    print(f"\n📁 출력 디렉토리: {output_dir.absolute()}")

    # Generator 초기화
    print("\n⚙️  Generator 초기화 중...")
    generator = NanobananGenerator()
    print("✅ 초기화 완료")

    # 샘플 이미지 목록
    samples = [
        {
            "name": "블로그 썸네일",
            "keywords": ["맛집", "리뷰", "강남"],
            "image_type": "thumbnail",
            "style": "food",
            "filename": "thumbnail_sample.png"
        },
        {
            "name": "푸드 포토",
            "keywords": ["김치찌개", "한식"],
            "image_type": "food_photo",
            "style": "food",
            "filename": "food_sample.png"
        },
        {
            "name": "인포그래픽",
            "keywords": ["건강", "식습관", "5가지 팁"],
            "image_type": "infographic",
            "style": "lifestyle",
            "filename": "infographic_sample.png"
        }
    ]

    print(f"\n🎨 {len(samples)}개의 샘플 이미지 생성 중...\n")

    for idx, sample in enumerate(samples, 1):
        print(f"[{idx}/{len(samples)}] {sample['name']} 생성 중...")
        print(f"  키워드: {', '.join(sample['keywords'])}")
        print(f"  유형: {sample['image_type']}")
        print(f"  스타일: {sample['style']}")

        try:
            result = await generator.collect(
                keywords=sample['keywords'],
                max_images=1,
                image_type=sample['image_type'],
                style=sample['style']
            )

            if result.success and result.images:
                img = result.images[0]
                output_path = output_dir / sample['filename']

                # 이미지 저장
                success = generator.save_image(img['data'], str(output_path))

                if success:
                    print(f"  ✅ 저장 완료: {output_path.name}")
                    print(f"  📏 크기: {img['width']}x{img['height']}")
                    print(f"  📝 프롬프트: {img['prompt'][:80]}...")
                else:
                    print(f"  ❌ 저장 실패")
            else:
                print(f"  ❌ 생성 실패: {result.error}")

        except Exception as e:
            print(f"  ❌ 오류 발생: {e}")

        print()

    print("="*60)
    print("✨ 완료!")
    print(f"📂 생성된 이미지 확인: {output_dir.absolute()}")
    print("="*60)


async def interactive_mode():
    """대화형 모드"""

    print("\n" + "="*60)
    print("나노바나나 3.0 Pro - 대화형 모드")
    print("="*60)

    if not check_api_key():
        return

    generator = NanobananGenerator()

    while True:
        print("\n이미지 생성 옵션:")
        print("1. 썸네일 이미지")
        print("2. 푸드 포토")
        print("3. 인포그래픽")
        print("4. 배너 이미지")
        print("0. 종료")

        choice = input("\n선택 (0-4): ").strip()

        if choice == "0":
            print("종료합니다.")
            break

        if choice not in ["1", "2", "3", "4"]:
            print("올바른 번호를 선택하세요.")
            continue

        # 이미지 유형 매핑
        type_map = {
            "1": ("thumbnail", "food"),
            "2": ("food_photo", "food"),
            "3": ("infographic", "lifestyle"),
            "4": ("banner", "default")
        }

        image_type, default_style = type_map[choice]

        # 키워드 입력
        keywords_input = input("키워드 입력 (쉼표로 구분): ").strip()
        if not keywords_input:
            print("키워드를 입력하세요.")
            continue

        keywords = [kw.strip() for kw in keywords_input.split(",")]

        # 스타일 선택
        print("\n스타일: food, travel, lifestyle, tech, default")
        style = input(f"스타일 선택 (기본: {default_style}): ").strip() or default_style

        # 파일명 입력
        filename = input("저장 파일명 (기본: generated.png): ").strip() or "generated.png"
        if not filename.endswith(".png"):
            filename += ".png"

        print(f"\n🎨 이미지 생성 중...")

        try:
            result = await generator.collect(
                keywords=keywords,
                max_images=1,
                image_type=image_type,
                style=style
            )

            if result.success and result.images:
                img = result.images[0]

                output_dir = Path("output/interactive")
                output_dir.mkdir(parents=True, exist_ok=True)
                output_path = output_dir / filename

                success = generator.save_image(img['data'], str(output_path))

                if success:
                    print(f"\n✅ 생성 완료!")
                    print(f"📂 저장 위치: {output_path.absolute()}")
                    print(f"📏 이미지 크기: {img['width']}x{img['height']}")
                else:
                    print(f"\n❌ 저장 실패")
            else:
                print(f"\n❌ 생성 실패: {result.error}")

        except Exception as e:
            print(f"\n❌ 오류 발생: {e}")


def main():
    """메인 함수"""

    if len(sys.argv) > 1 and sys.argv[1] == "--interactive":
        # 대화형 모드
        asyncio.run(interactive_mode())
    else:
        # 샘플 생성 모드
        asyncio.run(generate_sample_images())


if __name__ == "__main__":
    main()
