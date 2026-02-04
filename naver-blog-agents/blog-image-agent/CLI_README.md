# Blog Image Agent - CLI 사용 가이드

Blog Image Collection Agent의 명령줄 인터페이스(CLI) 사용법입니다.

## 설치

```bash
# 의존성 설치
pip install -r requirements.txt

# 개발 모드 설치 (권장)
pip install -e .
```

설치 후 `blog-image` 명령어를 전역에서 사용할 수 있습니다.

## 환경 설정

`.env` 파일에 API 키를 설정하세요:

```bash
# .env.example을 복사
cp .env.example .env

# API 키 설정
GOOGLE_API_KEY=your_google_api_key_here
UNSPLASH_ACCESS_KEY=your_unsplash_access_key_here
PEXELS_API_KEY=your_pexels_api_key_here
```

## 명령어

### 1. config - 설정 확인

현재 API 키 상태와 설정을 확인합니다.

```bash
blog-image config
```

**출력 예시:**
```
=== Blog Image Agent 설정 ===

API 키 상태:
  [OK] Google Gemini / Places: AIzaSyBX...abc123
  [OK] Unsplash: ABCD1234...xyz789
  [X] Pexels: 미설정

설정 파일: .env
캐시 디렉토리: .cache/images
```

### 2. collect - 이미지 수집 및 배치

블로그 콘텐츠를 분석하여 자동으로 이미지를 수집하고 배치합니다.

```bash
blog-image collect <콘텐츠_파일> [옵션]
```

**옵션:**
- `-o, --output <디렉토리>` - 출력 디렉토리 (기본: output)
- `-m, --model <모델>` - AI 분석 모델 선택
  - `gemini-2.0-flash` (기본, 빠름)
  - `gemini-2.0-pro` (고품질)
  - `claude` (Claude 사용)
- `-p, --priority <우선순위>` - 이미지 수집 우선순위
  - `real` (기본) - 실제 사진 → 스톡 → AI
  - `stock` - 스톡 이미지 → 실제 → AI
  - `ai` - AI 생성 → 스톡 → 실제
- `--no-optimize` - 이미지 최적화 건너뛰기

**예시:**
```bash
# 기본 실행
blog-image collect content.html

# 출력 디렉토리 지정
blog-image collect content.html -o ./my_output

# AI 생성 우선
blog-image collect content.html -p ai

# 고품질 모델 사용, 최적화 안 함
blog-image collect content.html -m gemini-2.0-pro --no-optimize
```

**출력:**
```
[*] 콘텐츠 파일: content.html
[*] 출력 디렉토리: output
[*] AI 모델: gemini-2.0-flash
[*] 수집 우선순위: real

[Pipeline] 콘텐츠 분석 중...
[Pipeline] 5개 이미지 요구사항 추출
[Pipeline] 이미지 수집 중...
[Pipeline] ✓ google에서 이미지 수집 성공
[Pipeline] 5개 이미지 수집 완료
[Pipeline] 이미지 최적화 중...
[Pipeline] 이미지 배치 계산 중...
[Pipeline] HTML에 이미지 삽입 중...

[OK] 완료!
  - 수집된 이미지: 5개
  - 소스별: {'google': 3, 'stock': 2}
  - 소요 시간: 12.3초
  - 출력 파일: output/content_with_images.html
```

### 3. generate - AI 이미지 생성

나노바나나 3.0 Pro로 단일 이미지를 생성합니다.

```bash
blog-image generate -p "<프롬프트>" [옵션]
```

**옵션:**
- `-p, --prompt <텍스트>` - 이미지 생성 프롬프트 (필수)
- `-t, --type <유형>` - 이미지 유형
  - `thumbnail` (기본) - 썸네일 (16:9)
  - `banner` - 배너 (16:9)
  - `food_photo` - 음식 사진 (4:3)
  - `infographic` - 인포그래픽 (1:1)
- `-s, --style <스타일>` - 스타일 프리셋
  - `default` (기본)
  - `food` - 음식
  - `travel` - 여행
  - `lifestyle` - 라이프스타일
  - `tech` - 기술
- `-o, --output <파일명>` - 출력 파일 (기본: generated_image.png)

**예시:**
```bash
# 기본 썸네일 생성
blog-image generate -p "맛있는 김치찌개"

# 음식 사진 스타일로 생성
blog-image generate -p "김치찌개" -t food_photo -s food

# 여행 블로그 썸네일
blog-image generate -p "서울 여행" -t thumbnail -s travel -o seoul_thumb.png

# 인포그래픽 생성
blog-image generate -p "블로그 작성 팁" -t infographic -s tech
```

**출력:**
```
[*] 프롬프트: 맛있는 김치찌개
[*] 이미지 유형: food_photo
[*] 스타일: food

[OK] 이미지 생성 완료: generated_image.png
```

### 4. analyze - 콘텐츠 분석

콘텐츠를 분석하여 이미지 요구사항을 JSON으로 추출합니다.

```bash
blog-image analyze <콘텐츠_파일> [옵션]
```

**옵션:**
- `-o, --output <파일>` - 출력 JSON 파일 (기본: requirements.json)
- `-m, --model <모델>` - AI 분석 모델 (기본: gemini-2.0-flash)

**예시:**
```bash
# 기본 분석
blog-image analyze content.html

# 출력 파일 지정
blog-image analyze content.html -o my_requirements.json

# 고품질 모델 사용
blog-image analyze content.html -m gemini-2.0-pro
```

**출력:**
```
[*] 콘텐츠 분석 중: content.html

[OK] 5개 이미지 요구사항 추출
  - 저장 위치: requirements.json
  1. [thumbnail] 블로그, 포스팅, 작성
  2. [food_photo] 김치찌개, 한식, 맛집
  3. [content] 서울, 여행, 관광지
  4. [banner] 배너, 헤더
  5. [infographic] 통계, 데이터, 분석
```

**requirements.json 예시:**
```json
[
  {
    "id": "req_001",
    "type": "thumbnail",
    "keywords": ["블로그", "포스팅", "작성"],
    "entity_name": null,
    "preferred_source": "stock",
    "prompt": "블로그 포스팅 작성 썸네일"
  },
  {
    "id": "req_002",
    "type": "food_photo",
    "keywords": ["김치찌개", "한식", "맛집"],
    "entity_name": "맛있는집",
    "entity_location": "서울 강남구",
    "preferred_source": "real",
    "prompt": "맛있는집의 김치찌개 사진"
  }
]
```

### 5. insert - 이미지 삽입

준비된 이미지들을 콘텐츠에 자동으로 삽입합니다.

```bash
blog-image insert <콘텐츠_파일> -i <이미지_디렉토리> [옵션]
```

**옵션:**
- `-i, --images <디렉토리>` - 이미지 디렉토리 (필수)
- `-o, --output <파일>` - 출력 HTML 파일 (기본: content_with_images.html)

**예시:**
```bash
# 기본 삽입
blog-image insert content.html -i ./images

# 출력 파일 지정
blog-image insert content.html -i ./my_images -o result.html
```

**출력:**
```
[*] 콘텐츠: content.html
[*] 이미지 디렉토리: ./images

[OK] 5개 이미지 삽입 완료
  - 출력 파일: content_with_images.html
```

### 6. pipeline - 전체 파이프라인

전체 파이프라인을 한 번에 실행합니다 (분석 → 수집 → 최적화 → 삽입).

```bash
blog-image pipeline <콘텐츠_파일> [옵션]
```

**옵션:**
- `-o, --output <디렉토리>` - 출력 디렉토리 (기본: output)

**예시:**
```bash
blog-image pipeline content.html
blog-image pipeline post.md -o ./final_output
```

이 명령어는 내부적으로 `collect` 명령어와 동일하게 작동합니다.

## 워크플로우 예시

### 시나리오 1: 전체 자동화

```bash
# 1. 설정 확인
blog-image config

# 2. 전체 파이프라인 실행
blog-image pipeline my_blog_post.html -o ./output

# 결과: output/content_with_images.html
```

### 시나리오 2: 단계별 실행

```bash
# 1. 분석만 먼저
blog-image analyze my_post.html -o reqs.json

# 2. 요구사항 확인 후 수집
blog-image collect my_post.html -o ./images

# 3. 필요시 추가 AI 이미지 생성
blog-image generate -p "썸네일 이미지" -o custom_thumb.png

# 4. 수동으로 이미지 배치
blog-image insert my_post.html -i ./images/images -o final.html
```

### 시나리오 3: AI 우선 생성

```bash
# AI 생성 우선 모드
blog-image collect content.html -p ai --no-optimize
```

## 출력 구조

`collect` 또는 `pipeline` 실행 후:

```
output/
├── images/                      # 수집/생성된 이미지들
│   ├── req_001_google.webp
│   ├── req_002_stock.webp
│   └── req_003_nanobanana.webp
├── content_with_images.html     # 이미지가 삽입된 최종 HTML
└── image_map.json              # 메타데이터 (디버깅용)
```

## 문제 해결

### API 키가 인식되지 않을 때

```bash
# 1. .env 파일 확인
cat .env

# 2. 환경변수 직접 설정
export GOOGLE_API_KEY="your_key_here"

# 3. 설정 확인
blog-image config
```

### 이미지 수집 실패 시

```bash
# 1. 우선순위 변경
blog-image collect content.html -p stock

# 2. AI만 사용
blog-image collect content.html -p ai

# 3. 최적화 비활성화 (속도 향상)
blog-image collect content.html --no-optimize
```

### Python 모듈 경로 오류

```bash
# 개발 모드로 재설치
pip install -e .

# 또는 직접 실행
python -m cli.main --help
```

## 고급 사용법

### 커스텀 프롬프트 템플릿

AI 이미지 생성 시 더 구체적인 프롬프트 사용:

```bash
blog-image generate -p "한국 전통 한옥 마을, 서울 북촌, 봄날 햇살, 4K 고화질, 시네마틱 라이팅" \
  -t thumbnail -s travel -o hanok.png
```

### 배치 처리

여러 파일 처리:

```bash
for file in posts/*.html; do
  blog-image pipeline "$file" -o "output/$(basename $file .html)"
done
```

### JSON 요구사항 수정

```bash
# 1. 분석
blog-image analyze post.html -o reqs.json

# 2. reqs.json 수동 편집

# 3. 편집된 요구사항으로 수집
# (현재는 collect가 콘텐츠 재분석하므로, 향후 기능으로 추가 예정)
```

## 라이선스

MIT License

## 기여

버그 리포트나 기능 제안은 GitHub Issues로 제출해주세요.
