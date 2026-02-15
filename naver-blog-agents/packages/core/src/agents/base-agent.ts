/**
 * 기본 에이전트 클래스 (xAI Grok API 사용)
 */

import OpenAI from 'openai';
import type {
  AgentConfig,
  AgentInput,
  AgentOutput,
  AgentRole,
  ModelType,
  TokenUsage,
} from '../types/index.js';
import { getConfig, getModelId } from '../utils/config.js';
import { createAgentLogger, type Logger } from '../utils/logger.js';
import { loadPrompt, interpolatePrompt } from '../utils/prompts.js';

/** 에이전트 옵션 */
export interface AgentOptions {
  /** 추가 시스템 프롬프트 */
  additionalSystemPrompt?: string;
  /** 최대 토큰 */
  maxTokens?: number;
  /** 온도 */
  temperature?: number;
  /** 재시도 횟수 */
  maxRetries?: number;
}

/**
 * 기본 에이전트 추상 클래스
 */
export abstract class BaseAgent {
  protected readonly config: AgentConfig;
  protected readonly client: OpenAI;
  protected readonly logger: Logger;
  protected readonly options: AgentOptions;

  constructor(config: AgentConfig, options: AgentOptions = {}) {
    this.config = config;
    this.options = {
      maxTokens: 8192,
      temperature: 0.7,
      maxRetries: 3,
      ...options,
    };

    const appConfig = getConfig();
    this.client = new OpenAI({
      apiKey: appConfig.zaiApiKey,
      baseURL: 'https://api.z.ai/api/coding/paas/v4',
    });

    this.logger = createAgentLogger(config.id);
  }

  /** 에이전트 ID */
  get id(): AgentRole {
    return this.config.id;
  }

  /** 에이전트 이름 */
  get name(): string {
    return this.config.persona.name;
  }

  /** 사용 모델 */
  get model(): ModelType {
    return this.config.model;
  }

  /**
   * 시스템 프롬프트 구성
   */
  protected buildSystemPrompt(context?: Record<string, unknown>): string {
    let systemPrompt = this.config.systemPrompt;

    // 프롬프트 파일 로드 (존재하는 경우)
    try {
      const filePrompt = loadPrompt(this.config.id);
      systemPrompt = filePrompt + '\n\n' + systemPrompt;
    } catch {
      // 프롬프트 파일이 없으면 config의 systemPrompt만 사용
    }

    // 추가 시스템 프롬프트
    if (this.options.additionalSystemPrompt) {
      systemPrompt += '\n\n' + this.options.additionalSystemPrompt;
    }

    // 컨텍스트 변수 치환
    if (context) {
      const variables: Record<string, string | number | boolean> = {};
      for (const [key, value] of Object.entries(context)) {
        if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
          variables[key] = value;
        }
      }
      systemPrompt = interpolatePrompt(systemPrompt, variables);
    }

    return systemPrompt;
  }

  /**
   * 메시지 구성
   */
  protected buildUserMessage(input: AgentInput): string {
    let userMessage = input.message;

    // 이전 단계 결과 추가
    if (input.previousResults) {
      userMessage += '\n\n## 이전 단계 결과\n```json\n' +
        JSON.stringify(input.previousResults, null, 2) +
        '\n```';
    }

    // 컨텍스트 데이터 추가
    if (input.context) {
      userMessage += '\n\n## 컨텍스트\n```json\n' +
        JSON.stringify(input.context, null, 2) +
        '\n```';
    }

    return userMessage;
  }

  /**
   * API 호출 실행 (xAI Grok API)
   */
  protected async callAPI(
    systemPrompt: string,
    userMessage: string
  ): Promise<{ content: string; usage: TokenUsage }> {
    const modelId = getModelId(this.config.model);

    let lastError: Error | null = null;
    for (let attempt = 0; attempt < (this.options.maxRetries ?? 3); attempt++) {
      try {
        const response = await this.client.chat.completions.create({
          model: modelId,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userMessage },
          ],
          max_tokens: this.options.maxTokens ?? 8192,
          temperature: this.options.temperature ?? 0.7,
        });

        const content = response.choices[0]?.message?.content || '';

        // 토큰 사용량
        const usage: TokenUsage = {
          inputTokens: response.usage?.prompt_tokens ?? 0,
          outputTokens: response.usage?.completion_tokens ?? 0,
          totalTokens: response.usage?.total_tokens ?? 0,
        };

        return { content, usage };
      } catch (error) {
        lastError = error as Error;
        this.logger.warn(`API 호출 실패 (시도 ${attempt + 1}/${this.options.maxRetries}): ${lastError.message}`);

        if (attempt < (this.options.maxRetries ?? 3) - 1) {
          await this.delay(1000 * (attempt + 1));
        }
      }
    }

    throw lastError || new Error('API 호출 실패');
  }

  /**
   * 응답 파싱
   */
  protected parseResponse(content: string): unknown {
    // JSON 블록 추출
    const jsonMatch = content.match(/```json\n?([\s\S]*?)\n?```/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[1]);
      } catch {
        // JSON 파싱 실패
      }
    }

    // 전체 내용을 JSON으로 시도
    try {
      return JSON.parse(content);
    } catch {
      // 일반 텍스트로 반환
      return { rawContent: content };
    }
  }

  /**
   * 에이전트 실행 (메인 메서드)
   */
  async execute(input: AgentInput): Promise<AgentOutput> {
    const startTime = Date.now();
    this.logger.agent(this.config.id, `작업 시작: ${input.message.substring(0, 50)}...`);

    try {
      const systemPrompt = this.buildSystemPrompt(input.context);
      const userMessage = this.buildUserMessage(input);

      const { content, usage } = await this.callAPI(systemPrompt, userMessage);
      const data = this.parseResponse(content);

      const processingTime = Date.now() - startTime;
      this.logger.agent(this.config.id, `작업 완료 (${processingTime}ms)`);

      // agentMessage 추출
      let agentMessage = '';
      if (typeof data === 'object' && data !== null && 'agentMessage' in data) {
        agentMessage = (data as { agentMessage: string }).agentMessage;
      }

      return {
        success: true,
        data,
        agentMessage,
        toolsUsed: this.config.tools,
        processingTime,
        tokenUsage: usage,
      };
    } catch (error) {
      const processingTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);

      this.logger.error(`작업 실패: ${errorMessage}`);

      return {
        success: false,
        data: null,
        agentMessage: `죄송합니다, 작업 중 오류가 발생했습니다: ${errorMessage}`,
        toolsUsed: [],
        processingTime,
      };
    }
  }

  /**
   * 지연 유틸리티
   */
  protected delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * 추상 메서드: 특화된 처리 로직 (하위 클래스에서 구현)
   */
  abstract processSpecific(input: AgentInput): Promise<unknown>;
}

/**
 * 에이전트 설정 헬퍼
 */
export function createAgentConfig(
  id: AgentRole,
  persona: AgentConfig['persona'],
  model: ModelType = 'sonnet',
  tools: AgentConfig['tools'] = []
): AgentConfig {
  return {
    id,
    persona,
    systemPrompt: '', // 프롬프트 파일에서 로드
    tools,
    model,
  };
}
