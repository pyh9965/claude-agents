/**
 * 네이버 블로그 콘텐츠 자동 생성 멀티 에이전트 시스템
 *
 * @packageDocumentation
 */

// 타입 내보내기
export * from './types/index.js';

// 에이전트 내보내기
export {
  // 기본 에이전트
  BaseAgent,
  type AgentOptions,
  createAgentConfig,
  // 기획자
  PlannerAgent,
  getPlannerAgent,
  type PlannerResult,
  // 리서처
  ResearcherAgent,
  getResearcherAgent,
  type ResearcherResult,
  // 작가
  BaseWriterAgent,
  type WriterResult,
  InfoWriterAgent,
  getInfoWriterAgent,
  MarketingWriterAgent,
  getMarketingWriterAgent,
  ReviewWriterAgent,
  getReviewWriterAgent,
  FoodWriterAgent,
  getFoodWriterAgent,
  getWriterAgent,
  WRITER_NAMES,
  // 편집자
  EditorAgent,
  getEditorAgent,
  type EditorResult,
  // SEO 전문가
  SEOExpertAgent,
  getSEOExpertAgent,
  type SEOExpertResult,
  // 팀
  createAgentTeam,
  type AgentTeamInstance,
  AGENT_NAMES,
  getWriterRole,
  getAgentName,
  getWriterName,
} from './agents/index.js';

// 워크플로우 내보내기
export {
  // 오케스트레이터
  WorkflowOrchestrator,
  generateBlogContent,
  type OrchestratorOptions,
  // 파이프라인
  WORKFLOW_STAGES,
  DEFAULT_WORKFLOW_CONFIG,
  NAVER_BLOG_PIPELINE,
  selectWriterForContentType,
  validatePipeline,
  createInitialContext,
  // 병렬 실행
  ParallelExecutor,
  runParallel,
  withTimeout,
  withRetry,
} from './workflow/index.js';

// 서비스 내보내기
export {
  // 웹 검색
  WebSearchService,
  getWebSearchService,
  type SearchResultItem,
  type SearchResult,
  type SearchOptions,
  // 맞춤법 검사
  SpellCheckerService,
  getSpellCheckerService,
  checkSpelling,
  autoCorrectSpelling,
  type SpellingError,
  type SpellCheckResult,
  // 네이버 API
  NaverAPIService,
  getNaverAPIService,
  type NaverBlogItem,
  type NaverNewsItem,
  type SearchParams,
} from './services/index.js';

// 포맷터 내보내기
export {
  // 네이버 HTML
  formatToNaverHtml,
  markdownToNaverHtml,
  createNaverBlogTemplate,
  createCopyableHtml,
  type NaverHtmlOptions,
  // 마크다운
  formatToMarkdown,
  normalizeMarkdown,
  getMarkdownStats,
  type MarkdownOptions,
  // JSON
  formatToJSON,
  serializeJSON,
  jsonToMarkdown,
  createMetadataJson,
  type JsonOptions,
} from './formatters/index.js';

// 유틸리티 내보내기
export {
  // 설정
  getConfig,
  getModelId,
  getAgentModel,
  getOutputPath,
  type AppConfig,
  type ModelConfig,
  MODEL_IDS,
  // 로거
  createLogger,
  createAgentLogger,
  logger,
  type Logger,
  // 프롬프트
  loadPrompt,
  interpolatePrompt,
  clearPromptCache,
  COMMON_INSTRUCTIONS,
  CONTENT_TYPE_GUIDELINES,
  NAVER_BLOG_GUIDELINES,
} from './utils/index.js';

/**
 * 간편 사용을 위한 메인 함수
 *
 * @example
 * ```typescript
 * import { createBlogContent } from 'naver-blog-agents';
 *
 * const result = await createBlogContent({
 *   topic: '강남 맛집 추천',
 *   type: 'food',
 *   keywords: ['강남역', '데이트', '맛집'],
 * });
 *
 * if (result.success) {
 *   console.log(result.content.formats.naverHtml);
 * }
 * ```
 */
export async function createBlogContent(
  request: import('./types/index.js').ContentRequest,
  options?: import('./workflow/index.js').OrchestratorOptions
): Promise<import('./types/index.js').WorkflowResult> {
  const { generateBlogContent } = await import('./workflow/index.js');
  return generateBlogContent(request, options);
}

// 기본 내보내기
export default createBlogContent;
