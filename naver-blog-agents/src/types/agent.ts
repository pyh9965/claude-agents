/**
 * 에이전트 관련 타입 정의
 */

import type { ContentType } from './content.js';

/** 모델 유형 */
export type ModelType = 'opus' | 'sonnet' | 'haiku';

/** 에이전트 역할 */
export type AgentRole =
  | 'planner'
  | 'researcher'
  | 'info-writer'
  | 'marketing-writer'
  | 'review-writer'
  | 'food-writer'
  | 'travel-writer'     // 신규
  | 'tech-writer'       // 신규
  | 'lifestyle-writer'  // 신규
  | 'parenting-writer'  // 신규
  | 'editor'
  | 'seo-expert';

/** 에이전트 페르소나 */
export interface AgentPersona {
  /** 이름 */
  name: string;
  /** 나이 */
  age: number;
  /** 성격 설명 */
  personality: string;
  /** 말투 예시 */
  speakingStyle: string[];
  /** 전문 분야 */
  expertise: string[];
  /** 배경 설명 */
  background: string;
}

/** 에이전트 설정 */
export interface AgentConfig {
  /** 에이전트 ID */
  id: AgentRole;
  /** 페르소나 */
  persona: AgentPersona;
  /** 시스템 프롬프트 */
  systemPrompt: string;
  /** 사용 가능한 도구 */
  tools: AgentTool[];
  /** 사용 모델 */
  model: ModelType;
  /** 최대 토큰 */
  maxTokens?: number;
  /** 온도 */
  temperature?: number;
}

/** 에이전트 도구 */
export type AgentTool =
  | 'web_search'
  | 'web_fetch'
  | 'read_file'
  | 'spell_check'
  | 'keyword_analysis'
  | 'naver_api';

/** 에이전트 입력 */
export interface AgentInput {
  /** 메시지 */
  message: string;
  /** 컨텍스트 데이터 */
  context?: Record<string, unknown>;
  /** 이전 단계 결과 */
  previousResults?: Record<string, unknown>;
}

/** 에이전트 출력 */
export interface AgentOutput {
  /** 성공 여부 */
  success: boolean;
  /** 결과 데이터 */
  data: unknown;
  /** 에이전트 메시지 (페르소나 톤) */
  agentMessage: string;
  /** 사용된 도구 */
  toolsUsed: string[];
  /** 처리 시간 (ms) */
  processingTime: number;
  /** 토큰 사용량 */
  tokenUsage?: TokenUsage;
}

/** 토큰 사용량 */
export interface TokenUsage {
  /** 입력 토큰 */
  inputTokens: number;
  /** 출력 토큰 */
  outputTokens: number;
  /** 총 토큰 */
  totalTokens: number;
}

/** 작가 에이전트 설정 */
export interface WriterAgentConfig extends AgentConfig {
  /** 담당 콘텐츠 유형 */
  contentType: ContentType;
  /** 작성 스타일 */
  writingStyle: WritingStyle;
}

/** 작성 스타일 */
export interface WritingStyle {
  /** 문장 길이 선호도 */
  sentenceLength: 'short' | 'medium' | 'long' | 'mixed';
  /** 이모지 사용 여부 */
  useEmoji: boolean;
  /** 문단 구조 */
  paragraphStructure: 'dense' | 'airy' | 'mixed';
  /** 특징적 표현들 */
  characteristicPhrases: string[];
}

/** 에이전트 팀 구성 */
export interface AgentTeam {
  /** 기획자 */
  planner: AgentConfig;
  /** 리서처 */
  researcher: AgentConfig;
  /** 작가들 */
  writers: Record<ContentType, WriterAgentConfig>;
  /** 편집자 */
  editor: AgentConfig;
  /** SEO 전문가 */
  seoExpert: AgentConfig;
}

/** 에이전트 상태 */
export interface AgentState {
  /** 에이전트 ID */
  agentId: AgentRole;
  /** 상태 */
  status: 'idle' | 'working' | 'waiting' | 'completed' | 'error';
  /** 현재 작업 */
  currentTask?: string;
  /** 진행률 (0-100) */
  progress: number;
  /** 마지막 활동 시간 */
  lastActivity: Date;
  /** 에러 정보 */
  error?: string;
}

/** 에이전트 통신 메시지 */
export interface AgentMessage {
  /** 발신자 */
  from: AgentRole;
  /** 수신자 */
  to: AgentRole | 'orchestrator';
  /** 메시지 유형 */
  type: 'request' | 'response' | 'notification' | 'error';
  /** 페이로드 */
  payload: unknown;
  /** 타임스탬프 */
  timestamp: Date;
}
