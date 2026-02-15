/**
 * 에이전트 모듈 re-export
 */

export * from './base-agent.js';
export * from './planner.js';
export * from './researcher.js';
export * from './writers/index.js';
export * from './editor.js';
export * from './seo-expert.js';

import type { ContentType, AgentRole } from '../types/index.js';
import type { AgentOptions } from './base-agent.js';
import { getPlannerAgent } from './planner.js';
import { getResearcherAgent } from './researcher.js';
import { getWriterAgent, WRITER_NAMES } from './writers/index.js';
import { getEditorAgent } from './editor.js';
import { getSEOExpertAgent } from './seo-expert.js';

/**
 * 에이전트 팀 인터페이스
 */
export interface AgentTeamInstance {
  planner: ReturnType<typeof getPlannerAgent>;
  researcher: ReturnType<typeof getResearcherAgent>;
  getWriter: (contentType: ContentType) => ReturnType<typeof getWriterAgent>;
  editor: ReturnType<typeof getEditorAgent>;
  seoExpert: ReturnType<typeof getSEOExpertAgent>;
}

/**
 * 에이전트 팀 생성 팩토리
 */
export function createAgentTeam(options?: AgentOptions): AgentTeamInstance {
  return {
    planner: getPlannerAgent(options),
    researcher: getResearcherAgent(options),
    getWriter: (contentType: ContentType) => getWriterAgent(contentType, options),
    editor: getEditorAgent(options),
    seoExpert: getSEOExpertAgent(options),
  };
}

/**
 * 에이전트 역할별 이름 매핑
 */
export const AGENT_NAMES: Record<AgentRole, string> = {
  planner: '민준 팀장',
  researcher: '수빈',
  'info-writer': '현우 선생님',
  'marketing-writer': '지은 언니',
  'review-writer': '태현',
  'food-writer': '하린',
  'travel-writer': '유진',
  'tech-writer': '민석',
  'lifestyle-writer': '수아',
  'parenting-writer': '예원맘',
  editor: '서연 실장',
  'seo-expert': '준서',
};

/**
 * 콘텐츠 유형에 따른 작가 역할 매핑
 */
export function getWriterRole(contentType: ContentType): AgentRole {
  const roleMap: Record<ContentType, AgentRole> = {
    info: 'info-writer',
    marketing: 'marketing-writer',
    review: 'review-writer',
    food: 'food-writer',
    travel: 'travel-writer',
    tech: 'tech-writer',
    lifestyle: 'lifestyle-writer',
    parenting: 'parenting-writer',
  };
  return roleMap[contentType];
}

/**
 * 에이전트 이름 가져오기
 */
export function getAgentName(role: AgentRole): string {
  return AGENT_NAMES[role];
}

/**
 * 작가 이름 가져오기
 */
export function getWriterName(contentType: ContentType): string {
  return WRITER_NAMES[contentType];
}
