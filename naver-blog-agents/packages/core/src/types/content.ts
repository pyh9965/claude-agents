/**
 * 콘텐츠 관련 타입 정의
 */

/** 콘텐츠 유형 */
export type ContentType =
  | 'info'        // 정보성 (현우)
  | 'marketing'   // 마케팅 (지은)
  | 'review'      // 리뷰 (태현)
  | 'food'        // 맛집 (하린)
  | 'travel'      // 여행 (신규)
  | 'tech'        // IT/테크 (신규)
  | 'lifestyle'   // 라이프스타일 (신규)
  | 'parenting';  // 육아 (신규)

/** 콘텐츠 톤 */
export type ContentTone = 'formal' | 'casual' | 'friendly';

/** 콘텐츠 생성 요청 */
export interface ContentRequest {
  /** 주제 */
  topic: string;
  /** 콘텐츠 유형 */
  type: ContentType;
  /** 키워드 목록 */
  keywords?: string[];
  /** 타겟 독자층 */
  targetAudience?: string;
  /** 톤 */
  tone?: ContentTone;
  /** 추가 컨텍스트 */
  additionalContext?: string;
  /** 참고 URL 목록 */
  referenceUrls?: string[];
  /** 사용자 제공 자료 */
  userMaterials?: UserMaterial[];
  /** 참조 데이터 (팩트체크용 JSON 데이터) */
  referenceData?: Record<string, unknown>;
}

/** 사용자 제공 자료 */
export interface UserMaterial {
  /** 자료 유형 */
  type: 'text' | 'image' | 'url';
  /** 내용 */
  content: string;
  /** 설명 */
  description?: string;
}

/** 콘텐츠 기획안 */
export interface ContentPlan {
  /** 제목 */
  title: string;
  /** 아웃라인 (목차) */
  outline: OutlineItem[];
  /** 타겟 키워드 */
  targetKeywords: string[];
  /** 배정된 작가 유형 */
  assignedWriter: ContentType;
  /** 예상 글자 수 */
  estimatedLength: number;
  /** 타겟 독자 설명 */
  targetAudienceDescription: string;
  /** 핵심 메시지 */
  keyMessage: string;
  /** 참고사항 */
  notes?: string;
}

/** 아웃라인 항목 */
export interface OutlineItem {
  /** 소제목 */
  heading: string;
  /** 설명 */
  description: string;
  /** 키포인트 */
  keyPoints: string[];
}

/** 리서치 데이터 */
export interface ResearchData {
  /** 수집된 팩트 */
  facts: Fact[];
  /** 출처 목록 */
  sources: Source[];
  /** 관련 키워드 */
  relatedKeywords: string[];
  /** 경쟁 콘텐츠 분석 */
  competitorAnalysis?: CompetitorAnalysis;
  /** 트렌드 정보 */
  trendInfo?: TrendInfo;
}

/** 검색 소스 유형 (content.ts에서도 사용) */
export type FactSourceType = 'tavily' | 'google' | 'firecrawl' | 'naver' | 'reference' | 'user';

/** 팩트 검증 상태 */
export type FactValidationStatus = 'verified' | 'cross-validated' | 'single-source' | 'unverified';

/** 팩트 정보 */
export interface Fact {
  /** 내용 */
  content: string;
  /** 출처 (레거시, 호환성 유지) */
  source?: string;
  /** 신뢰도 (1-5) */
  reliability: number;
  /** 출처 유형 */
  sourceType?: FactSourceType;
  /** 출처 URL */
  sourceUrl?: string;
  /** 검증 상태 */
  validationStatus?: FactValidationStatus;
  /** 검증에 사용된 출처들 */
  validationSources?: string[];
  /** 추출 시간 */
  extractedAt?: Date;
}

/** 출처 정보 */
export interface Source {
  /** URL */
  url: string;
  /** 제목 */
  title: string;
  /** 발행일 */
  publishedDate?: string;
  /** 발행처 */
  publisher?: string;
  /** 출처 유형 */
  sourceType?: FactSourceType;
  /** 원본 콘텐츠 (추출된 경우) */
  rawContent?: string;
  /** 콘텐츠 해시 (중복 제거용) */
  contentHash?: string;
  /** 관련도 점수 (0-1) */
  relevanceScore?: number;
}

/** 경쟁 콘텐츠 분석 */
export interface CompetitorAnalysis {
  /** 상위 콘텐츠 제목들 */
  topTitles: string[];
  /** 공통 키워드 */
  commonKeywords: string[];
  /** 콘텐츠 갭 */
  contentGaps: string[];
}

/** 트렌드 정보 */
export interface TrendInfo {
  /** 인기 검색어 */
  popularSearches: string[];
  /** 관련 이슈 */
  relatedIssues: string[];
}

/** 초안 콘텐츠 */
export interface DraftContent {
  /** 제목 */
  title: string;
  /** 본문 */
  body: string;
  /** 메타데이터 */
  metadata: DraftMetadata;
}

/** 초안 메타데이터 */
export interface DraftMetadata {
  /** 작가 이름 */
  writer: string;
  /** 콘텐츠 유형 */
  contentType: ContentType;
  /** 생성 시간 */
  createdAt: Date;
  /** 글자 수 */
  wordCount: number;
}

/** 편집된 콘텐츠 */
export interface EditedContent {
  /** 제목 */
  title: string;
  /** 본문 */
  body: string;
  /** 수정 사항 */
  corrections: Correction[];
  /** 편집 노트 */
  editorNotes: string;
}

/** 수정 사항 */
export interface Correction {
  /** 원본 텍스트 */
  original: string;
  /** 수정된 텍스트 */
  corrected: string;
  /** 수정 이유 */
  reason: string;
  /** 수정 유형 */
  type: 'spelling' | 'grammar' | 'style' | 'tone' | 'clarity';
}

/** SEO 최적화 결과 */
export interface SEOOptimization {
  /** SEO 최적화된 제목 */
  seoTitle: string;
  /** 메타 설명 */
  metaDescription: string;
  /** 태그 */
  tags: string[];
  /** 키워드 밀도 분석 */
  keywordDensity: KeywordDensity[];
  /** SEO 점수 (1-100) */
  seoScore: number;
  /** 개선 제안 */
  suggestions: string[];
}

/** 키워드 밀도 */
export interface KeywordDensity {
  /** 키워드 */
  keyword: string;
  /** 등장 횟수 */
  count: number;
  /** 밀도 (%) */
  density: number;
}

/** 최종 콘텐츠 */
export interface FinalContent {
  /** 제목 */
  title: string;
  /** 본문 */
  body: string;
  /** SEO 제목 */
  seoTitle: string;
  /** 메타 설명 */
  metaDescription: string;
  /** 태그 */
  tags: string[];
  /** 포맷별 출력 */
  formats: ContentFormats;
  /** 메타데이터 */
  metadata: FinalMetadata;
}

/** 콘텐츠 포맷 */
export interface ContentFormats {
  /** 네이버 스마트에디터 HTML */
  naverHtml: string;
  /** 마크다운 */
  markdown: string;
  /** JSON 구조 */
  json: ContentJSON;
}

/** JSON 형식 콘텐츠 */
export interface ContentJSON {
  /** 제목 */
  title: string;
  /** 섹션 목록 */
  sections: ContentSection[];
  /** SEO 데이터 */
  seo: {
    title: string;
    description: string;
    tags: string[];
  };
}

/** 콘텐츠 섹션 */
export interface ContentSection {
  /** 섹션 유형 */
  type: 'heading' | 'paragraph' | 'list' | 'quote' | 'image';
  /** 내용 */
  content: string;
  /** 레벨 (heading의 경우) */
  level?: number;
  /** 리스트 항목들 (list의 경우) */
  items?: string[];
}

/** 최종 메타데이터 */
export interface FinalMetadata {
  /** 콘텐츠 유형 */
  contentType: ContentType;
  /** 작가 */
  writer: string;
  /** 생성 시간 */
  createdAt: Date;
  /** 글자 수 */
  wordCount: number;
  /** 예상 읽기 시간 (분) */
  readingTime: number;
  /** SEO 점수 */
  seoScore: number;
  /** 워크플로우 로그 */
  workflowLog: WorkflowLogEntry[];
}

/** 워크플로우 로그 항목 */
export interface WorkflowLogEntry {
  /** 단계 */
  stage: string;
  /** 에이전트 */
  agent: string;
  /** 시작 시간 */
  startedAt: Date;
  /** 완료 시간 */
  completedAt: Date;
  /** 상태 */
  status: 'success' | 'error' | 'skipped';
  /** 메시지 */
  message?: string;
}
