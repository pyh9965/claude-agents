from pathlib import Path
from typing import List, Optional
from dataclasses import dataclass
from bs4 import BeautifulSoup
import re


@dataclass
class InsertedImage:
    """삽입된 이미지 정보"""
    html: str
    position: int
    image_id: str


class HtmlInserter:
    """HTML에 이미지 태그 삽입

    반응형 이미지 태그를 생성하고 HTML 콘텐츠에 삽입합니다.
    SEO 최적화, lazy loading, srcset 등을 지원합니다.
    """

    # 이미지 태그 템플릿
    IMAGE_TEMPLATE = '''<figure class="blog-image" style="margin: 24px 0; text-align: center;">
    <img src="{src}"
         alt="{alt}"
         style="max-width: 100%; height: auto; border-radius: 8px;"
         {loading}
         {srcset}
         {dimensions}>
    {caption}
</figure>'''

    CAPTION_TEMPLATE = '<figcaption style="font-size: 13px; color: #666; margin-top: 8px;">{caption}</figcaption>'

    def __init__(
        self,
        image_base_url: str = "",
        use_srcset: bool = True,
        lazy_loading: bool = True
    ):
        """
        Args:
            image_base_url: 이미지 기본 URL (CDN 등)
            use_srcset: srcset 사용 여부 (반응형 이미지)
            lazy_loading: lazy loading 사용 여부
        """
        self.image_base_url = image_base_url
        self.use_srcset = use_srcset
        self.lazy_loading = lazy_loading

    def generate_image_html(
        self,
        src: str,
        alt: str,
        caption: Optional[str] = None,
        width: Optional[int] = None,
        height: Optional[int] = None
    ) -> str:
        """이미지 HTML 생성

        SEO 친화적이고 반응형인 이미지 HTML을 생성합니다.
        srcset, lazy loading, 캡션 등을 지원합니다.

        Args:
            src: 이미지 경로/URL
            alt: alt 텍스트 (SEO 중요)
            caption: 캡션 (선택)
            width: 너비 (픽셀)
            height: 높이 (픽셀)

        Returns:
            HTML 문자열
        """
        # srcset 생성 (반응형 이미지)
        srcset = ""
        if self.use_srcset and width:
            sizes = [
                (width, "1x"),
                (int(width * 1.5), "1.5x"),
                (int(width * 2), "2x")
            ]
            srcset_parts = []
            for w, density in sizes:
                # 실제로는 다양한 크기의 이미지가 필요하지만
                # 여기서는 같은 이미지 URL 사용
                # 실제 구현시 서버에서 리사이징하거나 별도 파일 사용
                srcset_parts.append(f"{src} {density}")
            srcset = f'srcset="{", ".join(srcset_parts)}"'

        # lazy loading 속성
        loading = 'loading="lazy"' if self.lazy_loading else ''

        # 치수 속성 (CLS 방지)
        dimensions = ""
        if width and height:
            dimensions = f'width="{width}" height="{height}"'
        elif width:
            dimensions = f'width="{width}"'

        # 캡션 HTML
        caption_html = ""
        if caption:
            caption_html = "\n    " + self.CAPTION_TEMPLATE.format(caption=self._escape_html(caption))

        # 전체 HTML 조합
        html = self.IMAGE_TEMPLATE.format(
            src=self._escape_html(src),
            alt=self._escape_html(alt),
            srcset=srcset,
            loading=loading,
            dimensions=dimensions,
            caption=caption_html
        )

        return html.strip()

    def insert_images(
        self,
        html_content: str,
        placements: List[dict],
        image_dir: str = "images"
    ) -> str:
        """HTML에 이미지 삽입

        위치 정보를 기반으로 HTML 콘텐츠에 이미지를 삽입합니다.
        역순으로 삽입하여 위치가 밀리는 것을 방지합니다.

        Args:
            html_content: 원본 HTML
            placements: ImagePlacement 목록 (dict)
            image_dir: 이미지 디렉토리 경로

        Returns:
            이미지가 삽입된 HTML
        """
        # 위치 역순으로 정렬 (뒤에서부터 삽입해야 위치가 안 밀림)
        sorted_placements = sorted(
            placements,
            key=lambda p: p.get('position', {}).get('position', 0),
            reverse=True
        )

        result = html_content

        for placement in sorted_placements:
            position_info = placement.get('position', {})
            position = position_info.get('position', 0)

            image_id = placement.get('image_id', '')
            alt_text = placement.get('alt_text', '')
            caption = placement.get('caption', '')

            # 이미지 경로 구성
            if self.image_base_url:
                src = f"{self.image_base_url}/{image_id}"
            else:
                src = f"{image_dir}/{image_id}"

            # HTML 생성
            image_html = self.generate_image_html(
                src=src,
                alt=alt_text,
                caption=caption if caption else None
            )

            # 삽입 (줄바꿈 추가)
            result = result[:position] + "\n" + image_html + "\n" + result[position:]

        return result

    def insert_thumbnail(
        self,
        html_content: str,
        thumbnail_src: str,
        alt: str = "블로그 썸네일",
        width: int = 1200
    ) -> str:
        """썸네일을 콘텐츠 맨 앞에 삽입

        Args:
            html_content: 원본 HTML
            thumbnail_src: 썸네일 경로/URL
            alt: alt 텍스트
            width: 썸네일 너비

        Returns:
            썸네일이 삽입된 HTML
        """
        thumbnail_html = self.generate_image_html(
            src=thumbnail_src,
            alt=alt,
            width=width
        )

        return thumbnail_html + "\n\n" + html_content

    def create_image_gallery(
        self,
        images: List[dict],
        columns: int = 2
    ) -> str:
        """이미지 갤러리 HTML 생성

        여러 이미지를 그리드 레이아웃으로 배치한 갤러리를 생성합니다.

        Args:
            images: 이미지 정보 리스트 [{src, alt, caption}]
            columns: 컬럼 수 (기본 2)

        Returns:
            갤러리 HTML
        """
        gallery_html = f'''<div class="image-gallery" style="display: grid; grid-template-columns: repeat({columns}, 1fr); gap: 16px; margin: 24px 0;">
'''

        for img in images:
            src = self._escape_html(img['src'])
            alt = self._escape_html(img.get('alt', ''))
            caption = img.get('caption', '')

            item_html = f'''    <figure style="margin: 0;">
        <img src="{src}" alt="{alt}"
             style="width: 100%; height: auto; border-radius: 8px;"
             loading="lazy">
'''
            if caption:
                escaped_caption = self._escape_html(caption)
                item_html += f'        <figcaption style="font-size: 12px; color: #666; margin-top: 4px;">{escaped_caption}</figcaption>\n'

            item_html += '    </figure>\n'
            gallery_html += item_html

        gallery_html += '</div>'

        return gallery_html

    def create_comparison_slider(
        self,
        before_image: dict,
        after_image: dict
    ) -> str:
        """Before/After 비교 슬라이더 생성

        두 이미지를 비교할 수 있는 슬라이더를 생성합니다.

        Args:
            before_image: 이전 이미지 {src, alt}
            after_image: 이후 이미지 {src, alt}

        Returns:
            비교 슬라이더 HTML
        """
        before_src = self._escape_html(before_image['src'])
        before_alt = self._escape_html(before_image.get('alt', 'Before'))
        after_src = self._escape_html(after_image['src'])
        after_alt = self._escape_html(after_image.get('alt', 'After'))

        slider_html = f'''<div class="image-comparison" style="position: relative; margin: 24px 0;">
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
        <figure style="margin: 0;">
            <img src="{before_src}" alt="{before_alt}"
                 style="width: 100%; height: auto; border-radius: 8px;">
            <figcaption style="font-size: 13px; color: #666; margin-top: 8px; text-align: center;">Before</figcaption>
        </figure>
        <figure style="margin: 0;">
            <img src="{after_src}" alt="{after_alt}"
                 style="width: 100%; height: auto; border-radius: 8px;">
            <figcaption style="font-size: 13px; color: #666; margin-top: 8px; text-align: center;">After</figcaption>
        </figure>
    </div>
</div>'''

        return slider_html

    def wrap_with_link(
        self,
        image_html: str,
        link_url: str,
        title: Optional[str] = None
    ) -> str:
        """이미지를 링크로 감싸기

        Args:
            image_html: 이미지 HTML
            link_url: 링크 URL
            title: 링크 title 속성

        Returns:
            링크로 감싼 HTML
        """
        soup = BeautifulSoup(image_html, 'html.parser')
        figure = soup.find('figure')

        if figure:
            # figure 내부의 img 태그 찾기
            img = figure.find('img')
            if img:
                # a 태그 생성
                link = soup.new_tag('a', href=link_url)
                if title:
                    link['title'] = title
                link['style'] = "display: inline-block;"

                # img를 a로 감싸기
                img_copy = img.extract()
                link.append(img_copy)
                figure.insert(0, link)

        return str(soup)

    def optimize_for_naver_blog(self, html_content: str) -> str:
        """네이버 블로그 최적화

        네이버 블로그 에디터에 맞게 HTML을 최적화합니다.

        Args:
            html_content: 원본 HTML

        Returns:
            최적화된 HTML
        """
        soup = BeautifulSoup(html_content, 'html.parser')

        # 네이버 블로그는 일부 스타일 속성만 허용
        # 인라인 스타일 유지하되, 네이버가 지원하는 속성으로 제한
        allowed_styles = [
            'margin', 'padding', 'text-align', 'width', 'height',
            'max-width', 'border-radius', 'font-size', 'color'
        ]

        for tag in soup.find_all(style=True):
            style = tag['style']
            # 스타일 파싱 및 필터링
            style_dict = {}
            for item in style.split(';'):
                if ':' in item:
                    prop, value = item.split(':', 1)
                    prop = prop.strip()
                    if prop in allowed_styles:
                        style_dict[prop] = value.strip()

            # 필터링된 스타일 재구성
            if style_dict:
                tag['style'] = '; '.join(f"{k}: {v}" for k, v in style_dict.items())
            else:
                del tag['style']

        return str(soup)

    def _escape_html(self, text: str) -> str:
        """HTML 특수문자 이스케이프

        Args:
            text: 원본 텍스트

        Returns:
            이스케이프된 텍스트
        """
        if not text:
            return ""

        replacements = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        }

        for char, escape in replacements.items():
            text = text.replace(char, escape)

        return text

    def get_image_stats(self, html_content: str) -> dict:
        """HTML 내 이미지 통계 추출

        Args:
            html_content: HTML 콘텐츠

        Returns:
            이미지 통계 딕셔너리
        """
        soup = BeautifulSoup(html_content, 'html.parser')

        images = soup.find_all('img')
        stats = {
            'total_images': len(images),
            'with_alt': sum(1 for img in images if img.get('alt')),
            'with_caption': len(soup.find_all('figcaption')),
            'lazy_loading': sum(1 for img in images if img.get('loading') == 'lazy'),
            'with_srcset': sum(1 for img in images if img.get('srcset')),
            'average_alt_length': 0
        }

        # 평균 alt 텍스트 길이
        alt_texts = [img.get('alt', '') for img in images if img.get('alt')]
        if alt_texts:
            stats['average_alt_length'] = sum(len(alt) for alt in alt_texts) / len(alt_texts)

        return stats

    def validate_html(self, html_content: str) -> tuple[bool, List[str]]:
        """HTML 유효성 검증

        Args:
            html_content: HTML 콘텐츠

        Returns:
            (유효 여부, 오류/경고 메시지 리스트)
        """
        soup = BeautifulSoup(html_content, 'html.parser')
        warnings = []

        # 이미지 검증
        images = soup.find_all('img')

        for i, img in enumerate(images):
            # alt 텍스트 체크
            if not img.get('alt'):
                warnings.append(f"이미지 #{i+1}: alt 텍스트가 없습니다 (SEO 중요)")

            # src 체크
            if not img.get('src'):
                warnings.append(f"이미지 #{i+1}: src 속성이 없습니다")

            # alt 텍스트 길이 체크
            alt = img.get('alt', '')
            if len(alt) > 125:
                warnings.append(f"이미지 #{i+1}: alt 텍스트가 너무 깁니다 ({len(alt)}자, 권장: 125자 이하)")

        # figure 태그 검증
        figures = soup.find_all('figure')
        for i, figure in enumerate(figures):
            if not figure.find('img'):
                warnings.append(f"figure #{i+1}: img 태그가 없습니다")

        return len(warnings) == 0, warnings
