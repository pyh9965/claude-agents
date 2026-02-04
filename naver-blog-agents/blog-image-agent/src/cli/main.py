import asyncio
import click
from pathlib import Path
import json
from dotenv import load_dotenv

load_dotenv()

@click.group()
@click.version_option(version="1.0.0")
def cli():
    """Blog Image Collection Agent - 블로그 이미지 자동 수집 및 생성 도구"""
    pass

@cli.command()
@click.argument("content_path", type=click.Path(exists=True))
@click.option("--output", "-o", default="output", help="출력 디렉토리")
@click.option("--model", "-m", default="gemini-2.0-flash",
              type=click.Choice(["gemini-2.0-flash", "gemini-2.0-pro", "claude"]),
              help="콘텐츠 분석에 사용할 AI 모델")
@click.option("--no-optimize", is_flag=True, help="이미지 최적화 건너뛰기")
@click.option("--priority", "-p", default="real",
              type=click.Choice(["real", "stock", "ai"]),
              help="이미지 수집 우선순위")
def collect(content_path, output, model, no_optimize, priority):
    """블로그 콘텐츠에서 이미지 수집 및 배치

    예시:
        blog-image collect content.html -o ./output
        blog-image collect post.md --model gemini-2.0-pro
    """
    import sys
    sys.path.insert(0, str(Path(__file__).parent.parent.parent))

    from src.pipeline import PipelineOrchestrator, PipelineConfig

    click.echo(f"[*] 콘텐츠 파일: {content_path}")
    click.echo(f"[*] 출력 디렉토리: {output}")
    click.echo(f"[*] AI 모델: {model}")
    click.echo(f"[*] 수집 우선순위: {priority}")

    # 콘텐츠 읽기
    content = Path(content_path).read_text(encoding="utf-8")

    # 파이프라인 설정
    priority_map = {
        "real": ["google", "stock", "nanobanana"],
        "stock": ["stock", "google", "nanobanana"],
        "ai": ["nanobanana", "stock", "google"]
    }

    config = PipelineConfig(
        output_dir=output,
        optimize_images=not no_optimize,
        collection_priority=priority_map[priority]
    )

    # 실행
    async def run():
        orchestrator = PipelineOrchestrator(config)
        result = await orchestrator.run(content, output)
        await orchestrator.close()
        return result

    result = asyncio.run(run())

    if result.success:
        click.echo(click.style(f"\n[OK] 완료!", fg="green"))
        click.echo(f"  - 수집된 이미지: {result.statistics.total}개")
        click.echo(f"  - 소스별: {result.statistics.by_source}")
        click.echo(f"  - 소요 시간: {result.execution_time:.1f}초")
        click.echo(f"  - 출력 파일: {output}/content_with_images.html")
    else:
        click.echo(click.style(f"\n[ERROR] 실패!", fg="red"))
        for error in result.errors:
            click.echo(f"  - {error}")

@cli.command()
@click.option("--prompt", "-p", required=True, help="이미지 생성 프롬프트")
@click.option("--type", "-t", "image_type", default="thumbnail",
              type=click.Choice(["thumbnail", "banner", "food_photo", "infographic"]),
              help="이미지 유형")
@click.option("--style", "-s", default="default",
              type=click.Choice(["food", "travel", "lifestyle", "tech", "default"]),
              help="스타일 프리셋")
@click.option("--output", "-o", default="generated_image.png", help="출력 파일명")
def generate(prompt, image_type, style, output):
    """나노바나나 3.0 Pro로 AI 이미지 생성

    예시:
        blog-image generate -p "맛있는 김치찌개" -t food_photo
        blog-image generate -p "서울 여행" -t thumbnail -s travel
    """
    import sys
    sys.path.insert(0, str(Path(__file__).parent.parent.parent))

    from src.collectors import NanobananGenerator

    click.echo(f"[*] 프롬프트: {prompt}")
    click.echo(f"[*] 이미지 유형: {image_type}")
    click.echo(f"[*] 스타일: {style}")

    async def run():
        generator = NanobananGenerator()
        result = await generator.generate_image(
            prompt=prompt,
            image_type=image_type,
            style=style
        )

        if result:
            generator.save_image(result.data, output)
            return True
        return False

    try:
        success = asyncio.run(run())

        if success:
            click.echo(click.style(f"\n[OK] 이미지 생성 완료: {output}", fg="green"))
        else:
            click.echo(click.style("\n[ERROR] 이미지 생성 실패", fg="red"))
    except Exception as e:
        click.echo(click.style(f"\n[ERROR] {e}", fg="red"))

@cli.command()
@click.argument("content_path", type=click.Path(exists=True))
@click.option("--output", "-o", default="requirements.json", help="출력 파일")
@click.option("--model", "-m", default="gemini-2.0-flash", help="AI 모델")
def analyze(content_path, output, model):
    """콘텐츠 분석하여 이미지 요구사항 추출

    예시:
        blog-image analyze content.html -o requirements.json
    """
    import sys
    sys.path.insert(0, str(Path(__file__).parent.parent.parent))

    from src.analyzers import ContentAnalyzer

    click.echo(f"[*] 콘텐츠 분석 중: {content_path}")

    content = Path(content_path).read_text(encoding="utf-8")

    async def run():
        analyzer = ContentAnalyzer(model=model)
        requirements = await analyzer.analyze(content)
        return requirements

    requirements = asyncio.run(run())

    # JSON 저장
    output_data = [
        r.__dict__ if hasattr(r, '__dict__') else r
        for r in requirements
    ]

    with open(output, "w", encoding="utf-8") as f:
        json.dump(output_data, f, ensure_ascii=False, indent=2, default=str)

    click.echo(click.style(f"\n[OK] {len(requirements)}개 이미지 요구사항 추출", fg="green"))
    click.echo(f"  - 저장 위치: {output}")

    # 요약 출력
    for i, req in enumerate(requirements[:5], 1):
        req_type = req.type if hasattr(req, 'type') else req.get('type', 'unknown')
        keywords = req.keywords if hasattr(req, 'keywords') else req.get('keywords', [])
        click.echo(f"  {i}. [{req_type}] {', '.join(keywords[:3])}")

    if len(requirements) > 5:
        click.echo(f"  ... 외 {len(requirements) - 5}개")

@cli.command()
@click.argument("content_path", type=click.Path(exists=True))
@click.option("--images", "-i", required=True, help="이미지 디렉토리")
@click.option("--output", "-o", default="content_with_images.html", help="출력 파일")
def insert(content_path, images, output):
    """이미지를 콘텐츠에 자동 삽입

    예시:
        blog-image insert content.html -i ./images -o output.html
    """
    import sys
    sys.path.insert(0, str(Path(__file__).parent.parent.parent))

    from src.placers import AutoPlacer, HtmlInserter

    click.echo(f"[*] 콘텐츠: {content_path}")
    click.echo(f"[*] 이미지 디렉토리: {images}")

    content = Path(content_path).read_text(encoding="utf-8")

    # 이미지 파일 목록
    image_dir = Path(images)
    image_files = list(image_dir.glob("*.webp")) + list(image_dir.glob("*.jpg")) + list(image_dir.glob("*.png"))

    if not image_files:
        click.echo(click.style("[ERROR] 이미지 파일이 없습니다", fg="red"))
        return

    # 간단한 배치 (이미지 순서대로)
    placer = AutoPlacer()
    inserter = HtmlInserter()

    positions = placer.analyze_content(content)

    placements = []
    for i, (pos, img_file) in enumerate(zip(positions, image_files)):
        placements.append({
            "image_id": img_file.name,
            "position": {"position": pos.position},
            "alt_text": f"이미지 {i+1}",
            "caption": ""
        })

    result_html = inserter.insert_images(content, placements, images)

    with open(output, "w", encoding="utf-8") as f:
        f.write(result_html)

    click.echo(click.style(f"\n[OK] {len(placements)}개 이미지 삽입 완료", fg="green"))
    click.echo(f"  - 출력 파일: {output}")

@cli.command()
@click.argument("content_path", type=click.Path(exists=True))
@click.option("--output", "-o", default="output", help="출력 디렉토리")
def pipeline(content_path, output):
    """전체 파이프라인 실행 (분석 → 수집 → 최적화 → 삽입)

    예시:
        blog-image pipeline content.html -o ./output
    """
    # collect 명령어와 동일
    ctx = click.get_current_context()
    ctx.invoke(collect, content_path=content_path, output=output, model="gemini-2.0-flash", no_optimize=False, priority="real")

@cli.command()
def config():
    """현재 설정 확인 및 API 키 상태"""
    import os

    click.echo("=== Blog Image Agent 설정 ===\n")

    # API 키 상태
    apis = [
        ("GOOGLE_API_KEY", "Google Gemini / Places"),
        ("GOOGLE_PLACES_API_KEY", "Google Places (별도)"),
        ("UNSPLASH_ACCESS_KEY", "Unsplash"),
        ("PEXELS_API_KEY", "Pexels"),
    ]

    click.echo("API 키 상태:")
    for key, name in apis:
        value = os.getenv(key)
        if value:
            masked = value[:8] + "..." + value[-4:] if len(value) > 12 else "***"
            click.echo(click.style(f"  [OK] {name}: {masked}", fg="green"))
        else:
            click.echo(click.style(f"  [X] {name}: 미설정", fg="yellow"))

    click.echo("\n설정 파일: .env")
    click.echo("캐시 디렉토리: .cache/images")

if __name__ == "__main__":
    cli()
