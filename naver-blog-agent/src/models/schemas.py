from pydantic import BaseModel, Field, HttpUrl
from typing import List, Optional, Dict, Any
from datetime import date, datetime
from enum import Enum

# Enums
class TaskStatus(str, Enum):
    PENDING = "pending"
    SEARCHING = "searching"
    CRAWLING = "crawling"
    ANALYZING = "analyzing"
    COMPLETED = "completed"
    FAILED = "failed"

class SentimentLabel(str, Enum):
    VERY_POSITIVE = "매우 긍정"
    POSITIVE = "긍정"
    NEUTRAL = "중립"
    NEGATIVE = "부정"
    VERY_NEGATIVE = "매우 부정"

class ContentType(str, Enum):
    INFO = "정보 제공"
    REVIEW = "후기"
    AD = "광고"
    NEWS = "뉴스"
    OTHER = "기타"

# 검색 관련
class SearchInput(BaseModel):
    keyword: str
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    max_results: int = Field(default=100, ge=1, le=1000)
    sort: str = Field(default="sim", pattern="^(sim|date)$")

class BlogPostMeta(BaseModel):
    """블로그 게시글 메타데이터 (검색 결과)"""
    title: str
    link: str
    description: str
    bloggername: str
    bloggerlink: str
    postdate: str  # YYYYMMDD

# 수집 관련
class CrawlerInput(BaseModel):
    urls: List[str]
    concurrency: int = Field(default=50, ge=1, le=100)

class BlogContent(BaseModel):
    """수집된 블로그 콘텐츠"""
    url: str
    title: Optional[str] = None
    author: Optional[str] = None
    content: Optional[str] = None
    post_date: Optional[date] = None
    images: List[str] = []
    crawled_at: datetime = Field(default_factory=datetime.now)
    method: str = "httpx"  # httpx, curl_cffi, playwright

# 분석 관련
class AnalysisInput(BaseModel):
    content: BlogContent

class AnalysisResult(BaseModel):
    """분석 결과"""
    url: str
    sentiment_score: float = Field(ge=-1.0, le=1.0)
    sentiment_label: SentimentLabel
    keywords: List[Dict[str, Any]] = []  # [{"keyword": "xxx", "count": 5}]
    summary: str
    content_type: ContentType
    is_ad: bool = False
    quality_score: int = Field(ge=1, le=10)
    analyzed_at: datetime = Field(default_factory=datetime.now)

# 작업 관련
class TaskCreate(BaseModel):
    keyword: str
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    max_results: int = Field(default=100, ge=1, le=1000)
    crawl_content: bool = True
    analyze_content: bool = True

class TaskResponse(BaseModel):
    id: str
    status: TaskStatus
    keyword: str
    total_found: int = 0
    total_crawled: int = 0
    total_analyzed: int = 0
    created_at: datetime
    completed_at: Optional[datetime] = None

class TaskProgress(BaseModel):
    status: TaskStatus
    progress: float = Field(ge=0.0, le=100.0)
    current_step: str
    message: str
