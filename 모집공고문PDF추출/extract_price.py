#!/usr/bin/env python3
"""아파트 모집공고문 PDF 분양가 추출 CLI"""
import argparse
import sys
from pathlib import Path

from src.extractor import extract_price_from_pdf
from src.saver import save_results
from src.utils import setup_logging, get_logger


def main() -> int:
    """메인 CLI 진입점"""
    parser = argparse.ArgumentParser(
        description="아파트 모집공고문 PDF에서 분양가를 추출합니다.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
예시:
  python extract_price.py --input 모집공고문.pdf --output ./results/
  python extract_price.py -i 모집공고문.pdf -o ./results/ --log-level DEBUG
        """
    )

    parser.add_argument(
        "-i", "--input",
        required=True,
        help="입력 PDF 파일 경로"
    )

    parser.add_argument(
        "-o", "--output",
        default="./results",
        help="결과 저장 디렉토리 (기본값: ./results)"
    )

    parser.add_argument(
        "--log-level",
        choices=["DEBUG", "INFO", "WARNING", "ERROR"],
        default="INFO",
        help="로그 레벨 (기본값: INFO)"
    )

    parser.add_argument(
        "--no-log-file",
        action="store_true",
        help="로그 파일을 생성하지 않음"
    )

    args = parser.parse_args()

    # 로깅 설정
    log_dir = None if args.no_log_file else "logs"
    setup_logging(log_level=args.log_level, log_dir=log_dir)
    logger = get_logger()

    # 입력 파일 확인
    input_path = Path(args.input)
    if not input_path.exists():
        logger.error(f"입력 파일을 찾을 수 없습니다: {args.input}")
        return 1

    if not input_path.suffix.lower() == ".pdf":
        logger.error(f"PDF 파일이 아닙니다: {args.input}")
        return 1

    try:
        # 분양가 추출
        logger.info(f"처리 시작: {input_path.name}")
        data = extract_price_from_pdf(str(input_path))

        # 결과 저장
        saved_files = save_results(data, args.output)

        # 결과 출력
        print("\n" + "=" * 50)
        print(f"추출 완료: {data.단지명}")
        print("=" * 50)
        print(f"위치: {data.위치}")
        print(f"총세대수: {data.총세대수:,}세대")
        print(f"주택형 수: {len(data.분양가)}개")
        print()
        print("저장된 파일:")
        for format_type, path in saved_files.items():
            print(f"  - {format_type}: {path}")
        print("=" * 50)

        return 0

    except FileNotFoundError as e:
        logger.error(str(e))
        return 1
    except ValueError as e:
        logger.error(f"데이터 처리 오류: {e}")
        return 2
    except Exception as e:
        logger.exception(f"예상치 못한 오류: {e}")
        return 3


if __name__ == "__main__":
    sys.exit(main())
