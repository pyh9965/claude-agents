import sys
from loguru import logger
from pathlib import Path

def setup_logger(log_level: str = "INFO", log_file: str = None):
    """로거 설정"""
    # 기존 핸들러 제거
    logger.remove()

    # 콘솔 출력
    logger.add(
        sys.stderr,
        format="<green>{time:YYYY-MM-DD HH:mm:ss}</green> | <level>{level: <8}</level> | <cyan>{name}</cyan>:<cyan>{function}</cyan>:<cyan>{line}</cyan> - <level>{message}</level>",
        level=log_level,
    )

    # 파일 출력 (선택적)
    if log_file:
        log_path = Path(log_file)
        log_path.parent.mkdir(parents=True, exist_ok=True)
        logger.add(
            log_file,
            rotation="10 MB",
            retention="7 days",
            level=log_level,
        )

    return logger
