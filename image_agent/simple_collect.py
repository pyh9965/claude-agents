"""간단한 이미지 수집 스크립트 (httpx 사용)"""
import os
import asyncio
import httpx
from pathlib import Path
from urllib.parse import urljoin, urlparse
import re

os.environ["GOOGLE_API_KEY"] = "AIzaSyDMKBbyKN5-Kg-eC3-rlBkYReQ76khP5_o"

async def collect_images(url: str, output_dir: str = "output"):
    """웹페이지에서 이미지 URL 수집 및 다운로드"""

    output_path = Path(output_dir)
    output_path.mkdir(parents=True, exist_ok=True)
    (output_path / "images").mkdir(exist_ok=True)

    print("=" * 60)
    print(f"이미지 수집: {url}")
    print("=" * 60)

    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
    }

    async with httpx.AsyncClient(timeout=30.0, follow_redirects=True) as client:
        # 페이지 가져오기
        print("\n1. 페이지 로딩 중...")
        response = await client.get(url, headers=headers)
        html = response.text
        print(f"   페이지 크기: {len(html)} bytes")

        # 이미지 URL 추출 (img src, background-image 등)
        print("\n2. 이미지 URL 추출 중...")
        img_patterns = [
            r'<img[^>]+src=["\']([^"\']+)["\']',
            r'background-image:\s*url\(["\']?([^"\')\s]+)["\']?\)',
            r'<source[^>]+srcset=["\']([^"\']+)["\']',
        ]

        found_urls = set()
        for pattern in img_patterns:
            matches = re.findall(pattern, html, re.IGNORECASE)
            for match in matches:
                # srcset에서 첫 번째 URL만 추출
                img_url = match.split(',')[0].split(' ')[0].strip()
                if img_url:
                    found_urls.add(img_url)

        # URL 정규화
        image_urls = []
        for img_url in found_urls:
            if img_url.startswith('data:'):
                continue
            full_url = urljoin(url, img_url)
            # 이미지 확장자 필터링
            if any(ext in full_url.lower() for ext in ['.jpg', '.jpeg', '.png', '.webp', '.gif']):
                image_urls.append(full_url)

        print(f"   발견된 이미지: {len(image_urls)}개")

        # 이미지 다운로드
        print("\n3. 이미지 다운로드 중...")
        downloaded = 0
        for i, img_url in enumerate(image_urls[:30]):  # 최대 30개
            try:
                img_response = await client.get(img_url, headers=headers)
                if img_response.status_code == 200:
                    # 파일명 생성
                    parsed = urlparse(img_url)
                    filename = Path(parsed.path).name
                    if not filename or len(filename) > 100:
                        filename = f"image_{i:03d}.jpg"

                    # 저장
                    filepath = output_path / "images" / filename
                    with open(filepath, "wb") as f:
                        f.write(img_response.content)

                    downloaded += 1
                    print(f"   [{downloaded}] {filename}")
            except Exception as e:
                print(f"   [ERROR] {img_url[:50]}... - {e}")

        print(f"\n다운로드 완료: {downloaded}개 이미지")
        print(f"저장 위치: {output_path / 'images'}")
        print("=" * 60)

        return downloaded

if __name__ == "__main__":
    asyncio.run(collect_images("https://yh.skdefine.com/"))
