/**
 * 설정 관리 유틸리티
 */

import { config as dotenvConfig } from 'dotenv';
import type { ContentType, ModelType } from '../types/index.js';

// 환경 변수 로드
dotenvConfig();

/** 앱 설정 인터페이스 */
export interface AppConfig {
  /** Gemini API 키 */
  geminiApiKey: string;
  /** 네이버 클라이언트 ID */
  naverClientId?: string;
  /** 네이버 클라이언트 시크릿 */
  naverClientSecret?: string;
  /** 출력 디렉토리 */
  outputDir: string;
  /** 기본 콘텐츠 유형 */
  defaultContentType: ContentType;
  /** 로그 레벨 */
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  /** 모델 설정 */
  models: ModelConfig;
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

/** Gemini 모델 ID 매핑 */
export const MODEL_IDS: Record<ModelType, string> = {
  opus: 'gemini-3-pro-preview',    // 고성능 모델
  sonnet: 'gemini-3-pro-preview',  // 균형 모델
  haiku: 'gemini-3-flash-preview', // 빠른 모델
};

/** 기본 설정 */
const defaultConfig: Omit<AppConfig, 'geminiApiKey'> = {
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
};

/** 환경 변수에서 설정 로드 */
function loadConfig(): AppConfig {
  const geminiApiKey = process.env.GEMINI_API_KEY;

  if (!geminiApiKey) {
    throw new Error(
      'GEMINI_API_KEY 환경 변수가 설정되지 않았습니다. .env 파일을 확인하세요.'
    );
  }

  return {
    ...defaultConfig,
    geminiApiKey,
    naverClientId: process.env.NAVER_CLIENT_ID,
    naverClientSecret: process.env.NAVER_CLIENT_SECRET,
    outputDir: process.env.OUTPUT_DIR || defaultConfig.outputDir,
    defaultContentType:
      (process.env.DEFAULT_CONTENT_TYPE as ContentType) ||
      defaultConfig.defaultContentType,
    logLevel:
      (process.env.LOG_LEVEL as AppConfig['logLevel']) || defaultConfig.logLevel,
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
