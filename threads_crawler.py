import requests
from bs4 import BeautifulSoup
import json
import time
from datetime import datetime, timedelta
import re
from typing import List, Dict
import random

class ThreadsCrawler:
    def __init__(self):
        self.base_url = "https://www.threads.net"
        self.headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
        }
        self.session = requests.Session()
        self.session.headers.update(self.headers)

    def search_keyword(self, keyword: str, max_posts: int = 50) -> List[Dict]:
        """키워드로 게시글 검색"""
        print(f"검색 중: {keyword}")
        posts = []

        # Threads 검색 URL 구성
        search_url = f"{self.base_url}/search?q={requests.utils.quote(keyword)}&serp=true"

        try:
            # 요청 전 딜레이
            time.sleep(random.uniform(2, 4))

            response = self.session.get(search_url, timeout=15)
            response.raise_for_status()

            # HTML 파싱
            soup = BeautifulSoup(response.text, 'html.parser')

            # 페이지 소스에서 JSON 데이터 추출 시도
            scripts = soup.find_all('script', type='application/json')

            for script in scripts:
                try:
                    data = json.loads(script.string)
                    # JSON 구조에서 게시글 데이터 추출
                    posts_data = self._extract_posts_from_json(data, keyword)
                    posts.extend(posts_data)
                except (json.JSONDecodeError, KeyError, TypeError):
                    continue

            # HTML에서 직접 추출 시도
            if not posts:
                posts = self._extract_posts_from_html(soup, keyword)

        except requests.exceptions.RequestException as e:
            print(f"검색 실패 ({keyword}): {e}")

        return posts[:max_posts]

    def _extract_posts_from_json(self, data: dict, keyword: str) -> List[Dict]:
        """JSON 데이터에서 게시글 추출"""
        posts = []

        def recursive_search(obj, depth=0):
            if depth > 20:  # 재귀 깊이 제한
                return

            if isinstance(obj, dict):
                # 게시글 데이터로 보이는 구조 찾기
                if 'text' in obj or 'caption' in obj:
                    post = self._parse_post_data(obj, keyword)
                    if post:
                        posts.append(post)

                for value in obj.values():
                    recursive_search(value, depth + 1)

            elif isinstance(obj, list):
                for item in obj:
                    recursive_search(item, depth + 1)

        recursive_search(data)
        return posts

    def _parse_post_data(self, data: dict, keyword: str) -> Dict:
        """게시글 데이터 파싱"""
        try:
            post = {}

            # 텍스트 내용
            text = data.get('text') or data.get('caption') or data.get('content', '')
            if not text or keyword.lower() not in text.lower():
                return None

            post['content'] = text

            # 작성자 정보
            user_data = data.get('user') or data.get('owner') or {}
            post['author'] = user_data.get('username', 'Unknown')
            post['author_name'] = user_data.get('full_name', post['author'])

            # 시간 정보
            timestamp = data.get('taken_at') or data.get('timestamp') or data.get('created_time', 0)
            if timestamp:
                if isinstance(timestamp, (int, float)):
                    post['timestamp'] = datetime.fromtimestamp(timestamp).isoformat()
                else:
                    post['timestamp'] = str(timestamp)
            else:
                post['timestamp'] = datetime.now().isoformat()

            # 참여 지표
            post['likes'] = data.get('like_count', 0)
            post['comments'] = data.get('comment_count', 0)
            post['reposts'] = data.get('repost_count', 0)

            # 해시태그 추출
            hashtags = re.findall(r'#\w+', text)
            post['hashtags'] = list(set(hashtags))

            # URL
            post_id = data.get('id') or data.get('pk', '')
            if post_id:
                post['url'] = f"{self.base_url}/post/{post_id}"
            else:
                post['url'] = ''

            post['keyword'] = keyword

            return post

        except Exception as e:
            print(f"게시글 파싱 오류: {e}")
            return None

    def _extract_posts_from_html(self, soup: BeautifulSoup, keyword: str) -> List[Dict]:
        """HTML에서 직접 게시글 추출"""
        posts = []

        # 일반적인 게시글 컨테이너 찾기
        article_elements = soup.find_all(['article', 'div'], class_=re.compile(r'post|thread|item', re.I))

        for element in article_elements[:20]:  # 최대 20개
            try:
                text_elem = element.find(['p', 'div', 'span'], string=re.compile(keyword, re.I))
                if not text_elem:
                    continue

                text = text_elem.get_text(strip=True)

                # 작성자
                author_elem = element.find(['a', 'span'], class_=re.compile(r'username|author|user', re.I))
                author = author_elem.get_text(strip=True) if author_elem else 'Unknown'

                # 시간
                time_elem = element.find(['time', 'span'], class_=re.compile(r'time|date', re.I))
                timestamp = time_elem.get('datetime', datetime.now().isoformat()) if time_elem else datetime.now().isoformat()

                post = {
                    'content': text,
                    'author': author,
                    'author_name': author,
                    'timestamp': timestamp,
                    'likes': 0,
                    'comments': 0,
                    'reposts': 0,
                    'hashtags': re.findall(r'#\w+', text),
                    'url': '',
                    'keyword': keyword
                }

                posts.append(post)

            except Exception as e:
                continue

        return posts

    def crawl_ai_topics(self) -> List[Dict]:
        """AI 관련 키워드로 크롤링"""
        keywords = [
            'AI', '인공지능', 'ChatGPT', 'Claude', 'GPT', 'LLM',
            '머신러닝', '딥러닝', 'Machine Learning', 'Deep Learning',
            'OpenAI', 'Anthropic', 'AI Agent', 'Gemini', 'Copilot',
            '생성형AI', 'Generative AI', 'AI 기술', 'AI technology'
        ]

        all_posts = []
        cutoff_time = datetime.now() - timedelta(hours=24)

        for keyword in keywords:
            posts = self.search_keyword(keyword, max_posts=10)

            # 24시간 이내 게시글 필터링
            filtered_posts = []
            for post in posts:
                try:
                    post_time = datetime.fromisoformat(post['timestamp'].replace('Z', '+00:00'))
                    if post_time >= cutoff_time:
                        filtered_posts.append(post)
                except:
                    # 시간 파싱 실패 시 포함
                    filtered_posts.append(post)

            all_posts.extend(filtered_posts)

            # 요청 간 딜레이
            time.sleep(random.uniform(2, 4))

        # 중복 제거 (내용 기반)
        unique_posts = []
        seen_contents = set()

        for post in all_posts:
            content_hash = hash(post['content'][:100])  # 처음 100자로 중복 체크
            if content_hash not in seen_contents:
                seen_contents.add(content_hash)
                unique_posts.append(post)

        # 시간순 정렬 (최신순)
        unique_posts.sort(key=lambda x: x['timestamp'], reverse=True)

        return unique_posts

def main():
    print("=" * 70)
    print("Threads AI 관련 게시글 크롤러")
    print("=" * 70)
    print()

    crawler = ThreadsCrawler()

    print("크롤링 시작...")
    print("키워드: AI, 인공지능, ChatGPT, Claude, GPT, LLM, 머신러닝, 딥러닝 등")
    print("대상 기간: 최근 24시간")
    print()

    posts = crawler.crawl_ai_topics()

    print(f"\n수집 완료: 총 {len(posts)}개 게시글")
    print("=" * 70)
    print()

    # 결과 저장
    output_file = "D:\\AI프로그램제작\\agent\\threads_ai_posts.json"
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(posts, f, ensure_ascii=False, indent=2)

    print(f"결과 저장: {output_file}")

    # 결과 출력
    print("\n" + "=" * 70)
    print(f"크롤링 결과: AI 관련 게시글")
    print("=" * 70)
    print(f"수집 기간: 최근 24시간")
    print(f"총 게시글 수: {len(posts)}개")
    print()

    for idx, post in enumerate(posts, 1):
        print(f"{'=' * 70}")
        print(f"게시글 {idx}")
        print(f"{'=' * 70}")
        print(f"작성자: @{post['author']} ({post['author_name']})")
        print(f"작성일: {post['timestamp']}")
        print(f"키워드: {post['keyword']}")
        print(f"내용:\n{post['content'][:500]}{'...' if len(post['content']) > 500 else ''}")
        if post['hashtags']:
            print(f"해시태그: {' '.join(post['hashtags'])}")
        print(f"반응: 좋아요 {post['likes']}, 댓글 {post['comments']}, 리포스트 {post['reposts']}")
        if post['url']:
            print(f"링크: {post['url']}")
        print()

    return posts

if __name__ == "__main__":
    main()
