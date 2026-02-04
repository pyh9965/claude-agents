"""파이프라인 실행 예제"""

import asyncio
import logging
import sys
from pathlib import Path

# 프로젝트 루트를 sys.path에 추가
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from src.pipeline.orchestrator import PipelineOrchestrator


# 로깅 설정
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler('pipeline.log', encoding='utf-8')
    ]
)


async def main():
    """메인 실행 함수"""

    # 테스트 URL (실제 URL로 교체 필요)
    test_url = "https://example.com/apartment-info"

    # Orchestrator 초기화
    orchestrator = PipelineOrchestrator(output_dir="output")

    print("\n" + "=" * 80)
    print("이미지 수집 파이프라인 실행 예제")
    print("=" * 80 + "\n")

    try:
        # 단일 URL 파이프라인 실행
        print(f"URL 처리 중: {test_url}\n")
        report = await orchestrator.run(test_url, generate_thumbnails=True)

        # 결과 출력
        print("\n" + "=" * 80)
        print("파이프라인 실행 완료!")
        print("=" * 80)
        print(f"\n아파트: {report.apartment_name}")
        print(f"URL: {report.url}")
        print(f"시작 시간: {report.started_at}")
        print(f"완료 시간: {report.completed_at}")

        print("\n--- 수집 통계 ---")
        print(f"웹 이미지 수집: {report.collected_images}개")
        print(f"PDF 이미지 추출: {report.extracted_images}개")
        print(f"이미지 분류: {report.classified_images}개")
        print(f"썸네일 생성: {report.thumbnails_generated}개")

        print("\n--- 분류 결과 ---")
        for image_type, count in report.classification_summary.items():
            print(f"  {image_type}: {count}개")

        print("\n--- 단계별 상태 ---")
        for step in report.steps:
            status_icon = "✓" if step.status == "completed" else "✗" if step.status == "failed" else "○"
            print(f"{status_icon} {step.name}: {step.status}")
            if step.error:
                print(f"  에러: {step.error}")

        print("\n" + "=" * 80 + "\n")

    except Exception as e:
        print(f"\n오류 발생: {e}")
        import traceback
        traceback.print_exc()


async def batch_example():
    """배치 실행 예제"""

    # 여러 URL 처리
    urls = [
        "https://example.com/apartment1",
        "https://example.com/apartment2",
        "https://example.com/apartment3",
    ]

    orchestrator = PipelineOrchestrator(output_dir="output_batch")

    print("\n" + "=" * 80)
    print(f"배치 파이프라인 실행: {len(urls)}개 URL")
    print("=" * 80 + "\n")

    try:
        reports = await orchestrator.run_batch(urls, generate_thumbnails=True)

        print("\n" + "=" * 80)
        print(f"배치 실행 완료: {len(reports)}/{len(urls)}개 성공")
        print("=" * 80)

        for i, report in enumerate(reports, 1):
            print(f"\n[{i}] {report.apartment_name}")
            print(f"    수집: {report.collected_images}, 추출: {report.extracted_images}, 분류: {report.classified_images}")

    except Exception as e:
        print(f"\n오류 발생: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    # 단일 URL 실행
    asyncio.run(main())

    # 배치 실행 (주석 해제하여 사용)
    # asyncio.run(batch_example())
