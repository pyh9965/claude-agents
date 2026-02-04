# PRD: 글또 v1.4 - 이미지 에이전트 통합

## 📋 개요

| 항목 | 내용 |
|------|------|
| **버전** | v1.4 |
| **코드명** | Geulto + Vision |
| **목표** | 글또 워크플로우에 blog-image-agent 통합으로 완전 자동화된 이미지 포함 블로그 생성 |
| **예상 기간** | 3-5일 |
| **담당** | Claude Opus 4.5 |

---

## 🎯 목표 (Goals)

### Primary Goal
글또가 생성한 블로그 콘텐츠에 자동으로 이미지를 수집/생성하여 삽입하는 end-to-end 자동화 시스템 구축

### Success Metrics
- [ ] CLI에서 `--with-images` 옵션으로 이미지 포함 콘텐츠 생성
- [ ] 콘텐츠 유형별 적절한 이미지 소스 자동 선택
- [ ] 이미지 수집 성공률 90% 이상
- [ ] 전체 워크플로우 소요 시간 5분 이내

---

## 🏗️ 현재 아키텍처 (As-Is)

### 글또 (TypeScript)
```
Planning → Research → Writing → Editing → SEO → Formatting
(민준)     (수빈)    (작가)    (서연)   (준서)   (HTML/MD/JSON)
```

### blog-image-agent (Python)
```
Analyze → Collect (hybrid) → Validate → Optimize → Place → Insert
                ↓
    [Google Places → Stock → AI Generation]
```

### 문제점
1. 두 시스템이 독립적으로 운영됨
2. 글또 출력물에 이미지가 없음 (placeholder만 존재)
3. 사용자가 수동으로 이미지를 추가해야 함

---

## 🚀 목표 아키텍처 (To-Be)

### 통합 워크플로우
```
┌─────────────────────────── 글또 v1.4 ───────────────────────────┐
│                                                                   │
│  Planning → Research → Writing → Editing → SEO → [IMAGE] → Format│
│  (민준)     (수빈)    (작가)    (서연)   (준서)   (이미지)         │
│                                                                   │
│                                    ↓                              │
│                         ┌─────────────────────┐                   │
│                         │ ImageOrchestrator   │                   │
│                         │ (Python subprocess) │                   │
│                         └─────────────────────┘                   │
│                                    ↓                              │
│               ┌────────────────────┴────────────────────┐         │
│               ↓                    ↓                    ↓         │
│         [Google Places]      [Stock API]        [Nanobanana AI]   │
│         (맛집/여행)          (일반/리뷰)         (Fallback)        │
│                                    ↓                              │
│                         ┌─────────────────────┐                   │
│                         │  Output: HTML+이미지 │                   │
│                         └─────────────────────┘                   │
└───────────────────────────────────────────────────────────────────┘
```

---

## 📦 구현 범위 (Scope)

### In Scope ✅

#### 1. TypeScript ↔ Python 브릿지
- `src/image/bridge.ts`: Python subprocess 실행 모듈
- 비동기 이미지 수집 지원
- 에러 핸들링 및 타임아웃 처리

#### 2. 새로운 워크플로우 스테이지
- `src/workflow/stages/image-collection.ts`
- Formatting 전에 Image Collection 스테이지 추가
- 콘텐츠 유형별 이미지 전략 분기

#### 3. CLI 옵션 확장
```bash
# 기본 (이미지 없음)
npm run cli -- generate -t "주제" -T info

# 이미지 포함 (새로운 기능)
npm run cli -- generate -t "주제" -T food --with-images

# 이미지 옵션 세부 설정
npm run cli -- generate -t "주제" -T travel \
  --with-images \
  --image-source google,stock \
  --max-images 10
```

#### 4. 콘텐츠 유형별 이미지 전략
| 유형 | 우선 소스 | 이미지 수 | 특징 |
|------|----------|----------|------|
| food | Google Places | 5-8 | 실제 음식/매장 사진 |
| travel | Google Places | 8-12 | 실제 장소 사진 |
| review | Stock + AI | 3-5 | 제품 이미지 |
| tech | Stock | 2-4 | 제품 사진 |
| info | AI (Infographic) | 2-4 | 정보 요약 카드 |
| marketing | Stock + AI | 3-5 | 브랜드 이미지 |
| lifestyle | Stock | 4-6 | 분위기 사진 |
| parenting | Stock | 3-5 | 육아 관련 이미지 |

#### 5. 출력 포맷 확장
```
output/{topic}-{date}/
├── content.html          # 이미지 포함 HTML
├── content.md            # 이미지 마크다운
├── content.json          # 구조화된 데이터
├── metadata.json         # 메타데이터
├── images/               # 수집된 이미지
│   ├── thumbnail.webp
│   ├── section-1.webp
│   ├── section-2.webp
│   └── ...
└── image_map.json        # 이미지 배치 정보
```

### Out of Scope ❌
- 네이버 블로그 직접 업로드 (별도 기능)
- 동영상 수집/생성
- 유료 스톡 이미지 API (Getty, Shutterstock)
- 이미지 수동 편집 기능

---

## 📁 파일 구조 변경

### 신규 파일
```
src/
├── image/
│   ├── index.ts              # 모듈 exports
│   ├── bridge.ts             # Python subprocess 브릿지
│   ├── config.ts             # 이미지 설정 타입
│   └── strategy.ts           # 콘텐츠별 이미지 전략
├── workflow/
│   └── stages/
│       └── image-collection.ts  # 이미지 수집 스테이지
└── types/
    └── image.ts              # 이미지 관련 타입
```

### 수정 파일
```
src/
├── cli.ts                    # --with-images 옵션 추가
├── workflow/
│   ├── orchestrator.ts       # 이미지 스테이지 추가
│   └── pipeline.ts           # 파이프라인 수정
└── formatters/
    ├── html-formatter.ts     # 이미지 HTML 처리
    └── md-formatter.ts       # 이미지 마크다운 처리
```

---

## 🔧 기술 상세

### 1. Python 브릿지 (`src/image/bridge.ts`)

```typescript
interface ImageBridgeConfig {
  pythonPath: string;           // Python 실행 경로
  scriptPath: string;           // blog-image-agent 경로
  timeout: number;              // 타임아웃 (ms)
  maxRetries: number;           // 재시도 횟수
}

interface ImageCollectionRequest {
  htmlContent: string;          // 글또가 생성한 HTML
  contentType: ContentType;     // food, travel, etc.
  outputDir: string;            // 출력 디렉토리
  options: {
    maxImages: number;
    sources: ('google' | 'stock' | 'ai')[];
    quality: number;            // 1-100
    convertToWebp: boolean;
  };
}

interface ImageCollectionResult {
  success: boolean;
  htmlWithImages: string;       // 이미지 삽입된 HTML
  imageMap: ImageMap;           // 이미지 배치 정보
  statistics: {
    total: number;
    bySource: Record<string, number>;
    failures: number;
    executionTime: number;
  };
  errors: string[];
}

class ImageBridge {
  async collectImages(request: ImageCollectionRequest): Promise<ImageCollectionResult>;
  async close(): Promise<void>;
}
```

### 2. 이미지 전략 (`src/image/strategy.ts`)

```typescript
const IMAGE_STRATEGIES: Record<ContentType, ImageStrategy> = {
  food: {
    sources: ['google', 'stock', 'ai'],
    minImages: 5,
    maxImages: 8,
    preferReal: true,
    entityExtraction: true,      // 음식명, 식당명 추출
    thumbnailType: 'food_photo',
  },
  travel: {
    sources: ['google', 'stock', 'ai'],
    minImages: 8,
    maxImages: 12,
    preferReal: true,
    entityExtraction: true,      // 장소명 추출
    thumbnailType: 'banner',
  },
  info: {
    sources: ['ai', 'stock'],
    minImages: 2,
    maxImages: 4,
    preferReal: false,
    entityExtraction: false,
    thumbnailType: 'infographic',
  },
  // ... 기타 유형
};
```

### 3. 워크플로우 스테이지 (`src/workflow/stages/image-collection.ts`)

```typescript
class ImageCollectionStage implements WorkflowStage {
  name = 'image-collection';

  async execute(context: WorkflowContext): Promise<StageResult> {
    // 1. 이미지 수집 필요 여부 확인
    if (!context.options.withImages) {
      return { success: true, skipped: true };
    }

    // 2. 콘텐츠 유형별 전략 선택
    const strategy = getImageStrategy(context.contentType);

    // 3. Python 브릿지로 이미지 수집
    const result = await this.bridge.collectImages({
      htmlContent: context.content.html,
      contentType: context.contentType,
      outputDir: context.outputDir,
      options: {
        maxImages: strategy.maxImages,
        sources: strategy.sources,
        quality: 85,
        convertToWebp: true,
      },
    });

    // 4. 결과 반영
    context.content.html = result.htmlWithImages;
    context.imageMap = result.imageMap;

    return {
      success: result.success,
      statistics: result.statistics,
    };
  }
}
```

---

## 🔄 실행 흐름

### CLI 실행 예시
```bash
npm run cli -- generate \
  -t "서울역 주변 직장인 점심 맛집 추천 5곳" \
  -T food \
  --with-images \
  --verbose
```

### 실행 로그 (예상)
```
🚀 글또가 콘텐츠 생성을 시작합니다

📋 요청 정보:
   주제: 서울역 주변 직장인 점심 맛집 추천 5곳
   유형: food
   이미지: 활성화

▶️ [Stage: planning] 시작
📋 [Planner] 기획 완료: "서울역 점심 맛집 베스트 5"
✅ [Stage: planning] 완료 (31.2s)

▶️ [Stage: research] 시작
🔍 [Researcher] 5개 팩트 수집 완료
✅ [Stage: research] 완료 (42.1s)

▶️ [Stage: writing] 시작
🍽️ [Food-writer] 하린 작가 콘텐츠 작성 완료 (4,385자)
✅ [Stage: writing] 완료 (55.3s)

▶️ [Stage: editing] 시작
✏️ [Editor] 8개 수정 사항 반영
✅ [Stage: editing] 완료 (46.8s)

▶️ [Stage: seo] 시작
🎯 [SEO] 점수 92/100
✅ [Stage: seo] 완료 (11.5s)

▶️ [Stage: image-collection] 시작        ← 새로운 스테이지
🖼️ [Image] 이미지 전략: food (Google → Stock → AI)
🖼️ [Image] 콘텐츠 분석 중...
🖼️ [Image] 6개 이미지 요구사항 추출
🖼️ [Image] Google Places에서 "공일부엌" 검색...
🖼️ [Image] ✓ Google에서 이미지 수집 성공
🖼️ [Image] Unsplash에서 "korean food" 검색...
🖼️ [Image] ✓ Stock에서 이미지 수집 성공
🖼️ [Image] 이미지 최적화 중...
🖼️ [Image] HTML에 이미지 삽입 완료
✅ [Stage: image-collection] 완료 (48.2s)
   - 총 이미지: 6개
   - 소스별: google(3), stock(2), ai(1)
   - 실패: 0개

▶️ [Stage: formatting] 시작
✅ [Stage: formatting] 완료 (0.1s)

✅ 콘텐츠 생성 완료!
   소요 시간: 235.20초 (약 4분)
   글자 수: 4,327자
   이미지: 6개

📁 저장 위치: ./output/서울역-점심-맛집-2026-01-31/
   - content.html (이미지 포함)
   - content.md
   - content.json
   - images/ (6개 파일)
```

---

## 📊 API/환경변수

### 필수 API 키
```env
# 글또 기존
GEMINI_API_KEY=your_gemini_key

# 이미지 에이전트 (최소 1개 필요)
GOOGLE_API_KEY=your_google_key      # Nanobanana AI 생성
UNSPLASH_ACCESS_KEY=your_unsplash   # 스톡 이미지
PEXELS_API_KEY=your_pexels          # 스톡 이미지 백업
```

### 선택 API 키
```env
GOOGLE_PLACES_API_KEY=your_places   # 실제 장소 사진
```

---

## 🧪 테스트 계획

### Unit Tests
- [ ] `ImageBridge.collectImages()` 정상 동작
- [ ] 콘텐츠 유형별 전략 선택 정확성
- [ ] Python 프로세스 타임아웃 처리
- [ ] 에러 발생 시 graceful degradation

### Integration Tests
- [ ] 전체 워크플로우 (글 생성 → 이미지 수집)
- [ ] 각 콘텐츠 유형별 테스트
- [ ] 이미지 없이도 정상 동작 (`--with-images` 없을 때)

### E2E Tests
- [ ] CLI에서 `--with-images` 옵션 테스트
- [ ] 출력 디렉토리 구조 검증
- [ ] 이미지 파일 품질 검증

---

## 🚧 리스크 및 대응

| 리스크 | 영향도 | 대응 방안 |
|--------|--------|----------|
| Python 환경 미설치 | 높음 | 에러 메시지로 설치 안내, 이미지 스킵 옵션 |
| API 키 미설정 | 중간 | Fallback to AI 생성 또는 placeholder |
| 이미지 수집 타임아웃 | 중간 | 부분 성공 허용, 수집된 것만 삽입 |
| Python 버전 호환성 | 낮음 | Python 3.9+ 요구, 버전 체크 |

---

## 📅 구현 순서

### Phase 1: 브릿지 구축 (1일)
1. `src/image/bridge.ts` 구현
2. Python subprocess 실행 테스트
3. 에러 핸들링 및 타임아웃

### Phase 2: 워크플로우 통합 (1일)
1. `src/image/strategy.ts` 구현
2. `src/workflow/stages/image-collection.ts` 구현
3. Orchestrator에 스테이지 추가

### Phase 3: CLI 확장 (0.5일)
1. `--with-images` 옵션 추가
2. `--image-source`, `--max-images` 옵션
3. 도움말 업데이트

### Phase 4: 포맷터 수정 (0.5일)
1. HTML 포맷터에 이미지 처리 추가
2. Markdown 포맷터에 이미지 경로 처리
3. JSON 포맷터에 이미지 메타데이터 추가

### Phase 5: 테스트 및 문서화 (1일)
1. 단위 테스트 작성
2. 통합 테스트 실행
3. README 및 사용법 문서 업데이트

---

## ✅ 완료 조건 (Definition of Done)

- [ ] `npm run cli -- generate -T food --with-images` 정상 실행
- [ ] 8가지 콘텐츠 유형 모두 이미지 전략 적용
- [ ] 이미지 수집 성공률 90% 이상
- [ ] 전체 워크플로우 5분 이내 완료
- [ ] TypeScript 빌드 성공
- [ ] 테스트 통과
- [ ] 문서 업데이트

---

## 📚 참고 자료

- [blog-image-agent README](../blog-image-agent/README.md)
- [글또 CLAUDE.md](../CLAUDE.md)
- [워크플로우 아키텍처](../docs/IMPROVEMENT_REPORT.md)
