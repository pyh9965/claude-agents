"""Entity Extractor - HTML에서 엔티티 추출"""

from typing import List, Dict, Optional
from bs4 import BeautifulSoup
import re
import logging


logger = logging.getLogger(__name__)


class EntityExtractor:
    """HTML 콘텐츠에서 장소명, 음식명, 제품명 등 추출"""

    # 장소 패턴 (예: 서울 강남구, 제주도 등)
    LOCATION_PATTERNS = [
        r'([가-힣]+(?:시|도|군|구|읍|면|동|리))\s*([가-힣]+(?:시|도|군|구|읍|면|동|리))?',
        r'([가-힣]+)\s*[0-9]+번지',
    ]

    # 음식 관련 키워드
    FOOD_KEYWORDS = [
        '맛집', '요리', '메뉴', '음식', '레시피', '먹방',
        '카페', '레스토랑', '식당', '베이커리', '디저트'
    ]

    # 여행 관련 키워드
    TRAVEL_KEYWORDS = [
        '여행', '관광', '투어', '명소', '핫플', '가볼만한',
        '숙소', '호텔', '펜션', '게스트하우스'
    ]

    def __init__(self):
        """EntityExtractor 초기화"""
        self.logger = logging.getLogger(__name__)

    def extract_from_html(self, html: str) -> Dict[str, List[str]]:
        """
        HTML에서 엔티티 추출

        Args:
            html: HTML 콘텐츠

        Returns:
            엔티티 딕셔너리 {
                'locations': [...],
                'entities': [...],
                'content_type': 'food' | 'travel' | 'lifestyle' | 'product' | 'general'
            }
        """
        try:
            soup = BeautifulSoup(html, 'html.parser')
            text = soup.get_text()

            # 위치 정보 추출
            locations = self._extract_locations(text)

            # 엔티티 추출 (강조된 텍스트, 헤더 등)
            entities = self._extract_entities(soup)

            # 콘텐츠 타입 판별
            content_type = self._determine_content_type(text)

            result = {
                'locations': locations,
                'entities': entities,
                'content_type': content_type
            }

            self.logger.info(
                f"Extracted entities: {len(locations)} locations, "
                f"{len(entities)} entities, type={content_type}"
            )

            return result

        except Exception as e:
            self.logger.error(f"Failed to extract entities: {e}")
            return {
                'locations': [],
                'entities': [],
                'content_type': 'general'
            }

    def _extract_locations(self, text: str) -> List[str]:
        """텍스트에서 위치 정보 추출"""
        locations = []

        for pattern in self.LOCATION_PATTERNS:
            matches = re.finditer(pattern, text)
            for match in matches:
                location = ' '.join(filter(None, match.groups()))
                if location and location not in locations:
                    locations.append(location)

        self.logger.debug(f"Extracted locations: {locations}")
        return locations

    def _extract_entities(self, soup: BeautifulSoup) -> List[str]:
        """HTML에서 주요 엔티티 추출 (강조된 텍스트, 헤더 등)"""
        entities = []

        # 헤더 태그에서 추출
        for header in soup.find_all(['h1', 'h2', 'h3', 'h4']):
            text = header.get_text().strip()
            if text and len(text) > 2:  # 너무 짧은 텍스트 제외
                entities.append(text)

        # 강조 태그에서 추출 (strong, b, em, mark 등)
        for tag in soup.find_all(['strong', 'b', 'em', 'mark']):
            text = tag.get_text().strip()
            if text and len(text) > 2 and text not in entities:
                entities.append(text)

        # 링크 텍스트에서 추출 (주요 키워드일 가능성)
        for link in soup.find_all('a'):
            text = link.get_text().strip()
            if text and len(text) > 2 and text not in entities:
                # URL이나 너무 긴 텍스트 제외
                if not text.startswith('http') and len(text) < 50:
                    entities.append(text)

        # 중복 제거 및 정렬
        entities = list(dict.fromkeys(entities))  # 순서 유지하면서 중복 제거

        self.logger.debug(f"Extracted {len(entities)} entities")
        return entities[:20]  # 최대 20개까지만

    def _determine_content_type(self, text: str) -> str:
        """텍스트 내용으로 콘텐츠 타입 판별"""
        food_score = sum(1 for keyword in self.FOOD_KEYWORDS if keyword in text)
        travel_score = sum(1 for keyword in self.TRAVEL_KEYWORDS if keyword in text)

        # 제품/리뷰 키워드
        product_keywords = ['제품', '상품', '리뷰', '후기', '추천', '사용법', '구매']
        product_score = sum(1 for keyword in product_keywords if keyword in text)

        # 라이프스타일 키워드
        lifestyle_keywords = ['일상', '브이로그', '루틴', '취미', '경험', '이야기']
        lifestyle_score = sum(1 for keyword in lifestyle_keywords if keyword in text)

        # 점수가 가장 높은 타입 선택
        scores = {
            'food': food_score,
            'travel': travel_score,
            'product': product_score,
            'lifestyle': lifestyle_score
        }

        max_score = max(scores.values())
        if max_score >= 2:  # 최소 2개 이상의 키워드 매칭
            content_type = max(scores, key=scores.get)
        else:
            content_type = 'general'

        self.logger.debug(f"Content type scores: {scores} -> {content_type}")
        return content_type

    def extract_sections(self, html: str) -> List[Dict[str, str]]:
        """
        HTML을 섹션으로 분할

        Args:
            html: HTML 콘텐츠

        Returns:
            섹션 리스트 [{'id': ..., 'title': ..., 'content': ...}, ...]
        """
        try:
            soup = BeautifulSoup(html, 'html.parser')
            sections = []

            # 헤더 태그 기준으로 섹션 분할 (h2, h3)
            current_section = {
                'id': 'header',
                'title': '',
                'content': '',
                'position': 0
            }

            for element in soup.find_all(['h1', 'h2', 'h3', 'p', 'div', 'ul', 'ol']):
                if element.name in ['h2', 'h3']:
                    # 이전 섹션 저장
                    if current_section['content']:
                        sections.append(current_section)

                    # 새 섹션 시작
                    section_id = f"section_{len(sections) + 1}"
                    current_section = {
                        'id': section_id,
                        'title': element.get_text().strip(),
                        'content': '',
                        'position': len(str(soup)[:soup.prettify().find(str(element))])
                    }
                else:
                    # 현재 섹션에 콘텐츠 추가
                    text = element.get_text().strip()
                    if text:
                        current_section['content'] += text + '\n\n'

            # 마지막 섹션 저장
            if current_section['content']:
                sections.append(current_section)

            self.logger.info(f"Extracted {len(sections)} sections")
            return sections

        except Exception as e:
            self.logger.error(f"Failed to extract sections: {e}")
            return [{
                'id': 'section_1',
                'title': '',
                'content': html,
                'position': 0
            }]
