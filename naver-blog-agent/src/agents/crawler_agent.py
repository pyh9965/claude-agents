import httpx
import asyncio
from typing import List, Tuple, Optional, Dict, Any
from datetime import datetime
from bs4 import BeautifulSoup
from loguru import logger

from .base import BaseAgent, AgentResult
from ..models import CrawlerInput, BlogContent
from ..core.config import get_settings


class HybridCrawlerAgent(BaseAgent):
    """하이브리드 블로그 콘텐츠 수집 에이전트 (3단계 폴백)"""

    def __init__(self, config: Dict[str, Any] = None):
        super().__init__(config)
        settings = get_settings()
        self.concurrency = config.get("concurrency", settings.crawler_concurrency) if config else settings.crawler_concurrency
        self.timeout = config.get("timeout", settings.crawler_timeout) if config else settings.crawler_timeout

        # 모바일 User-Agent
        self.headers = {
            "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
        }

    def _to_mobile_url(self, url: str) -> str:
        """데스크톱 URL → 모바일 URL 변환"""
        return url.replace("blog.naver.com", "m.blog.naver.com")

    async def validate_input(self, input_data: CrawlerInput) -> bool:
        """입력 검증"""
        if not input_data.urls:
            raise ValueError("수집할 URL 목록이 비어있습니다.")
        return True

    async def execute(self, input_data: CrawlerInput) -> AgentResult[List[BlogContent]]:
        """하이브리드 수집 실행"""
        results: List[BlogContent] = []
        stats = {
            "httpx_success": 0,
            "curl_success": 0,
            "playwright_success": 0,
            "failed": 0
        }

        # 1단계: HTTPX로 빠른 수집 (90% 이상 성공 예상)
        logger.info(f"1단계: HTTPX로 {len(input_data.urls)}개 URL 수집 시작")
        httpx_results, httpx_failed = await self._batch_fetch_httpx(input_data.urls)
        results.extend(httpx_results)
        stats["httpx_success"] = len(httpx_results)
        logger.info(f"HTTPX 성공: {len(httpx_results)}, 실패: {len(httpx_failed)}")

        # 2단계: 실패한 URL은 curl_cffi로 재시도
        if httpx_failed:
            logger.info(f"2단계: curl_cffi로 {len(httpx_failed)}개 URL 재시도")
            curl_results, curl_failed = await self._batch_fetch_curl(httpx_failed)
            results.extend(curl_results)
            stats["curl_success"] = len(curl_results)
            logger.info(f"curl_cffi 성공: {len(curl_results)}, 실패: {len(curl_failed)}")
        else:
            curl_failed = []

        # 3단계: 여전히 실패한 URL은 Playwright로 최종 시도
        if curl_failed:
            logger.info(f"3단계: Playwright로 {len(curl_failed)}개 URL 최종 시도")
            pw_results = await self._batch_fetch_playwright(curl_failed)
            results.extend(pw_results)
            stats["playwright_success"] = len(pw_results)
            stats["failed"] = len(curl_failed) - len(pw_results)
            logger.info(f"Playwright 성공: {len(pw_results)}")

        success_rate = len(results) / len(input_data.urls) * 100 if input_data.urls else 0
        logger.info(f"수집 완료: {len(results)}/{len(input_data.urls)} ({success_rate:.1f}%)")

        return AgentResult(
            success=True,
            data=results,
            metadata={
                "total_urls": len(input_data.urls),
                "total_success": len(results),
                **stats,
                "success_rate": success_rate
            }
        )

    async def _batch_fetch_httpx(self, urls: List[str]) -> Tuple[List[BlogContent], List[str]]:
        """HTTPX로 고속 병렬 수집 (1순위)"""
        successful: List[BlogContent] = []
        failed: List[str] = []
        semaphore = asyncio.Semaphore(self.concurrency)

        async def fetch_one(url: str) -> Tuple[Optional[BlogContent], str]:
            async with semaphore:
                try:
                    mobile_url = self._to_mobile_url(url)
                    async with httpx.AsyncClient(timeout=self.timeout, follow_redirects=True) as client:
                        response = await client.get(mobile_url, headers=self.headers)

                        if response.status_code == 200:
                            content = self._parse_content(response.text, url)
                            if content and content.content and len(content.content) > 100:
                                content.method = "httpx"
                                return content, url
                    return None, url
                except Exception as e:
                    logger.debug(f"HTTPX 실패 ({url}): {str(e)}")
                    return None, url

        tasks = [fetch_one(url) for url in urls]
        results = await asyncio.gather(*tasks)

        for content, url in results:
            if content:
                successful.append(content)
            else:
                failed.append(url)

        return successful, failed

    async def _batch_fetch_curl(self, urls: List[str]) -> Tuple[List[BlogContent], List[str]]:
        """curl_cffi로 봇 탐지 우회 수집 (2순위)"""
        successful: List[BlogContent] = []
        failed: List[str] = []

        try:
            from curl_cffi import requests as curl_requests
        except ImportError:
            logger.warning("curl_cffi 패키지가 설치되지 않음, 건너뜀")
            return [], urls

        for url in urls:
            try:
                mobile_url = self._to_mobile_url(url)
                response = curl_requests.get(
                    mobile_url,
                    impersonate="chrome120",
                    timeout=self.timeout,
                    headers=self.headers
                )

                if response.status_code == 200:
                    content = self._parse_content(response.text, url)
                    if content and content.content:
                        content.method = "curl_cffi"
                        successful.append(content)
                        continue

                failed.append(url)

            except Exception as e:
                logger.debug(f"curl_cffi 실패 ({url}): {str(e)}")
                failed.append(url)

            await asyncio.sleep(0.3)  # Rate limiting

        return successful, failed

    async def _batch_fetch_playwright(self, urls: List[str]) -> List[BlogContent]:
        """Playwright로 JS 렌더링 수집 (3순위 - 최후 수단)"""
        results: List[BlogContent] = []

        try:
            from playwright.async_api import async_playwright
        except ImportError:
            logger.warning("playwright 패키지가 설치되지 않음, 건너뜀")
            return []

        try:
            async with async_playwright() as p:
                browser = await p.chromium.launch(headless=True)
                context = await browser.new_context(
                    user_agent=self.headers["User-Agent"]
                )

                for url in urls:
                    try:
                        page = await context.new_page()
                        await page.goto(url, wait_until="networkidle", timeout=30000)

                        html = await page.content()
                        content = self._parse_content(html, url)

                        if content and content.content:
                            content.method = "playwright"
                            results.append(content)

                        await page.close()

                    except Exception as e:
                        logger.debug(f"Playwright 실패 ({url}): {str(e)}")

                await browser.close()

        except Exception as e:
            logger.error(f"Playwright 브라우저 오류: {str(e)}")

        return results

    def _parse_content(self, html: str, url: str) -> Optional[BlogContent]:
        """HTML에서 블로그 콘텐츠 추출"""
        try:
            soup = BeautifulSoup(html, "lxml")

            # 제목 추출
            title = None
            og_title = soup.find("meta", property="og:title")
            if og_title:
                title = og_title.get("content", "")
            elif soup.title:
                title = soup.title.string

            # 본문 추출 (네이버 블로그 구조)
            content_text = ""

            # 스마트에디터 3.0 구조
            content_div = soup.find("div", class_="se-main-container")
            if content_div:
                content_text = content_div.get_text(separator="\n", strip=True)

            # 구버전 에디터 구조
            if not content_text:
                content_div = soup.find("div", id="postViewArea")
                if content_div:
                    content_text = content_div.get_text(separator="\n", strip=True)

            # 모바일 뷰 구조
            if not content_text:
                content_div = soup.find("div", class_="post_ct")
                if content_div:
                    content_text = content_div.get_text(separator="\n", strip=True)

            # 이미지 URL 추출 (네이버 블로그 이미지 도메인 전체 지원)
            images = []
            naver_image_domains = [
                "blogfiles.pstatic.net",
                "postfiles.pstatic.net",
                "mblogthumb-phinf.pstatic.net",
                "storep-phinf.pstatic.net",
                "dthumb.phinf.naver.net",
                "blogfiles",  # 레거시 호환
                "postfiles",
                "phinf.naver.net"
            ]

            # 스마트에디터 3.0 이미지 컨테이너 우선 처리
            se_images = soup.find_all("img", class_=lambda x: x and "se-image" in str(x))
            for img in se_images:
                # 여러 lazy loading 속성 순서대로 확인
                src = (
                    img.get("data-lazy-src") or
                    img.get("data-original") or
                    img.get("data-src") or
                    img.get("src")
                )
                if src:
                    # 프로토콜 없는 URL 처리
                    if src.startswith("//"):
                        src = "https:" + src
                    if any(domain in src for domain in naver_image_domains):
                        if src not in images:
                            images.append(src)

            # 일반 이미지 태그 처리
            for img in soup.find_all("img"):
                # 여러 lazy loading 속성 순서대로 확인
                src = (
                    img.get("data-lazy-src") or
                    img.get("data-original") or
                    img.get("data-src") or
                    img.get("src")
                )
                if src:
                    # 프로토콜 없는 URL 처리
                    if src.startswith("//"):
                        src = "https:" + src
                    # 네이버 이미지 도메인 확인
                    if any(domain in src for domain in naver_image_domains):
                        if src not in images:
                            images.append(src)

            # 작성자 추출
            author = None
            author_tag = soup.find("span", class_="nick")
            if author_tag:
                author = author_tag.get_text(strip=True)

            if content_text:
                return BlogContent(
                    url=url,
                    title=title,
                    author=author,
                    content=content_text,
                    images=images[:10],  # 최대 10개
                    crawled_at=datetime.now()
                )

            return None

        except Exception as e:
            logger.debug(f"파싱 오류 ({url}): {str(e)}")
            return None

    async def crawl(self, urls: List[str], concurrency: int = None) -> AgentResult[List[BlogContent]]:
        """편의 메서드: 직접 수집 실행"""
        input_data = CrawlerInput(
            urls=urls,
            concurrency=concurrency or self.concurrency
        )
        return await self.run(input_data)
