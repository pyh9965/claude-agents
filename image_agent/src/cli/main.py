"""CLI 인터페이스"""

import click
import asyncio
import yaml
import os
import sys
from pathlib import Path
from typing import Optional
from rich.console import Console
from rich.table import Table
from rich.panel import Panel
from rich.progress import Progress, SpinnerColumn, TextColumn

# 프로젝트 모듈 임포트
from src.collector.web_crawler import WebCrawler
from src.collector.pdf_extractor import PDFExtractor
from src.classifier.vision_classifier import VisionClassifier
from src.generator.thumbnail_generator import ThumbnailGenerator, ThumbnailData

console = Console()


def load_config(config_path: Optional[str] = None) -> dict:
    """설정 파일 로드"""
    if config_path:
        config_file = Path(config_path)
    else:
        # 기본 설정 파일 경로
        default_config = Path(__file__).parent.parent.parent / 'config' / 'config.yaml'
        config_file = default_config

    if config_file.exists():
        with open(config_file, 'r', encoding='utf-8') as f:
            return yaml.safe_load(f)
    else:
        console.print(f"[yellow]설정 파일을 찾을 수 없습니다: {config_file}[/yellow]")
        return {}


@click.group()
@click.option('--config', '-c', type=click.Path(exists=True), help='설정 파일 경로')
@click.pass_context
def cli(ctx, config):
    """부동산 블로그 이미지 수집 자동화 도구

    이미지 수집, 분류, 썸네일 생성을 자동화하는 CLI 도구입니다.
    """
    ctx.ensure_object(dict)
    ctx.obj['config'] = load_config(config)


@cli.command()
@click.argument('url')
@click.option('--output', '-o', default='output', help='출력 디렉토리')
@click.option('--api-key', envvar='GOOGLE_API_KEY', help='Google Gemini API 키')
@click.pass_context
def collect(ctx, url, output, api_key):
    """URL에서 이미지를 수집합니다.

    예시:
        image-agent collect https://www.applyhome.co.kr/...
        image-agent collect https://www.applyhome.co.kr/... -o ./my_output
    """
    console.print(Panel.fit(
        "[bold cyan]이미지 수집 자동화[/bold cyan]",
        border_style="cyan"
    ))

    console.print(f"\n[bold]수집 중:[/bold] {url}")

    async def run_collection():
        try:
            # WebCrawler 인스턴스 생성
            crawler = WebCrawler(output_dir=output, api_token=api_key)

            # 수집 실행
            with Progress(
                SpinnerColumn(),
                TextColumn("[progress.description]{task.description}"),
                console=console
            ) as progress:
                task = progress.add_task("이미지 수집 중...", total=None)
                result = await crawler.collect_and_download(url)
                progress.update(task, completed=True)

            # 결과 출력
            console.print(f"\n[green]수집 완료:[/green] {len(result.images)}개 이미지")
            console.print(f"[green]PDF 발견:[/green] {len(result.pdf_urls)}개")
            console.print(f"[green]저장 위치:[/green] {output}")

            # 이미지 타입별 통계
            if result.images:
                type_counts = {}
                for img in result.images:
                    type_counts[img.image_type] = type_counts.get(img.image_type, 0) + 1

                table = Table(title="수집된 이미지 타입")
                table.add_column("타입", style="cyan")
                table.add_column("개수", style="magenta", justify="right")

                type_names = {
                    "floor_plan": "평면도",
                    "site_plan": "배치도",
                    "aerial_view": "조감도",
                    "location_map": "위치도",
                    "other": "기타"
                }

                for img_type, count in type_counts.items():
                    table.add_row(type_names.get(img_type, img_type), str(count))

                console.print(table)

        except Exception as e:
            console.print(f"[red]오류 발생:[/red] {e}")
            sys.exit(1)

    asyncio.run(run_collection())


@cli.command()
@click.argument('image_path', type=click.Path(exists=True))
@click.option('--batch', '-b', is_flag=True, help='디렉토리 내 모든 이미지 처리')
@click.option('--output', '-o', help='결과 JSON 저장 경로')
@click.option('--api-key', envvar='GOOGLE_API_KEY', help='Google Gemini API 키')
@click.pass_context
def classify(ctx, image_path, batch, output, api_key):
    """이미지를 AI로 분류합니다.

    예시:
        image-agent classify ./output/image.jpg
        image-agent classify ./output --batch -o results.json
    """
    console.print(Panel.fit(
        "[bold cyan]이미지 분류[/bold cyan]",
        border_style="cyan"
    ))

    try:
        # VisionClassifier 생성
        classifier = VisionClassifier(api_key=api_key)

        # 이미지 경로 수집
        path = Path(image_path)
        if batch and path.is_dir():
            # 디렉토리 내 모든 이미지
            image_extensions = {'.jpg', '.jpeg', '.png', '.webp'}
            image_files = [
                str(f) for f in path.rglob('*')
                if f.suffix.lower() in image_extensions
            ]
        else:
            # 단일 이미지
            image_files = [str(path)]

        if not image_files:
            console.print("[yellow]분류할 이미지를 찾을 수 없습니다.[/yellow]")
            return

        console.print(f"\n[bold]분류 대상:[/bold] {len(image_files)}개 이미지")

        # 분류 실행
        with Progress(console=console) as progress:
            task = progress.add_task("이미지 분류 중...", total=len(image_files))
            results = []
            for img_file in image_files:
                try:
                    result = classifier.classify_image(img_file)
                    results.append(result)
                    progress.update(task, advance=1)
                except Exception as e:
                    console.print(f"[yellow]분류 실패 ({img_file}): {e}[/yellow]")
                    progress.update(task, advance=1)

        # 결과 통계
        if results:
            console.print(f"\n[green]분류 완료:[/green] {len(results)}개 이미지")

            # 타입별 집계
            type_counts = {}
            for result in results:
                type_counts[result.image_type] = type_counts.get(result.image_type, 0) + 1

            table = Table(title="분류 결과")
            table.add_column("유형", style="cyan")
            table.add_column("개수", style="magenta", justify="right")

            type_names = {
                "floor_plan": "평면도",
                "site_plan": "배치도",
                "aerial_view": "조감도",
                "location_map": "위치도",
                "other": "기타"
            }

            for img_type, count in type_counts.items():
                table.add_row(type_names.get(img_type, img_type), str(count))

            console.print(table)

            # JSON 저장
            if output:
                classifier.save_results(results, output)
                console.print(f"\n[green]결과 저장:[/green] {output}")

    except Exception as e:
        console.print(f"[red]오류 발생:[/red] {e}")
        sys.exit(1)


@cli.command('generate-thumbnail')
@click.option('--name', '-n', required=True, help='단지명')
@click.option('--price', '-p', required=True, help='분양가 (예: 3.5억원~)')
@click.option('--background', '-bg', type=click.Path(exists=True), help='배경 이미지')
@click.option('--subtitle', '-s', help='부제목 (예: 2024년 입주 예정)')
@click.option('--output', '-o', default='output/thumbnails', help='출력 디렉토리')
@click.option('--api-key', envvar='BANNERBEAR_API_KEY', help='Bannerbear API 키')
@click.pass_context
def generate_thumbnail(ctx, name, price, background, subtitle, output, api_key):
    """블로그용 썸네일을 생성합니다.

    예시:
        image-agent generate-thumbnail -n "힐스테이트 광명" -p "3.5억원~"
        image-agent generate-thumbnail -n "힐스테이트 광명" -p "3.5억원~" -bg ./bg.jpg -s "2024년 입주"
    """
    console.print(Panel.fit(
        "[bold cyan]썸네일 생성[/bold cyan]",
        border_style="cyan"
    ))

    try:
        # ThumbnailGenerator 생성
        generator = ThumbnailGenerator(api_key=api_key, output_dir=output)

        # 썸네일 데이터 준비
        data = ThumbnailData(
            apartment_name=name,
            price=price,
            background_image=background,
            subtitle=subtitle
        )

        console.print(f"\n[bold]생성 중:[/bold] {name}")

        # 썸네일 생성
        with Progress(
            SpinnerColumn(),
            TextColumn("[progress.description]{task.description}"),
            console=console
        ) as progress:
            task = progress.add_task("썸네일 생성 중...", total=None)
            result = generator.generate(data)
            progress.update(task, completed=True)

        console.print(f"\n[green]생성 완료![/green]")
        console.print(f"[green]저장 위치:[/green] {result.output_path}")
        console.print(f"[green]크기:[/green] {result.width}x{result.height}")

    except Exception as e:
        console.print(f"[red]오류 발생:[/red] {e}")
        sys.exit(1)


@cli.command()
@click.argument('url')
@click.option('--output', '-o', default='output', help='출력 디렉토리')
@click.option('--no-thumbnail', is_flag=True, help='썸네일 생성 건너뛰기')
@click.option('--api-key', envvar='GOOGLE_API_KEY', help='Google Gemini API 키')
@click.pass_context
def pipeline(ctx, url, output, no_thumbnail, api_key):
    """전체 파이프라인을 실행합니다 (수집→분류→썸네일).

    예시:
        image-agent pipeline https://www.applyhome.co.kr/...
        image-agent pipeline https://www.applyhome.co.kr/... --no-thumbnail
    """
    console.print(Panel.fit(
        "[bold cyan]전체 파이프라인 실행[/bold cyan]",
        border_style="cyan"
    ))

    async def run_pipeline():
        try:
            # 1. 이미지 수집
            console.print("\n[bold cyan]1단계: 이미지 수집[/bold cyan]")
            console.print(f"URL: {url}")

            crawler = WebCrawler(output_dir=output, api_token=api_key)

            with Progress(
                SpinnerColumn(),
                TextColumn("[progress.description]{task.description}"),
                console=console
            ) as progress:
                task = progress.add_task("이미지 수집 중...", total=None)
                collection_result = await crawler.collect_and_download(url)
                progress.update(task, completed=True)

            console.print(f"[green]수집 완료:[/green] {len(collection_result.images)}개 이미지")

            if not collection_result.images:
                console.print("[yellow]수집된 이미지가 없습니다.[/yellow]")
                return

            # 2. 이미지 분류
            console.print("\n[bold cyan]2단계: 이미지 분류[/bold cyan]")

            classifier = VisionClassifier(api_key=api_key)
            image_paths = [img.local_path for img in collection_result.images if img.local_path]

            with Progress(console=console) as progress:
                task = progress.add_task("분류 중...", total=len(image_paths))
                classification_results = []
                for img_path in image_paths:
                    try:
                        result = classifier.classify_image(img_path)
                        classification_results.append(result)
                        progress.update(task, advance=1)
                    except Exception as e:
                        console.print(f"[yellow]분류 실패 ({img_path}): {e}[/yellow]")
                        progress.update(task, advance=1)

            # 분류 결과 저장
            if classification_results:
                result_path = Path(output) / "metadata" / "classification_results.json"
                classifier.save_results(classification_results, str(result_path))
                console.print(f"[green]분류 완료:[/green] {len(classification_results)}개 이미지")

                # 통계 출력
                type_counts = {}
                for result in classification_results:
                    type_counts[result.image_type] = type_counts.get(result.image_type, 0) + 1

                table = Table(title="분류 결과")
                table.add_column("유형", style="cyan")
                table.add_column("개수", style="magenta", justify="right")

                type_names = {
                    "floor_plan": "평면도",
                    "site_plan": "배치도",
                    "aerial_view": "조감도",
                    "location_map": "위치도",
                    "other": "기타"
                }

                for img_type, count in type_counts.items():
                    table.add_row(type_names.get(img_type, img_type), str(count))

                console.print(table)

            # 3. 썸네일 생성 (옵션)
            if not no_thumbnail:
                console.print("\n[bold cyan]3단계: 썸네일 생성[/bold cyan]")

                # 대표 이미지 찾기 (조감도 우선)
                background_img = None
                for result in classification_results:
                    if result.image_type == "aerial_view":
                        background_img = result.image_path
                        break

                if not background_img and classification_results:
                    background_img = classification_results[0].image_path

                if background_img:
                    generator = ThumbnailGenerator(output_dir=str(Path(output) / "thumbnails"))

                    # 썸네일 데이터 (기본값 사용)
                    data = ThumbnailData(
                        apartment_name=collection_result.apartment_name,
                        price="분양가 정보 확인 필요",
                        background_image=background_img,
                        subtitle="자세한 정보는 공식 홈페이지 참조"
                    )

                    with Progress(
                        SpinnerColumn(),
                        TextColumn("[progress.description]{task.description}"),
                        console=console
                    ) as progress:
                        task = progress.add_task("썸네일 생성 중...", total=None)
                        thumbnail_result = generator.generate(data)
                        progress.update(task, completed=True)

                    console.print(f"[green]썸네일 생성 완료:[/green] {thumbnail_result.output_path}")

            # 최종 요약
            console.print("\n[bold green]파이프라인 완료![/bold green]")
            console.print(f"[green]저장 위치:[/green] {output}")

        except Exception as e:
            console.print(f"[red]오류 발생:[/red] {e}")
            import traceback
            console.print(f"[red]{traceback.format_exc()}[/red]")
            sys.exit(1)

    asyncio.run(run_pipeline())


if __name__ == "__main__":
    cli()
