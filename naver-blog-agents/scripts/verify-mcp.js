/**
 * MCP 도구 검증 스크립트
 */

import { tools } from '../dist/mcp/tools.js';

console.log('=== MCP 도구 목록 ===\n');
console.log(`총 ${tools.length}개 도구 등록됨\n`);

tools.forEach((tool, index) => {
  console.log(`${index + 1}. ${tool.name}`);
  console.log(`   설명: ${tool.description}`);
  console.log(`   필수 파라미터: ${tool.inputSchema.required.join(', ')}`);
  console.log('');
});

console.log('검증 완료!');
