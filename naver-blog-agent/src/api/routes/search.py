from fastapi import APIRouter, Query
from typing import List, Optional
from datetime import date

from ...models import BlogPostMeta
from ...services.orchestrator import get_orchestrator

router = APIRouter()


@router.get("/")
async def quick_search(
    keyword: str = Query(..., description="검색 키워드"),
    max_results: int = Query(100, ge=1, le=1000, description="최대 결과 수")
):
    """빠른 검색 (DB 저장 없이)"""
    orchestrator = get_orchestrator()
    results = await orchestrator.quick_search(keyword, max_results)

    return {
        "keyword": keyword,
        "total": len(results),
        "results": [
            {
                "title": r.title.replace("<b>", "").replace("</b>", ""),
                "link": r.link,
                "description": r.description.replace("<b>", "").replace("</b>", ""),
                "bloggername": r.bloggername,
                "postdate": r.postdate
            }
            for r in results
        ]
    }
