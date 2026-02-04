/**
 * 프롬프트 템플릿 유틸리티
 */

import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import type { AgentRole } from '../types/index.js';

// ESM에서 __dirname 대체
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/** 프롬프트 파일 경로 */
const PROMPTS_DIR = join(__dirname, '../../prompts');

/** 프롬프트 캐시 */
const promptCache = new Map<string, string>();

/** 프롬프트 파일 경로 매핑 */
const PROMPT_PATHS: Record<AgentRole, string> = {
  planner: 'planner.md',
  researcher: 'researcher.md',
  'info-writer': 'writers/info-writer.md',
  'marketing-writer': 'writers/marketing-writer.md',
  'review-writer': 'writers/review-writer.md',
  'food-writer': 'writers/food-writer.md',
  'travel-writer': 'writers/travel-writer.md',
  'tech-writer': 'writers/tech-writer.md',
  'lifestyle-writer': 'writers/lifestyle-writer.md',
  'parenting-writer': 'writers/parenting-writer.md',
  editor: 'editor.md',
  'seo-expert': 'seo-expert.md',
};

/** 프롬프트 파일 로드 */
export function loadPrompt(agentRole: AgentRole): string {
  // 캐시 확인
  if (promptCache.has(agentRole)) {
    return promptCache.get(agentRole)!;
  }

  const relativePath = PROMPT_PATHS[agentRole];
  const fullPath = join(PROMPTS_DIR, relativePath);

  if (!existsSync(fullPath)) {
    throw new Error(`프롬프트 파일을 찾을 수 없습니다: ${fullPath}`);
  }

  const content = readFileSync(fullPath, 'utf-8');
  promptCache.set(agentRole, content);

  return content;
}

/** 프롬프트 캐시 초기화 */
export function clearPromptCache(): void {
  promptCache.clear();
}

/** 템플릿 변수 치환 */
export function interpolatePrompt(
  template: string,
  variables: Record<string, string | number | boolean>
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    if (key in variables) {
      return String(variables[key]);
    }
    return match;
  });
}

/** 공통 지시사항 */
export const COMMON_INSTRUCTIONS = `
## 공통 지시사항

1. **응답 형식**: 항상 JSON 형식으로 응답하세요.
2. **한국어 사용**: 모든 콘텐츠는 자연스러운 한국어로 작성하세요.
3. **페르소나 유지**: 부여받은 캐릭터의 말투와 스타일을 일관되게 유지하세요.
4. **품질 기준**:
   - 맞춤법과 문법 오류 없이 작성
   - 문장 간 자연스러운 연결
   - 적절한 문단 구분
`;

/** 콘텐츠 유형별 가이드라인 */
export const CONTENT_TYPE_GUIDELINES = {
  info: `
## 정보성 콘텐츠 가이드라인

- 정확한 정보 전달이 최우선
- 논리적인 구조와 단계별 설명
- 예시와 비유를 활용한 이해 돕기
- 출처 명시로 신뢰성 확보
- "~입니다", "~합니다" 체 사용
`,

  marketing: `
## 마케팅 콘텐츠 가이드라인

- 감성적 스토리텔링 활용
- 혜택 중심의 메시지 전달
- 자연스러운 CTA(Call-to-Action) 삽입
- 트렌드와 시즈널 키워드 활용
- "~해요", "~거든요" 친근한 말투
`,

  review: `
## 제품리뷰 콘텐츠 가이드라인

- 장단점 균형있게 서술
- 구체적인 스펙과 실사용 경험 비교
- 가성비, 추천 대상 명시
- 비교 제품 언급으로 객관성 확보
- "~더라고요", "~보니까" 경험담 말투
`,

  food: `
## 맛집리뷰 콘텐츠 가이드라인

- 오감을 자극하는 생생한 묘사
- 분위기, 서비스, 가격 정보 포함
- 메뉴 추천과 주의사항 안내
- 방문 팁(주차, 웨이팅 등) 제공
- "~했어요", "~인 것 같아요" 감성적 말투
`,
};

/** 네이버 블로그 최적화 가이드라인 */
export const NAVER_BLOG_GUIDELINES = `
## 네이버 블로그 최적화 가이드라인

### 제목 최적화
- 핵심 키워드를 앞쪽에 배치
- 30자 내외로 간결하게
- 숫자, 특수문자 적절히 활용 (예: "5가지", "BEST")

### 본문 구조
- 서론 (150~200자): 흥미 유발, 키워드 자연스럽게 포함
- 본론: 소제목으로 구분, 각 섹션 300~500자
- 결론 (100~150자): 핵심 요약, 행동 유도

### 키워드 전략
- 메인 키워드: 제목 + 서론 + 결론에 배치
- 서브 키워드: 소제목과 본문에 자연스럽게 분산
- 키워드 밀도: 전체 글자 수의 1~2%

### 가독성
- 문단당 3~4문장
- 중요 포인트는 볼드 처리
- 리스트/번호 목록 적극 활용
- 적절한 줄바꿈으로 시각적 여백 확보

### 태그
- 메인 키워드 포함 필수
- 연관 키워드 5~10개
- 지역명, 브랜드명 등 구체적 태그 포함
`;
