#!/usr/bin/env python
"""
설정 검증 스크립트
CLI 실행 전에 환경이 올바르게 설정되었는지 확인합니다.
"""
import sys
import os
from pathlib import Path

def check_env_file():
    """환경 변수 파일 확인"""
    env_path = Path(".env")
    if not env_path.exists():
        print("❌ .env 파일이 없습니다.")
        print("   .env.example을 복사하여 .env를 생성하고 API 키를 입력하세요:")
        print("   cp .env.example .env")
        return False

    print("✓ .env 파일 존재")

    # API 키 확인
    with open(env_path) as f:
        content = f.read()

    checks = {
        "NAVER_CLIENT_ID": "your_client_id" not in content,
        "NAVER_CLIENT_SECRET": "your_client_secret" not in content,
        "ANTHROPIC_API_KEY": "your_anthropic_key" not in content,
    }

    all_configured = True
    for key, is_configured in checks.items():
        if is_configured:
            print(f"  ✓ {key} 설정됨")
        else:
            print(f"  ❌ {key} 미설정 (기본값 사용 중)")
            all_configured = False

    return all_configured

def check_dependencies():
    """필수 패키지 확인"""
    required_packages = [
        "httpx",
        "anthropic",
        "fastapi",
        "uvicorn",
        "sqlalchemy",
        "pydantic",
        "loguru",
        "pytest",
    ]

    missing = []
    for package in required_packages:
        try:
            __import__(package)
            print(f"✓ {package} 설치됨")
        except ImportError:
            print(f"❌ {package} 미설치")
            missing.append(package)

    if missing:
        print("\n필수 패키지 설치:")
        print("pip install -r requirements.txt")
        return False

    return True

def check_directory_structure():
    """디렉토리 구조 확인"""
    required_dirs = ["src", "tests", "data", "docs", "scripts"]
    required_files = [
        "src/cli.py",
        "run.py",
        "tests/test_agents.py",
        "requirements.txt",
        "pyproject.toml",
    ]

    all_exist = True

    for dir_name in required_dirs:
        if Path(dir_name).exists():
            print(f"✓ {dir_name}/ 존재")
        else:
            print(f"❌ {dir_name}/ 없음")
            all_exist = False

    for file_path in required_files:
        if Path(file_path).exists():
            print(f"✓ {file_path} 존재")
        else:
            print(f"❌ {file_path} 없음")
            all_exist = False

    return all_exist

def check_database():
    """데이터베이스 디렉토리 확인"""
    data_dir = Path("data")
    if not data_dir.exists():
        print("⚠ data/ 디렉토리가 없습니다. 생성합니다...")
        data_dir.mkdir(exist_ok=True)
        print("✓ data/ 디렉토리 생성됨")
    else:
        print("✓ data/ 디렉토리 존재")

    return True

def main():
    """메인 검증 함수"""
    print("=" * 60)
    print("Naver Blog Agent 설정 검증")
    print("=" * 60)

    results = []

    print("\n[1] 환경 변수 파일 확인")
    print("-" * 60)
    results.append(check_env_file())

    print("\n[2] 필수 패키지 확인")
    print("-" * 60)
    results.append(check_dependencies())

    print("\n[3] 디렉토리 구조 확인")
    print("-" * 60)
    results.append(check_directory_structure())

    print("\n[4] 데이터베이스 디렉토리 확인")
    print("-" * 60)
    results.append(check_database())

    print("\n" + "=" * 60)
    if all(results):
        print("✓ 모든 검증 통과! CLI를 사용할 수 있습니다.")
        print("\n시작하기:")
        print("  python run.py search \"키워드\" -n 10")
        print("  python run.py server --reload")
        return 0
    else:
        print("❌ 일부 검증 실패. 위의 오류를 수정하세요.")
        return 1

if __name__ == "__main__":
    sys.exit(main())
