/**
 * 설정 관리 유틸리티
 */

import { config as dotenvConfig } from 'dotenv';
import type { ContentType, ModelType } from '../types/index.js';

// 환경 변수 로드
dotenvConfig();

/** 검색 소스 유형 */
export type SearchSourceType = 'tavily' | 'google' | 'firecrawl' | 'naver';

/** 리서치 설정 */
export interface ResearchConfig {
  /** 리서치 깊이 */
  depth: 'quick' | 'standard' | 'deep';
  /** 할루시네이션 방지 모드 */
  hallucinationMode: 'strict' | 'balanced' | 'permissive';
  /** 활성화된 검색 소스 */
  enabledSources: SearchSourceType[];
  /** 소스당 최대 결과 수 */
  maxResultsPerSource: number;
  /** 교차검증 임계값 (0-1) */
  crossValidationThreshold: number;
}

/** 앱 설정 인터페이스 */
export interface AppConfig {
  /** z.ai API 키 */
  zaiApiKey: string;
  /** 네이버 클라이언트 ID */
  naverClientId?: string;
  /** 네이버 클라이언트 시크릿 */
  naverClientSecret?: string;
  /** Tavily API 키 */
  tavilyApiKey?: string;
  /** Google 검색 API 키 */
  googleSearchApiKey?: string;
  /** Google 검색 엔진 ID */
  googleSearchEngineId?: string;
  /** Firecrawl API 키 */
  firecrawlApiKey?: string;
  /** Jina API 키 */
  jinaApiKey?: string;
  /** 출력 디렉토리 */
  outputDir: string;
  /** 기본 콘텐츠 유형 */
  defaultContentType: ContentType;
  /** 로그 레벨 */
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  /** 모델 설정 */
  models: ModelConfig;
  /** 리서치 설정 */
  researchConfig: ResearchConfig;
}

/** 모델 설정 */
export interface ModelConfig {
  /** 기본 모델 */
  default: ModelType;
  /** 에이전트별 모델 */
  agents: {
    planner: ModelType;
    researcher: ModelType;
    writers: ModelType;
    editor: ModelType;
    seoExpert: ModelType;
  };
}

/** z.ai GLM 모델 ID 매핑 */
export const MODEL_IDS: Record<ModelType, string> = {
  opus: 'GLM-4.7',    // 고성능 모델
  sonnet: 'GLM-4.7',  // 균형 모델
  haiku: 'GLM-4.7',   // 빠른 모델 (GLM-4.7 단일 모델)
};

/** 기본 리서치 설정 */
const defaultResearchConfig: ResearchConfig = {
  depth: 'deep',
  hallucinationMode: 'balanced',
  enabledSources: ['tavily', 'google', 'firecrawl', 'naver'],
  maxResultsPerSource: 10,
  crossValidationThreshold: 0.6,
};

/** 기본 설정 */
const defaultConfig: Omit<AppConfig, 'zaiApiKey'> = {
  outputDir: './output',
  defaultContentType: 'info',
  logLevel: 'info',
  models: {
    default: 'sonnet',
    agents: {
      planner: 'sonnet',
      researcher: 'sonnet',
      writers: 'sonnet',
      editor: 'sonnet',
      seoExpert: 'haiku',
    },
  },
  researchConfig: defaultResearchConfig,
};

/** 환경 변수에서 설정 로드 */
function loadConfig(): AppConfig {
  const zaiApiKey = process.env.ZAI_API_KEY;

  if (!zaiApiKey) {
    throw new Error(
      'ZAI_API_KEY 환경 변수가 설정되지 않았습니다. .env 파일을 확인하세요.'
    );
  }

  // 리서치 설정 로드
  const researchConfig: ResearchConfig = {
    ...defaultResearchConfig,
    depth: (process.env.RESEARCH_DEPTH as ResearchConfig['depth']) || defaultResearchConfig.depth,
    hallucinationMode: (process.env.HALLUCINATION_MODE as ResearchConfig['hallucinationMode']) || defaultResearchConfig.hallucinationMode,
  };

  return {
    ...defaultConfig,
    zaiApiKey,
    naverClientId: process.env.NAVER_CLIENT_ID,
    naverClientSecret: process.env.NAVER_CLIENT_SECRET,
    tavilyApiKey: process.env.TAVILY_API_KEY,
    googleSearchApiKey: process.env.GOOGLE_SEARCH_API_KEY,
    googleSearchEngineId: process.env.GOOGLE_SEARCH_ENGINE_ID,
    firecrawlApiKey: process.env.FIRECRAWL_API_KEY,
    jinaApiKey: process.env.JINA_API_KEY,
    outputDir: process.env.OUTPUT_DIR || defaultConfig.outputDir,
    defaultContentType:
      (process.env.DEFAULT_CONTENT_TYPE as ContentType) ||
      defaultConfig.defaultContentType,
    logLevel:
      (process.env.LOG_LEVEL as AppConfig['logLevel']) || defaultConfig.logLevel,
    researchConfig,
  };
}

/** 설정 싱글톤 */
let configInstance: AppConfig | null = null;

/** 설정 가져오기 */
export function getConfig(): AppConfig {
  if (!configInstance) {
    configInstance = loadConfig();
  }
  return configInstance;
}

/** 설정 초기화 (테스트용) */
export function resetConfig(): void {
  configInstance = null;
}

/** 모델 ID 가져오기 */
export function getModelId(model: ModelType): string {
  return MODEL_IDS[model];
}

/** 에이전트별 모델 가져오기 */
export function getAgentModel(
  agentType: keyof ModelConfig['agents']
): ModelType {
  const config = getConfig();
  return config.models.agents[agentType];
}

/** 출력 디렉토리 경로 생성 */
export function getOutputPath(topic: string): string {
  const config = getConfig();
  const date = new Date().toISOString().split('T')[0];
  const safeTopic = topic.replace(/[^a-zA-Z0-9가-힣]/g, '-').substring(0, 50);
  return `${config.outputDir}/${safeTopic}-${date}`;
}
