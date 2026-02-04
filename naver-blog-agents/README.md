# 네이버 블로그 자동화 에이전트 팀

TypeScript/Node.js 기반의 네이버 블로그 콘텐츠 자동 생성 멀티 에이전트 시스템입니다.

## 특징

- **8명의 전문 에이전트**: 각자의 페르소나와 전문성을 가진 AI 팀
- **4가지 콘텐츠 유형**: 정보성, 마케팅, 제품리뷰, 맛집리뷰
- **병렬 처리**: 효율적인 워크플로우 실행
- **다양한 출력 포맷**: 네이버 HTML, 마크다운, JSON

## 에이전트 팀 소개

| 이름 | 역할 | 나이 | 특징 |
|------|------|------|------|
| 📋 민준 팀장 | 기획자 | 38세 | 차분하고 전략적인 베테랑 |
| 🔍 수빈 | 리서처 | 29세 | 꼼꼼한 팩트체커 |
| 📚 현우 선생님 | 정보성 작가 | 45세 | 쉬운 설명의 달인 |
| ✨ 지은 언니 | 마케팅 작가 | 33세 | 감성 스토리텔러 |
| ⭐ 태현 | 제품리뷰 작가 | 27세 | 솔직한 장단점 분석 |
| 🍽️ 하린 | 맛집리뷰 작가 | 31세 | 오감 묘사 전문가 |
| ✏️ 서연 실장 | 편집자 | 40세 | 완벽주의 디테일 전문가 |
| 🎯 준서 | SEO 전문가 | 35세 | 데이터 기반 키워드 마스터 |

## 설치

```bash
# 저장소 클론
cd naver-blog-agents

# 의존성 설치
npm install

# 환경 변수 설정
cp .env.example .env
# .env 파일을 열어 GEMINI_API_KEY 설정
```

## 환경 변수

```env
# 필수
GEMINI_API_KEY=your_gemini_api_key_here

# 선택 (네이버 API 사용 시)
NAVER_CLIENT_ID=your_naver_client_id
NAVER_CLIENT_SECRET=your_naver_client_secret

# 출력 설정
OUTPUT_DIR=./output
DEFAULT_CONTENT_TYPE=info

# 로깅
LOG_LEVEL=info
```

## 사용법

### CLI 사용

```bash
# 정보성 콘텐츠 생성
npm run cli -- generate -t "노트북 구매 가이드" -T info

# 맛집 리뷰 생성
npm run cli -- generate -t "강남역 맛집 추천" -T food -k "강남역,데이트,점심"

# 제품 리뷰 생성
npm run cli -- generate -t "갤럭시 S25 울트라 리뷰" -T review

# 마케팅 콘텐츠 생성
npm run cli -- generate -t "새로운 스킨케어 브랜드" -T marketing -a "20-30대 여성"

# 팀 정보 보기
npm run cli -- team

# 콘텐츠 유형 안내
npm run cli -- types
```

### 프로그래밍 방식

```typescript
import { createBlogContent } from 'naver-blog-agents';

const result = await createBlogContent({
  topic: '강남 맛집 추천',
  type: 'food',
  keywords: ['강남역', '데이트', '맛집'],
  targetAudience: '20-30대 직장인',
  tone: 'friendly',
});

if (result.success) {
  // 네이버 HTML 형식
  console.log(result.content.formats.naverHtml);

  // 마크다운 형식
  console.log(result.content.formats.markdown);

  // JSON 형식
  console.log(result.content.formats.json);
}
```

## 이미지 자동 수집

글또 v1.4부터 블로그 콘텐츠에 이미지를 자동으로 수집/삽입할 수 있습니다.

### 사용법

```bash
# 이미지 포함 콘텐츠 생성
npm run cli -- generate -t "서울역 맛집 추천" -T food --with-images

# 이미지 소스 및 개수 설정
npm run cli -- generate -t "제주도 여행" -T travel \
  --with-images \
  --image-source google,stock \
  --max-images 10
```

### 이미지 소스

| 소스 | 설명 | 용도 |
|------|------|------|
| google | Google Places API | 맛집, 여행지 실제 사진 |
| stock | Unsplash/Pexels | 무료 스톡 이미지 |
| ai | Nanobanana (Imagen 3) | AI 생성 이미지 |

### 콘텐츠 유형별 기본 전략

| 유형 | 기본 소스 | 이미지 수 |
|------|----------|----------|
| food | google → stock → ai | 5-8개 |
| travel | google → stock → ai | 8-12개 |
| review | stock → ai → google | 3-5개 |
| info | ai → stock | 2-4개 |

### 필요 API 키

```env
# 필수 (AI 이미지 생성용)
GOOGLE_API_KEY=your_key

# 권장 (스톡 이미지)
UNSPLASH_ACCESS_KEY=your_key
PEXELS_API_KEY=your_key
```

## 워크플로우

```
[입력] → [기획] → [리서치] → [작성] → [편집] → [SEO] → [포맷팅] → [출력]
         민준     수빈       작가     서연     준서
```

1. **기획 (Planning)**: 민준 팀장이 콘텐츠 전략 수립
2. **리서치 (Research)**: 수빈이 관련 정보 수집 및 분석
3. **작성 (Writing)**: 콘텐츠 유형에 맞는 작가가 초안 작성
4. **편집 (Editing)**: 서연 실장이 맞춤법, 톤 일관성 검토
5. **SEO (Optimization)**: 준서가 검색 최적화 적용
6. **포맷팅 (Formatting)**: 네이버 HTML, 마크다운, JSON 출력

## 콘텐츠 유형

| 유형 | 코드 | 담당 작가 | 설명 |
|------|------|----------|------|
| 정보성 | `info` | 현우 선생님 | How-to, 가이드, 설명 |
| 마케팅 | `marketing` | 지은 언니 | 브랜드, 협찬, 프로모션 |
| 제품리뷰 | `review` | 태현 | IT, 가전, 서비스 리뷰 |
| 맛집리뷰 | `food` | 하린 | 맛집, 카페, 음식 리뷰 |

## 출력 파일

콘텐츠 생성 후 `output/` 디렉토리에 다음 파일이 생성됩니다:

```
output/강남-맛집-추천-2025-01-30/
├── content.html      # 네이버 스마트에디터용 HTML
├── content.md        # 마크다운 버전
├── content.json      # 구조화된 JSON
└── metadata.json     # 생성 메타데이터
```

## 개발

```bash
# 개발 모드 실행
npm run dev

# 빌드
npm run build

# 테스트
npm test

# 린트
npm run lint
```

## 프로젝트 구조

```
naver-blog-agents/
├── src/
│   ├── agents/           # 에이전트 구현
│   │   ├── planner.ts
│   │   ├── researcher.ts
│   │   ├── writers/
│   │   ├── editor.ts
│   │   └── seo-expert.ts
│   ├── workflow/         # 워크플로우 관리
│   ├── formatters/       # 출력 포맷터
│   ├── services/         # 외부 서비스
│   ├── utils/            # 유틸리티
│   ├── types/            # 타입 정의
│   ├── cli.ts            # CLI 인터페이스
│   └── index.ts          # 메인 엔트리포인트
├── prompts/              # 에이전트 프롬프트
├── tests/                # 테스트 코드
└── output/               # 생성된 콘텐츠
```

## 라이선스

MIT License
