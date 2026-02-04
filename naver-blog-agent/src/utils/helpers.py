import re
from typing import List, Dict, Any
from datetime import datetime, date
from urllib.parse import urlparse


def clean_html(text: str) -> str:
    """HTML 태그 제거"""
    clean = re.compile('<.*?>')
    return re.sub(clean, '', text)


def extract_blog_id(url: str) -> str:
    """블로그 URL에서 블로거 ID 추출"""
    parsed = urlparse(url)
    path_parts = parsed.path.strip('/').split('/')
    if path_parts:
        return path_parts[0]
    return ""


def format_date(date_str: str) -> str:
    """날짜 문자열 포맷팅 (YYYYMMDD -> YYYY-MM-DD)"""
    if len(date_str) == 8:
        return f"{date_str[:4]}-{date_str[4:6]}-{date_str[6:]}"
    return date_str


def parse_date(date_str: str) -> date:
    """날짜 문자열 파싱"""
    try:
        if len(date_str) == 8:
            return datetime.strptime(date_str, "%Y%m%d").date()
        elif len(date_str) == 10:
            return datetime.strptime(date_str, "%Y-%m-%d").date()
    except ValueError:
        pass
    return None


def truncate_text(text: str, max_length: int = 500) -> str:
    """텍스트 길이 제한"""
    if len(text) <= max_length:
        return text
    return text[:max_length - 3] + "..."


def to_mobile_url(url: str) -> str:
    """데스크톱 URL을 모바일 URL로 변환"""
    return url.replace("blog.naver.com", "m.blog.naver.com")


def to_desktop_url(url: str) -> str:
    """모바일 URL을 데스크톱 URL로 변환"""
    return url.replace("m.blog.naver.com", "blog.naver.com")


def get_rss_url(blog_id: str) -> str:
    """블로거 ID로 RSS URL 생성"""
    return f"https://rss.blog.naver.com/{blog_id}.xml"


def chunk_list(lst: List[Any], chunk_size: int) -> List[List[Any]]:
    """리스트를 청크로 분할"""
    return [lst[i:i + chunk_size] for i in range(0, len(lst), chunk_size)]


def safe_get(d: Dict, *keys, default=None):
    """중첩 딕셔너리에서 안전하게 값 추출"""
    for key in keys:
        if isinstance(d, dict):
            d = d.get(key, default)
        else:
            return default
    return d
