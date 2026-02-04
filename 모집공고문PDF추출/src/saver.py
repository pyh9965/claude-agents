"""추출 결과 저장 기능"""
import json
from pathlib import Path
from datetime import datetime

import pandas as pd

from .schemas import ApartmentData
from .utils import get_logger, ensure_dir, format_price


def save_results(data: ApartmentData, output_dir: str) -> dict[str, Path]:
    """추출 결과를 다양한 형식으로 저장

    Args:
        data: 추출된 아파트 데이터
        output_dir: 출력 디렉토리 경로

    Returns:
        생성된 파일 경로 딕셔너리
    """
    logger = get_logger()
    output_path = ensure_dir(output_dir)

    # 파일명 생성 (단지명 기반)
    safe_name = data.단지명.replace(" ", "_").replace("/", "_")
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    base_name = f"{safe_name}_{timestamp}"

    saved_files = {}

    # 1. JSON 저장 (상세 데이터)
    json_path = output_path / f"{base_name}.json"
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(data.model_dump(), f, ensure_ascii=False, indent=2)
    saved_files["json"] = json_path
    logger.info(f"JSON 저장 완료: {json_path}")

    # 2. CSV 저장 (주택형별 요약)
    csv_path = output_path / f"{base_name}.csv"
    save_csv(data, csv_path)
    saved_files["csv"] = csv_path
    logger.info(f"CSV 저장 완료: {csv_path}")

    # 3. 마크다운 리포트 저장
    md_path = output_path / f"{base_name}.md"
    save_markdown(data, md_path)
    saved_files["markdown"] = md_path
    logger.info(f"마크다운 저장 완료: {md_path}")

    return saved_files


def save_csv(data: ApartmentData, csv_path: Path) -> None:
    """CSV 파일로 주택형별 요약 저장"""
    rows = []

    for housing in data.분양가:
        row = {
            "단지명": data.단지명,
            "위치": data.위치,
            "주택형": housing.주택형,
            "전용면적(m2)": housing.전용면적_m2,
            "공급세대수": housing.공급세대수,
            "최저가(억)": housing.최저가_억,
            "최고가(억)": housing.최고가_억,
        }
        rows.append(row)

    df = pd.DataFrame(rows)
    df.to_csv(csv_path, index=False, encoding="utf-8-sig")


def save_markdown(data: ApartmentData, md_path: Path) -> None:
    """마크다운 리포트 저장"""
    lines = [
        f"# {data.단지명} 분양가 분석",
        "",
        f"**위치:** {data.위치}",
        f"**총세대수:** {data.총세대수:,}세대",
        f"**분석일시:** {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}",
        "",
        "---",
        "",
        "## 주택형별 분양가",
        "",
    ]

    for housing in data.분양가:
        lines.extend([
            f"### {housing.주택형} ({housing.전용면적_m2}m²)",
            "",
            f"- **공급세대수:** {housing.공급세대수}세대",
            f"- **최저가:** {housing.최저가_억}억원",
            f"- **최고가:** {housing.최고가_억}억원",
            "",
        ])

        if housing.층별_분양가:
            lines.append("| 층구분 | 세대수 | 대지비 | 건축비 | 분양가 |")
            lines.append("|--------|--------|--------|--------|--------|")

            for layer in housing.층별_분양가:
                lines.append(
                    f"| {layer.층구분} | {layer.세대수} | "
                    f"{format_price(layer.대지비)} | {format_price(layer.건축비)} | "
                    f"{format_price(layer.분양가_원)} |"
                )
            lines.append("")

    # 납부일정
    if data.납부일정:
        lines.extend([
            "---",
            "",
            "## 납부일정",
            "",
            f"- **계약금:** {data.납부일정.계약금}",
            f"- **중도금:** {data.납부일정.중도금}",
            f"- **잔금:** {data.납부일정.잔금}",
            "",
        ])

    with open(md_path, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))
