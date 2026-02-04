"""유틸리티 함수 및 로깅 설정"""
import logging
import sys
from pathlib import Path
from datetime import datetime
from functools import wraps
from typing import TypeVar, Callable, Any
import time


def setup_logging(
    log_level: str = "INFO",
    log_file: str | None = None,
    log_dir: str = "logs"
) -> logging.Logger:
    """로깅 설정

    Args:
        log_level: 로그 레벨 (DEBUG, INFO, WARNING, ERROR)
        log_file: 로그 파일명 (None이면 자동 생성)
        log_dir: 로그 파일 저장 디렉토리

    Returns:
        설정된 로거 인스턴스
    """
    logger = logging.getLogger("price_extractor")
    logger.setLevel(getattr(logging, log_level.upper()))

    # 기존 핸들러 제거
    logger.handlers.clear()

    # 포맷터 설정
    formatter = logging.Formatter(
        "[%(asctime)s] %(levelname)s - %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S"
    )

    # 콘솔 핸들러
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setFormatter(formatter)
    logger.addHandler(console_handler)

    # 파일 핸들러 (옵션)
    if log_file or log_dir:
        log_path = Path(log_dir)
        log_path.mkdir(parents=True, exist_ok=True)

        if log_file is None:
            log_file = f"extract_{datetime.now().strftime('%Y%m%d_%H%M%S')}.log"

        file_handler = logging.FileHandler(
            log_path / log_file,
            encoding="utf-8"
        )
        file_handler.setFormatter(formatter)
        logger.addHandler(file_handler)

    return logger


def get_logger() -> logging.Logger:
    """기존 로거 인스턴스 반환"""
    return logging.getLogger("price_extractor")


T = TypeVar("T")


def retry(
    max_attempts: int = 3,
    delay: float = 1.0,
    backoff: float = 2.0,
    exceptions: tuple = (Exception,)
) -> Callable[[Callable[..., T]], Callable[..., T]]:
    """재시도 데코레이터

    Args:
        max_attempts: 최대 시도 횟수
        delay: 초기 대기 시간 (초)
        backoff: 대기 시간 증가 배수
        exceptions: 재시도할 예외 타입들

    Returns:
        데코레이터 함수
    """
    def decorator(func: Callable[..., T]) -> Callable[..., T]:
        @wraps(func)
        def wrapper(*args: Any, **kwargs: Any) -> T:
            logger = get_logger()
            current_delay = delay
            last_exception = None

            for attempt in range(1, max_attempts + 1):
                try:
                    return func(*args, **kwargs)
                except exceptions as e:
                    last_exception = e
                    if attempt < max_attempts:
                        logger.warning(
                            f"{func.__name__} 실패 (시도 {attempt}/{max_attempts}): {e}. "
                            f"{current_delay:.1f}초 후 재시도..."
                        )
                        time.sleep(current_delay)
                        current_delay *= backoff
                    else:
                        logger.error(
                            f"{func.__name__} 최종 실패 ({max_attempts}회 시도): {e}"
                        )

            raise last_exception  # type: ignore
        return wrapper
    return decorator


def ensure_dir(path: str | Path) -> Path:
    """디렉토리 생성 (존재하지 않으면)

    Args:
        path: 디렉토리 경로

    Returns:
        Path 객체
    """
    p = Path(path)
    p.mkdir(parents=True, exist_ok=True)
    return p


def format_price(price: int) -> str:
    """가격을 읽기 쉬운 형식으로 변환

    Args:
        price: 가격 (원)

    Returns:
        포맷된 가격 문자열 (예: "11억 6,100만원")
    """
    억 = price // 100_000_000
    만 = (price % 100_000_000) // 10_000

    if 억 > 0 and 만 > 0:
        return f"{억}억 {만:,}만원"
    elif 억 > 0:
        return f"{억}억원"
    elif 만 > 0:
        return f"{만:,}만원"
    else:
        return f"{price:,}원"
