#!/usr/bin/env python
"""
Naver Blog Agent 실행 스크립트

사용법:
    python run.py search "드파인 연희" -n 50
    python run.py analyze "https://blog.naver.com/example/12345"
    python run.py run "드파인 연희" -n 100
    python run.py server --port 8000
"""
import sys
import os

# 프로젝트 루트를 Python 경로에 추가
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from src.cli import main

if __name__ == "__main__":
    main()
