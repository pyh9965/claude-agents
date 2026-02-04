# CLI 사용 가이드

## 설치 및 설정

### 1. 환경 변수 설정

`.env.example` 파일을 복사하여 `.env` 파일을 생성하고 실제 API 키를 입력하세요:

```bash
cp .env.example .env
```

`.env` 파일 편집:
```env
# Application
APP_NAME=naver-blog-agent
APP_ENV=development
DEBUG=true

# Database
DATABASE_URL=sqlite+aiosqlite:///./data/blog_agent.db

# Naver API
NAVER_CLIENT_ID=실제_네이버_클라이언트_ID
NAVER_CLIENT_SECRET=실제_네이버_클라이언트_시크릿

# LLM API
ANTHROPIC_API_KEY=실제_Anthropic_API_키

# Crawler
CRAWLER_CONCURRENCY=50
CRAWLER_TIMEOUT=30
```

### 2. 필요한 패키지 설치

```bash
pip install -r requirements.txt
```

## CLI 명령어

### 1. 검색 (search)

네이버 블로그를 검색합니다 (DB에 저장하지 않음).

```bash
python run.py search "드파인 연희" -n 50
```

옵션:
- `keyword`: 검색할 키워드 (필수)
- `-n, --max-results`: 최대 결과 수 (기본값: 100)
- `--client-id`: 네이버 API Client ID (환경 변수 대신 사용)
- `--client-secret`: 네이버 API Client Secret (환경 변수 대신 사용)

출력 예시:
```
=== 검색 결과: '드파인 연희' ===
총 50개 발견

  1. [20260130] 드파인 연희 방문 후기
     https://blog.naver.com/example/12345

  2. [20260129] 드파인 연희점에서 즐긴 브런치
     https://blog.naver.com/example/12346
...
```

### 2. 분석 (analyze)

단일 블로그 URL을 수집하고 AI로 분석합니다 (DB에 저장하지 않음).

```bash
python run.py analyze "https://blog.naver.com/example/12345"
```

옵션:
- `url`: 분석할 블로그 URL (필수)
- `--api-key`: Anthropic API Key (환경 변수 대신 사용)

출력 예시:
```
분석 중: https://blog.naver.com/example/12345
(수집 및 AI 분석에 시간이 소요됩니다...)

=== 분석 결과 ===

감성 점수: 0.85 (긍정)
콘텐츠 유형: 후기
광고 여부: 아니오
품질 점수: 8/10

키워드: 드파인 연희, 브런치, 맛집, 분위기, 추천

요약:
드파인 연희점을 방문한 후기입니다. 브런치 메뉴가 맛있었고
분위기도 좋아서 데이트 장소로 추천합니다...
```

### 3. 전체 작업 실행 (run)

검색 → 수집 → 분석을 모두 수행하고 DB에 저장합니다.

```bash
python run.py run "드파인 연희" -n 100
```

옵션:
- `keyword`: 검색할 키워드 (필수)
- `-n, --max-results`: 최대 결과 수 (기본값: 100)
- `--no-crawl`: 콘텐츠 수집 건너뛰기
- `--no-analyze`: 분석 건너뛰기
- `--client-id`: 네이버 API Client ID
- `--client-secret`: 네이버 API Client Secret
- `--api-key`: Anthropic API Key

출력 예시:
```
작업 생성됨: task_abc123
키워드: 드파인 연희
최대 결과: 100

작업 시작...

[searching] 10% - 검색 중...
[crawling] 30% - 콘텐츠 수집 중...
[analyzing] 60% - AI 분석 중...
[analyzing] 75% - 분석 중... (25/100)
[completed] 100% - 완료!

=== 작업 완료 ===
검색됨: 100개
수집됨: 95개
분석됨: 90개
소요시간: 180초
```

### 4. API 서버 시작 (server)

FastAPI 서버를 시작합니다.

```bash
python run.py server --port 8000 --reload
```

옵션:
- `--host`: 호스트 (기본값: 0.0.0.0)
- `--port`: 포트 (기본값: 8000)
- `--reload`: 자동 리로드 활성화 (개발 모드)

출력:
```
=== Naver Blog Agent API Server ===
Host: 0.0.0.0
Port: 8000
Docs: http://0.0.0.0:8000/docs
```

서버 실행 후 브라우저에서 `http://localhost:8000/docs`로 접속하면
Swagger UI를 통해 API를 테스트할 수 있습니다.

## 사용 예시

### 예시 1: 빠른 검색만

```bash
python run.py search "맛집 연남동" -n 20
```

### 예시 2: 단일 URL 분석

```bash
python run.py analyze "https://blog.naver.com/example/12345"
```

### 예시 3: 검색 + 수집만 (분석 제외)

```bash
python run.py run "카페 성수동" -n 50 --no-analyze
```

### 예시 4: 전체 파이프라인

```bash
python run.py run "브런치 맛집" -n 100
```

### 예시 5: API 서버 시작 (개발 모드)

```bash
python run.py server --reload
```

## 테스트 실행

```bash
pytest tests/test_agents.py -v
```

또는

```bash
python tests/test_agents.py
```

## 주의사항

1. **API 키 필수**: 검색은 네이버 API 키, 분석은 Anthropic API 키가 필요합니다.
2. **Rate Limiting**: 네이버 API는 요청 제한이 있으므로 너무 많은 요청을 보내지 마세요.
3. **실행 시간**: `run` 명령은 수집과 분석을 모두 수행하므로 시간이 오래 걸릴 수 있습니다.
4. **데이터베이스**: 작업 결과는 `data/blog_agent.db`에 SQLite로 저장됩니다.

## 트러블슈팅

### ImportError 발생 시

프로젝트 루트 디렉토리에서 실행하세요:

```bash
cd D:\AI프로그램제작\agent\naver-blog-agent
python run.py search "키워드"
```

### API 키 오류 시

`.env` 파일을 확인하거나 명령줄에서 직접 지정하세요:

```bash
python run.py search "키워드" --client-id YOUR_ID --client-secret YOUR_SECRET
```

### 데이터베이스 오류 시

data 디렉토리 권한 확인:

```bash
mkdir -p data
chmod 755 data
```
