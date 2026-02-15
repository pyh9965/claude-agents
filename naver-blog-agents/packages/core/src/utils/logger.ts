/**
 * 로깅 유틸리티
 */

import { getConfig } from './config.js';

/** 로그 레벨 */
type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/** 로그 레벨 우선순위 */
const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

/** 로그 색상 (ANSI) */
const COLORS = {
  reset: '\x1b[0m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
};

/** 에이전트 이모지 매핑 */
const AGENT_EMOJIS: Record<string, string> = {
  planner: '📋',
  researcher: '🔍',
  'info-writer': '📚',
  'marketing-writer': '✨',
  'review-writer': '⭐',
  'food-writer': '🍽️',
  editor: '✏️',
  'seo-expert': '🎯',
  orchestrator: '🎭',
  system: '⚙️',
};

/** 로거 인터페이스 */
export interface Logger {
  debug(message: string, meta?: Record<string, unknown>): void;
  info(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  error(message: string, meta?: Record<string, unknown>): void;
  agent(agentId: string, message: string, meta?: Record<string, unknown>): void;
  stage(stageName: string, status: 'start' | 'end', duration?: number): void;
  progress(current: number, total: number, label: string): void;
}

/** 현재 로그 레벨 확인 */
function shouldLog(level: LogLevel): boolean {
  try {
    const config = getConfig();
    return LOG_LEVELS[level] >= LOG_LEVELS[config.logLevel];
  } catch {
    return LOG_LEVELS[level] >= LOG_LEVELS['info'];
  }
}

/** 타임스탬프 포맷팅 */
function formatTimestamp(): string {
  return new Date().toISOString().split('T')[1].slice(0, 12);
}

/** 로그 메시지 포맷팅 */
function formatLog(
  level: LogLevel,
  message: string,
  meta?: Record<string, unknown>
): string {
  const timestamp = formatTimestamp();
  const levelColors: Record<LogLevel, string> = {
    debug: COLORS.dim,
    info: COLORS.green,
    warn: COLORS.yellow,
    error: COLORS.red,
  };

  const color = levelColors[level];
  const levelTag = `[${level.toUpperCase().padEnd(5)}]`;
  const metaStr = meta ? ` ${COLORS.dim}${JSON.stringify(meta)}${COLORS.reset}` : '';

  return `${COLORS.dim}${timestamp}${COLORS.reset} ${color}${levelTag}${COLORS.reset} ${message}${metaStr}`;
}

/** 로거 생성 */
export function createLogger(namespace?: string): Logger {
  const prefix = namespace ? `[${namespace}] ` : '';

  return {
    debug(message: string, meta?: Record<string, unknown>): void {
      if (shouldLog('debug')) {
        console.log(formatLog('debug', prefix + message, meta));
      }
    },

    info(message: string, meta?: Record<string, unknown>): void {
      if (shouldLog('info')) {
        console.log(formatLog('info', prefix + message, meta));
      }
    },

    warn(message: string, meta?: Record<string, unknown>): void {
      if (shouldLog('warn')) {
        console.warn(formatLog('warn', prefix + message, meta));
      }
    },

    error(message: string, meta?: Record<string, unknown>): void {
      if (shouldLog('error')) {
        console.error(formatLog('error', prefix + message, meta));
      }
    },

    agent(agentId: string, message: string, meta?: Record<string, unknown>): void {
      if (shouldLog('info')) {
        const emoji = AGENT_EMOJIS[agentId] || '🤖';
        const agentName = agentId.charAt(0).toUpperCase() + agentId.slice(1);
        console.log(
          `${COLORS.dim}${formatTimestamp()}${COLORS.reset} ${emoji} ${COLORS.cyan}[${agentName}]${COLORS.reset} ${message}${
            meta ? ` ${COLORS.dim}${JSON.stringify(meta)}${COLORS.reset}` : ''
          }`
        );
      }
    },

    stage(stageName: string, status: 'start' | 'end', duration?: number): void {
      if (shouldLog('info')) {
        const emoji = status === 'start' ? '▶️' : '✅';
        const statusText = status === 'start' ? '시작' : '완료';
        const durationText = duration ? ` (${(duration / 1000).toFixed(2)}s)` : '';
        console.log(
          `${COLORS.dim}${formatTimestamp()}${COLORS.reset} ${emoji} ${COLORS.magenta}[Stage: ${stageName}]${COLORS.reset} ${statusText}${durationText}`
        );
      }
    },

    progress(current: number, total: number, label: string): void {
      if (shouldLog('info')) {
        const percentage = Math.round((current / total) * 100);
        const barLength = 20;
        const filled = Math.round((current / total) * barLength);
        const bar = '█'.repeat(filled) + '░'.repeat(barLength - filled);
        process.stdout.write(
          `\r${COLORS.dim}${formatTimestamp()}${COLORS.reset} ${COLORS.blue}[${bar}]${COLORS.reset} ${percentage}% ${label}`
        );
        if (current === total) {
          console.log('');
        }
      }
    },
  };
}

/** 기본 로거 */
export const logger = createLogger();

/** 에이전트별 로거 생성 */
export function createAgentLogger(agentId: string): Logger {
  return createLogger(agentId);
}
