/**
 * ChatGPT 이미지 생성 단독 스크립트
 *
 * CDP로 Chrome에 연결하여 chatgpt.com에서 이미지를 생성하고 다운로드합니다.
 *
 * 사용법:
 *   npm run chatgpt:image
 *   npm run chatgpt:image -- "커스텀 프롬프트"
 *   npm run chatgpt:image -- "프롬프트" "./output/custom.png"
 */
import dotenv from 'dotenv';
import path from 'path';
import { ChromeCDP } from '../src/chrome-cdp';
import { ChatGPTImageGenerator } from '../src/chatgpt-image';
import { applyStealthScripts } from '../src/human-like';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const DEFAULT_PROMPT =
  '블로그 썸네일 이미지를 그려줘: 삼색 고양이가 창가에 앉아 있는 따뜻한 일러스트. 파스텔톤 색감으로 아늑한 분위기를 표현해줘.';

async function main() {
  const prompt = process.argv[2] || DEFAULT_PROMPT;
  const outputPath =
    process.argv[3] || path.resolve(__dirname, '../output/chatgpt-image.png');

  const cdp = new ChromeCDP({
    debugPort: 9222,
    killExisting: true,
  });

  if (!cdp.isProfileSetup()) {
    console.error('========================================');
    console.error('[CDP] 디버그 프로필이 설정되지 않았습니다!');
    console.error('[CDP] 먼저 npm run chrome:setup 을 실행해주세요.');
    console.error('========================================');
    process.exit(1);
  }

  console.log('========================================');
  console.log('[ChatGPT] 이미지 생성');
  console.log(`[ChatGPT] 프롬프트: "${prompt.substring(0, 80)}..."`);
  console.log(`[ChatGPT] 저장 경로: ${outputPath}`);
  console.log('========================================');

  try {
    const { page } = await cdp.connect();
    await applyStealthScripts(page);

    const generator = new ChatGPTImageGenerator(page);
    const savedPath = await generator.generateImage({
      prompt,
      savePath: outputPath,
    });

    console.log('========================================');
    console.log(`[ChatGPT] 이미지 생성 완료: ${savedPath}`);
    console.log('========================================');
  } catch (error) {
    console.error('[ChatGPT] 오류:', error);
    process.exit(1);
  } finally {
    await cdp.disconnect();
  }
}

main();
