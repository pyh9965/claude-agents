from fastapi import APIRouter, Query, HTTPException
from typing import Optional

from ...services.orchestrator import get_orchestrator

router = APIRouter()


@router.get("/")
async def quick_analyze(
    url: str = Query(..., description="분석할 블로그 URL")
):
    """빠른 분석 (단일 URL, DB 저장 없이)"""
    orchestrator = get_orchestrator()
    result = await orchestrator.quick_analyze(url)

    if not result:
        raise HTTPException(status_code=400, detail="분석 실패")

    return {
        "url": result.url,
        "sentiment": {
            "score": result.sentiment_score,
            "label": result.sentiment_label.value
        },
        "keywords": result.keywords,
        "summary": result.summary,
        "content_type": result.content_type.value,
        "is_ad": result.is_ad,
        "quality_score": result.quality_score
    }
