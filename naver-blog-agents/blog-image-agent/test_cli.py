"""CLI 통합 테스트 스크립트

실제 CLI를 실행하지 않고 모듈을 직접 import하여 테스트합니다.
"""

import sys
from pathlib import Path

# src 경로 추가
sys.path.insert(0, str(Path(__file__).parent / "src"))

from cli.main import cli
from click.testing import CliRunner


def test_help():
    """도움말 출력 테스트"""
    runner = CliRunner()
    result = runner.invoke(cli, ['--help'])

    print("=== CLI 도움말 테스트 ===")
    print(result.output)
    assert result.exit_code == 0
    assert "Blog Image Collection Agent" in result.output
    print("✓ 도움말 출력 성공\n")


def test_config():
    """config 명령어 테스트"""
    runner = CliRunner()
    result = runner.invoke(cli, ['config'])

    print("=== config 명령어 테스트 ===")
    print(result.output)
    assert result.exit_code == 0
    assert "Blog Image Agent 설정" in result.output
    print("✓ config 명령어 성공\n")


def test_collect_help():
    """collect 명령어 도움말 테스트"""
    runner = CliRunner()
    result = runner.invoke(cli, ['collect', '--help'])

    print("=== collect 도움말 테스트 ===")
    print(result.output)
    assert result.exit_code == 0
    assert "블로그 콘텐츠에서 이미지 수집" in result.output
    print("✓ collect 도움말 성공\n")


def test_generate_help():
    """generate 명령어 도움말 테스트"""
    runner = CliRunner()
    result = runner.invoke(cli, ['generate', '--help'])

    print("=== generate 도움말 테스트 ===")
    print(result.output)
    assert result.exit_code == 0
    assert "나노바나나" in result.output
    print("✓ generate 도움말 성공\n")


def test_analyze_help():
    """analyze 명령어 도움말 테스트"""
    runner = CliRunner()
    result = runner.invoke(cli, ['analyze', '--help'])

    print("=== analyze 도움말 테스트 ===")
    print(result.output)
    assert result.exit_code == 0
    assert "콘텐츠 분석" in result.output
    print("✓ analyze 도움말 성공\n")


def test_insert_help():
    """insert 명령어 도움말 테스트"""
    runner = CliRunner()
    result = runner.invoke(cli, ['insert', '--help'])

    print("=== insert 도움말 테스트 ===")
    print(result.output)
    assert result.exit_code == 0
    assert "이미지를 콘텐츠에 자동 삽입" in result.output
    print("✓ insert 도움말 성공\n")


def test_pipeline_help():
    """pipeline 명령어 도움말 테스트"""
    runner = CliRunner()
    result = runner.invoke(cli, ['pipeline', '--help'])

    print("=== pipeline 도움말 테스트 ===")
    print(result.output)
    assert result.exit_code == 0
    assert "전체 파이프라인" in result.output
    print("✓ pipeline 도움말 성공\n")


def test_all_commands():
    """모든 명령어 목록 확인"""
    runner = CliRunner()
    result = runner.invoke(cli, ['--help'])

    print("=== 모든 명령어 목록 ===")
    commands = ['collect', 'generate', 'analyze', 'insert', 'pipeline', 'config']

    for cmd in commands:
        if cmd in result.output:
            print(f"✓ {cmd} 명령어 발견")
        else:
            print(f"✗ {cmd} 명령어 누락")
            assert False, f"{cmd} 명령어가 CLI에 등록되지 않음"

    print("\n모든 명령어 정상 등록됨\n")


if __name__ == "__main__":
    print("=" * 60)
    print("Blog Image Agent CLI 통합 테스트")
    print("=" * 60 + "\n")

    try:
        test_help()
        test_config()
        test_collect_help()
        test_generate_help()
        test_analyze_help()
        test_insert_help()
        test_pipeline_help()
        test_all_commands()

        print("=" * 60)
        print("모든 테스트 성공!")
        print("=" * 60)

    except AssertionError as e:
        print(f"\n테스트 실패: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"\n예상치 못한 오류: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
