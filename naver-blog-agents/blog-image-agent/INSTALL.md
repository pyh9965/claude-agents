# Blog Image Agent 설치 가이드

## 시스템 요구사항

- Python 3.11 이상
- pip (Python 패키지 관리자)
- 10GB 이상의 디스크 여유 공간 (캐시 및 이미지 저장용)

## 설치 방법

### 1. 저장소 클론 (또는 다운로드)

```bash
git clone <repository-url>
cd blog-image-agent
```

### 2. 가상환경 생성 (권장)

**Windows:**
```bash
python -m venv venv
venv\Scripts\activate
```

**Linux/Mac:**
```bash
python -m venv venv
source venv/bin/activate
```

### 3. 의존성 설치

**방법 A: requirements.txt 사용**
```bash
pip install -r requirements.txt
```

**방법 B: setup.py로 개발 모드 설치 (권장)**
```bash
pip install -e .
```

개발 모드(`-e`)로 설치하면:
- 코드 수정 시 재설치 불필요
- `blog-image` 명령어를 전역에서 사용 가능
- 디버깅 및 개발에 편리

### 4. API 키 설정

#### 4.1. .env 파일 생성

```bash
cp .env.example .env
```

#### 4.2. .env 파일 편집

`.env` 파일을 텍스트 에디터로 열고 API 키를 입력합니다:

```env
# Google API (필수)
GOOGLE_API_KEY=AIzaSyBXXXXXXXXXXXXXXXXXXXXXXXXXXXXX

# Google Places API (선택, GOOGLE_API_KEY와 같은 키 사용 가능)
GOOGLE_PLACES_API_KEY=

# Unsplash API (선택)
UNSPLASH_ACCESS_KEY=your_unsplash_access_key

# Pexels API (선택)
PEXELS_API_KEY=your_pexels_api_key

# 기본 설정
DEFAULT_MODEL=gemini-2.0-flash
IMAGE_QUALITY=85
CONVERT_TO_WEBP=true
```

#### 4.3. API 키 발급 방법

**Google API (Gemini, Nanobanana, Places):**
1. [Google AI Studio](https://aistudio.google.com/) 방문
2. "Get API Key" 클릭
3. 새 API 키 생성
4. API 키 복사하여 `.env`에 붙여넣기

**Unsplash (선택):**
1. [Unsplash Developers](https://unsplash.com/developers) 방문
2. 계정 생성 및 로그인
3. "New Application" 생성
4. Access Key 복사

**Pexels (선택):**
1. [Pexels API](https://www.pexels.com/api/) 방문
2. 계정 생성 및 로그인
3. API 키 발급
4. API 키 복사

### 5. 설치 확인

```bash
# CLI 도움말 확인
blog-image --help

# 설정 상태 확인
blog-image config

# 테스트 실행
python test_cli.py
```

성공적으로 설치되면 다음과 같은 출력을 볼 수 있습니다:

```
=== Blog Image Agent 설정 ===

API 키 상태:
  [OK] Google Gemini / Places: AIzaSyBX...abc123
  [X] Unsplash: 미설정
  [X] Pexels: 미설정

설정 파일: .env
캐시 디렉토리: .cache/images
```

## 첫 실행

### 샘플 파일로 테스트

```bash
# 예제 파일 분석
blog-image analyze examples/sample_blog_post.html

# 전체 파이프라인 실행
blog-image collect examples/sample_blog_post.html -o test_output
```

### AI 이미지 생성 테스트

```bash
blog-image generate -p "맛있는 김치찌개" -t food_photo -s food
```

## 문제 해결

### 1. "blog-image: command not found"

**원인:** CLI가 PATH에 등록되지 않음

**해결 방법 1: 개발 모드 재설치**
```bash
pip uninstall blog-image-agent
pip install -e .
```

**해결 방법 2: Python 모듈로 직접 실행**
```bash
python -m cli.main --help
```

**해결 방법 3: 전체 경로로 실행 (Windows)**
```bash
python src/cli/main.py --help
```

### 2. "ModuleNotFoundError: No module named 'click'"

**원인:** 의존성이 설치되지 않음

**해결:**
```bash
pip install -r requirements.txt
```

### 3. "GOOGLE_API_KEY 환경변수 필요"

**원인:** API 키가 설정되지 않음

**해결:**
1. `.env` 파일 존재 확인
2. `.env` 파일에 `GOOGLE_API_KEY=...` 있는지 확인
3. 현재 디렉토리에서 실행하고 있는지 확인

**임시 해결 (테스트용):**
```bash
# Windows
set GOOGLE_API_KEY=your_key_here
blog-image config

# Linux/Mac
export GOOGLE_API_KEY=your_key_here
blog-image config
```

### 4. "ImportError: cannot import name 'PipelineOrchestrator'"

**원인:** src 경로 문제

**해결:**
```bash
# 프로젝트 루트 디렉토리로 이동
cd D:\AI프로그램제작\agent\naver-blog-agents\blog-image-agent

# 개발 모드로 재설치
pip install -e .
```

### 5. SSL 인증서 오류

**원인:** 방화벽 또는 프록시 문제

**해결:**
```bash
# pip 업그레이드
python -m pip install --upgrade pip

# SSL 검증 비활성화 (보안 위험, 임시 해결)
pip install --trusted-host pypi.org --trusted-host files.pythonhosted.org -r requirements.txt
```

### 6. 이미지 생성 실패

**원인 1: API 할당량 초과**
- Google API는 무료 할당량 제한이 있습니다
- [Google Cloud Console](https://console.cloud.google.com/)에서 할당량 확인

**원인 2: 안전 필터 차단**
- 부적절한 콘텐츠로 감지되면 생성 거부됨
- 프롬프트를 수정하여 재시도

**원인 3: 네트워크 오류**
- 인터넷 연결 확인
- 방화벽 설정 확인

## 업그레이드

```bash
# 코드 업데이트
git pull origin main

# 의존성 업데이트
pip install --upgrade -r requirements.txt

# 또는 개발 모드 재설치
pip install -e . --upgrade
```

## 제거

```bash
# 패키지 제거
pip uninstall blog-image-agent

# 가상환경 제거
deactivate
rm -rf venv  # Linux/Mac
# 또는
rmdir /s venv  # Windows

# 캐시 제거
rm -rf .cache
```

## 다음 단계

설치가 완료되었다면 [CLI_README.md](./CLI_README.md)를 참고하여 CLI 사용법을 익히세요.

주요 명령어:
- `blog-image config` - 설정 확인
- `blog-image collect <파일>` - 이미지 수집
- `blog-image generate -p "<프롬프트>"` - AI 이미지 생성
- `blog-image --help` - 전체 도움말

## 지원

문제가 계속되면:
1. GitHub Issues에 버그 리포트 제출
2. 로그 파일 첨부 (`.cache/logs/`)
3. 환경 정보 제공:
   ```bash
   python --version
   pip list
   blog-image config
   ```
