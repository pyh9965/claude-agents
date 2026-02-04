from dataclasses import dataclass
from typing import List, Optional, Tuple
from bs4 import BeautifulSoup
import re


@dataclass
class PlacementPosition:
    """이미지 삽입 위치 정보"""
    section_id: str
    section_title: str
    position: int  # HTML 문자 위치
    after_element: str  # 요소 태그 (h2, h3, p 등)
    context: str  # 주변 텍스트 (50자)


@dataclass
class ImagePlacement:
    """이미지 배치 정보"""
    image_id: str
    requirement_id: str
    position: PlacementPosition
    alt_text: str
    caption: str


class AutoPlacer:
    """AI 기반 자동 이미지 배치

    콘텐츠를 분석하여 섹션별로 적절한 위치에 이미지를 배치합니다.
    이미지 간 최소 간격을 유지하며, SEO 친화적인 alt text를 생성합니다.
    """

    MIN_GAP = 300  # 이미지 간 최소 간격 (문자 수)

    def __init__(self, min_gap: int = 300):
        """
        Args:
            min_gap: 이미지 간 최소 간격 (문자 수)
        """
        self.min_gap = min_gap

    def analyze_content(self, html_content: str) -> List[PlacementPosition]:
        """콘텐츠 분석하여 이미지 삽입 가능 위치 찾기

        HTML 콘텐츠를 파싱하여 섹션 헤더(h2, h3)를 찾고,
        각 섹션의 시작 부분을 이미지 삽입 위치로 제안합니다.

        Args:
            html_content: HTML 콘텐츠

        Returns:
            PlacementPosition 리스트 (섹션별 삽입 가능 위치)
        """
        soup = BeautifulSoup(html_content, 'html.parser')
        positions = []

        # 섹션 헤더(h2, h3) 찾기
        section_id = 0
        current_pos = 0

        for element in soup.find_all(['h2', 'h3']):
            section_id += 1
            title = element.get_text(strip=True)

            # HTML에서의 위치 찾기
            element_str = str(element)
            pos = html_content.find(element_str, current_pos)

            if pos != -1:
                # 헤더 다음 위치
                insert_pos = pos + len(element_str)

                # 다음 요소의 컨텍스트 추출
                next_sibling = element.find_next_sibling()
                context = ""
                if next_sibling:
                    context = next_sibling.get_text(strip=True)[:50]

                positions.append(PlacementPosition(
                    section_id=f"section_{section_id}",
                    section_title=title,
                    position=insert_pos,
                    after_element=element.name,
                    context=context
                ))

                current_pos = insert_pos

        return positions

    def calculate_placements(
        self,
        html_content: str,
        requirements: List[dict],
        collected_images: List[dict]
    ) -> List[ImagePlacement]:
        """이미지 배치 계산

        요구사항과 수집된 이미지를 분석하여 각 이미지가 삽입될
        최적의 위치를 계산합니다. 우선순위, 섹션 매칭, 키워드 매칭을
        고려하여 배치를 결정합니다.

        Args:
            html_content: HTML 콘텐츠
            requirements: ImageRequirement 목록 (dict)
            collected_images: CollectedImage 목록 (dict)

        Returns:
            ImagePlacement 리스트 (이미지별 배치 정보)
        """
        positions = self.analyze_content(html_content)
        placements = []

        # 이미지와 위치 매칭
        used_positions = set()

        # 우선순위로 정렬 (높은 우선순위부터)
        sorted_reqs = sorted(
            requirements,
            key=lambda r: r.get('priority', 0),
            reverse=True
        )

        for req in sorted_reqs:
            req_id = req.get('id')
            section_id = req.get('section_id')

            # 해당 요구사항에 맞는 이미지 찾기
            matching_image = next(
                (img for img in collected_images
                 if img.get('requirement_id') == req_id),
                None
            )

            if not matching_image:
                continue

            # 섹션에 맞는 위치 찾기
            best_position = None

            for pos in positions:
                if pos.position in used_positions:
                    continue

                # 섹션 ID 매칭 (정확한 매칭 우선)
                if section_id and pos.section_id == section_id:
                    best_position = pos
                    break

                # 제목에 키워드 포함 여부 확인
                keywords = req.get('keywords', [])
                if any(kw in pos.section_title for kw in keywords):
                    best_position = pos
                    break

            # 매칭 안 되면 사용 가능한 첫 위치 사용
            if not best_position:
                for pos in positions:
                    if pos.position not in used_positions:
                        best_position = pos
                        break

            if best_position:
                # 최소 간격 체크
                if self._check_min_gap(best_position.position, used_positions):
                    used_positions.add(best_position.position)

                    # alt text와 caption 생성
                    alt_text = self._generate_alt_text(req, matching_image)
                    caption = self._generate_caption(req, matching_image)

                    placements.append(ImagePlacement(
                        image_id=matching_image.get('id', ''),
                        requirement_id=req_id,
                        position=best_position,
                        alt_text=alt_text,
                        caption=caption
                    ))

        return placements

    def _check_min_gap(self, new_pos: int, used_positions: set) -> bool:
        """이미지 간 최소 간격 체크

        Args:
            new_pos: 새로운 위치
            used_positions: 이미 사용된 위치들

        Returns:
            최소 간격을 만족하면 True
        """
        if not used_positions:
            return True

        for used_pos in used_positions:
            if abs(new_pos - used_pos) < self.min_gap:
                return False

        return True

    def _generate_alt_text(self, requirement: dict, image: dict) -> str:
        """SEO 친화적 alt text 생성

        엔티티 이름, 키워드를 활용하여 검색 엔진 최적화된
        alt text를 생성합니다.

        Args:
            requirement: 이미지 요구사항
            image: 수집된 이미지 정보

        Returns:
            SEO 친화적 alt text
        """
        keywords = requirement.get('keywords', [])
        entity = requirement.get('entity_name', '')
        description = requirement.get('description', '')

        # 우선순위: 엔티티 이름 > 주요 키워드 > 설명
        if entity:
            return f"{entity} 이미지"
        elif keywords:
            # 첫 번째 키워드 사용
            return f"{keywords[0]} 관련 이미지"
        elif description:
            # 설명 첫 30자 사용
            desc_short = description[:30].strip()
            return f"{desc_short}..."
        else:
            return "블로그 이미지"

    def _generate_caption(self, requirement: dict, image: dict) -> str:
        """이미지 캡션 생성

        엔티티 이름과 출처 정보를 조합하여 캡션을 생성합니다.

        Args:
            requirement: 이미지 요구사항
            image: 수집된 이미지 정보

        Returns:
            이미지 캡션
        """
        attribution = image.get('attribution', '')
        entity = requirement.get('entity_name', '')
        source = image.get('source', '')

        caption_parts = []

        # 엔티티 이름 추가
        if entity:
            caption_parts.append(entity)

        # 출처 정보 추가
        if attribution:
            caption_parts.append(f"(출처: {attribution})")
        elif source and source not in ['unknown', 'local']:
            caption_parts.append(f"(출처: {source})")

        return " ".join(caption_parts) if caption_parts else ""

    def get_placement_statistics(self, placements: List[ImagePlacement]) -> dict:
        """배치 통계 정보 생성

        Args:
            placements: 이미지 배치 목록

        Returns:
            통계 정보 딕셔너리
        """
        stats = {
            'total_placements': len(placements),
            'sections_used': len(set(p.position.section_id for p in placements)),
            'by_section': {},
            'by_element': {}
        }

        for placement in placements:
            # 섹션별 집계
            section_id = placement.position.section_id
            if section_id not in stats['by_section']:
                stats['by_section'][section_id] = {
                    'count': 0,
                    'title': placement.position.section_title
                }
            stats['by_section'][section_id]['count'] += 1

            # 요소별 집계
            element = placement.position.after_element
            stats['by_element'][element] = stats['by_element'].get(element, 0) + 1

        return stats

    def validate_placements(
        self,
        placements: List[ImagePlacement],
        html_content: str
    ) -> Tuple[bool, List[str]]:
        """배치 유효성 검증

        Args:
            placements: 이미지 배치 목록
            html_content: HTML 콘텐츠

        Returns:
            (유효 여부, 오류 메시지 리스트)
        """
        errors = []

        # 1. 위치 중복 체크
        positions = [p.position.position for p in placements]
        if len(positions) != len(set(positions)):
            errors.append("중복된 배치 위치가 있습니다")

        # 2. 위치 범위 체크
        content_length = len(html_content)
        for i, placement in enumerate(placements):
            pos = placement.position.position
            if pos < 0 or pos > content_length:
                errors.append(f"배치 #{i+1}의 위치가 콘텐츠 범위를 벗어났습니다")

        # 3. 최소 간격 체크
        sorted_positions = sorted(positions)
        for i in range(len(sorted_positions) - 1):
            gap = sorted_positions[i + 1] - sorted_positions[i]
            if gap < self.min_gap:
                errors.append(
                    f"위치 {sorted_positions[i]}와 {sorted_positions[i+1]} 사이 간격({gap}자)이 "
                    f"최소 간격({self.min_gap}자)보다 작습니다"
                )

        # 4. 필수 필드 체크
        for i, placement in enumerate(placements):
            if not placement.image_id:
                errors.append(f"배치 #{i+1}에 이미지 ID가 없습니다")
            if not placement.alt_text:
                errors.append(f"배치 #{i+1}에 alt text가 없습니다")

        return len(errors) == 0, errors
