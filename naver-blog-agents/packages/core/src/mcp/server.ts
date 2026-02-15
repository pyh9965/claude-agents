/**
 * MCP 서버 구현
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { tools, handleToolCall } from './tools.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('MCP-Server');

/**
 * MCP 서버 시작
 */
export async function startMCPServer(): Promise<void> {
  logger.info('MCP 서버 초기화 중...');

  const server = new Server(
    {
      name: 'naver-blog-agents',
      version: '1.0.0',
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  // 도구 목록 반환 핸들러
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    logger.debug(`도구 목록 요청: ${tools.length}개 도구`);
    return {
      tools,
    };
  });

  // 도구 실행 핸들러
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    logger.info(`도구 호출: ${name}`);

    try {
      const result = await handleToolCall(name, args ?? {});
      logger.info(`도구 실행 완료: ${name}`);
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(`도구 실행 실패: ${name} - ${errorMessage}`);
      throw error;
    }
  });

  // Stdio 트랜스포트로 연결
  const transport = new StdioServerTransport();
  await server.connect(transport);

  logger.info('MCP 서버 시작 완료');
  logger.info(`등록된 도구: ${tools.map((t) => t.name).join(', ')}`);
}

/**
 * 서버 시작 (진입점)
 */
if (import.meta.url === `file://${process.argv[1]}`) {
  startMCPServer().catch((error) => {
    logger.error('MCP 서버 시작 실패:', error);
    process.exit(1);
  });
}
