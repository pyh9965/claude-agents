import asyncio
import argparse
import sys
from datetime import datetime
from loguru import logger

from .core.config import get_settings
from .services.orchestrator import get_orchestrator
from .models import TaskCreate
from .utils.logger import setup_logger


async def search_command(args):
    """검색 명령 실행"""
    orchestrator = get_orchestrator({
        "client_id": args.client_id,
        "client_secret": args.client_secret,
    })
    await orchestrator.initialize()

    try:
        results = await orchestrator.quick_search(args.keyword, args.max_results)

        print(f"\n=== 검색 결과: '{args.keyword}' ===")
        print(f"총 {len(results)}개 발견\n")

        for i, post in enumerate(results[:20], 1):
            title = post.title.replace("<b>", "").replace("</b>", "")
            print(f"{i:3}. [{post.postdate}] {title[:50]}")
            print(f"     {post.link}")
            print()

        if len(results) > 20:
            print(f"... 외 {len(results) - 20}개")

    finally:
        await orchestrator.cleanup()


async def analyze_command(args):
    """분석 명령 실행"""
    orchestrator = get_orchestrator({
        "api_key": args.api_key,
    })
    await orchestrator.initialize()

    try:
        print(f"\n분석 중: {args.url}")
        print("(수집 및 AI 분석에 시간이 소요됩니다...)\n")

        result = await orchestrator.quick_analyze(args.url)

        if result:
            print("=== 분석 결과 ===\n")
            print(f"감성 점수: {result.sentiment_score:.2f} ({result.sentiment_label.value})")
            print(f"콘텐츠 유형: {result.content_type.value}")
            print(f"광고 여부: {'예' if result.is_ad else '아니오'}")
            print(f"품질 점수: {result.quality_score}/10")
            print(f"\n키워드: {', '.join([k['keyword'] for k in result.keywords[:5]])}")
            print(f"\n요약:\n{result.summary}")
        else:
            print("분석 실패: 콘텐츠를 수집할 수 없습니다.")

    finally:
        await orchestrator.cleanup()


async def run_command(args):
    """전체 작업 실행"""
    from datetime import datetime

    settings = get_settings()
    config = {
        "client_id": args.client_id or settings.naver_client_id,
        "client_secret": args.client_secret or settings.naver_client_secret,
        "api_key": args.api_key or settings.anthropic_api_key,
    }

    orchestrator = get_orchestrator(config)
    await orchestrator.initialize()

    try:
        # 작업 생성
        task_input = TaskCreate(
            keyword=args.keyword,
            max_results=args.max_results,
            crawl_content=not args.no_crawl,
            analyze_content=not args.no_analyze
        )

        task = await orchestrator.create_task(task_input)
        print(f"\n작업 생성됨: {task.id}")
        print(f"키워드: {args.keyword}")
        print(f"최대 결과: {args.max_results}")

        # 진행률 콜백
        async def progress_callback(status, progress, message):
            print(f"[{status.value}] {progress:.0f}% - {message}")

        # 작업 실행
        print("\n작업 시작...\n")
        result = await orchestrator.run_task(
            task.id,
            crawl_content=not args.no_crawl,
            analyze_content=not args.no_analyze,
            progress_callback=progress_callback
        )

        print(f"\n=== 작업 완료 ===")
        print(f"검색됨: {result.total_found}개")
        print(f"수집됨: {result.total_crawled}개")
        print(f"분석됨: {result.total_analyzed}개")
        print(f"소요시간: {(result.completed_at - result.created_at).seconds}초")

    finally:
        await orchestrator.cleanup()


async def server_command(args):
    """API 서버 시작"""
    import uvicorn

    print(f"\n=== Naver Blog Agent API Server ===")
    print(f"Host: {args.host}")
    print(f"Port: {args.port}")
    print(f"Docs: http://{args.host}:{args.port}/docs")
    print()

    uvicorn.run(
        "src.api.main:app",
        host=args.host,
        port=args.port,
        reload=args.reload
    )


def main():
    """메인 엔트리포인트"""
    parser = argparse.ArgumentParser(
        prog="nbas",
        description="Naver Blog Analysis Agent System"
    )

    subparsers = parser.add_subparsers(dest="command", help="사용 가능한 명령")

    # search 명령
    search_parser = subparsers.add_parser("search", help="블로그 검색")
    search_parser.add_argument("keyword", help="검색 키워드")
    search_parser.add_argument("-n", "--max-results", type=int, default=100, help="최대 결과 수")
    search_parser.add_argument("--client-id", help="네이버 API Client ID")
    search_parser.add_argument("--client-secret", help="네이버 API Client Secret")

    # analyze 명령
    analyze_parser = subparsers.add_parser("analyze", help="블로그 분석")
    analyze_parser.add_argument("url", help="분석할 블로그 URL")
    analyze_parser.add_argument("--api-key", help="Anthropic API Key")

    # run 명령
    run_parser = subparsers.add_parser("run", help="전체 작업 실행")
    run_parser.add_argument("keyword", help="검색 키워드")
    run_parser.add_argument("-n", "--max-results", type=int, default=100, help="최대 결과 수")
    run_parser.add_argument("--no-crawl", action="store_true", help="콘텐츠 수집 건너뛰기")
    run_parser.add_argument("--no-analyze", action="store_true", help="분석 건너뛰기")
    run_parser.add_argument("--client-id", help="네이버 API Client ID")
    run_parser.add_argument("--client-secret", help="네이버 API Client Secret")
    run_parser.add_argument("--api-key", help="Anthropic API Key")

    # server 명령
    server_parser = subparsers.add_parser("server", help="API 서버 시작")
    server_parser.add_argument("--host", default="0.0.0.0", help="호스트")
    server_parser.add_argument("--port", type=int, default=8000, help="포트")
    server_parser.add_argument("--reload", action="store_true", help="자동 리로드")

    args = parser.parse_args()

    if not args.command:
        parser.print_help()
        return

    setup_logger()

    if args.command == "server":
        server_command(args)
    else:
        command_map = {
            "search": search_command,
            "analyze": analyze_command,
            "run": run_command,
        }

        if args.command in command_map:
            asyncio.run(command_map[args.command](args))


if __name__ == "__main__":
    main()
