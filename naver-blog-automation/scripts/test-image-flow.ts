/**
 * ChatGPT 이미지 생성 E2E 테스트
 * 업데이트된 셀렉터(article turn 기반)로 실제 이미지 생성+감지+다운로드 검증
 */
import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';

async function main() {
  console.log('[Test] Chrome CDP 연결...');
  const browser = await chromium.connectOverCDP('http://localhost:9222');
  const ctx = browser.contexts()[0];

  // 새 탭에서 ChatGPT 열기
  const page = await ctx.newPage();
  await page.goto('https://chatgpt.com', { waitUntil: 'domcontentloaded' });
  await new Promise(r => setTimeout(r, 5000));

  console.log(`[Test] URL: ${page.url()}`);

  // 입력란 확인
  const input = page.locator('#prompt-textarea').first();
  const inputVisible = await input.isVisible({ timeout: 10_000 }).catch(() => false);
  if (!inputVisible) {
    console.log('[Test] FAIL: 입력란 없음 - 로그인 필요');
    const dir = path.resolve(__dirname, '../test-results');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    await page.screenshot({ path: path.join(dir, 'test-no-input.png'), fullPage: true });
    await browser.close();
    return;
  }

  console.log('[Test] OK: 입력란 확인');

  // 이미지 생성 프롬프트 전송
  const testPrompt = 'Generate this image with DALL-E. Do NOT respond with text, just create the image:\n\nA cozy Korean BBQ restaurant at night, with steam rising from grilling meat, warm ambient lighting';

  await input.click();
  await new Promise(r => setTimeout(r, 500));
  await page.evaluate((text) => navigator.clipboard.writeText(text), testPrompt);
  await new Promise(r => setTimeout(r, 300));
  await page.keyboard.press('Control+V');
  await new Promise(r => setTimeout(r, 1000));

  // 전송
  const sendBtn = page.locator('button[data-testid="send-button"]').first();
  if (await sendBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await sendBtn.click();
    console.log('[Test] 전송 버튼 클릭');
  } else {
    await page.keyboard.press('Enter');
    console.log('[Test] Enter키로 전송');
  }

  // ── 이미지 생성 모니터링 (최대 120초) ──
  console.log('[Test] 이미지 생성 대기...');
  const start = Date.now();
  let textRetried = false;

  // 정확히 chatgpt-image.ts의 findGeneratedImage()와 동일한 셀렉터 사용
  const imageSelectors = [
    'img[alt="생성된 이미지"]',
    'article img[src*="backend-api/estuary/content"]',
    '[data-testid="image-container"] img',
    'article[data-testid^="conversation-turn-"] img[src*="oaidalleapi"]',
    'article[data-testid^="conversation-turn-"] img[src*="dalle"]',
    'article[data-testid^="conversation-turn-"] img[src*="openai"]',
    'article[data-testid^="conversation-turn-"] img[src^="blob:"]',
    'article img[src^="https://"]:not([src*="avatar"]):not([src*="icon"]):not([src*="auth0"]):not([class*="w-6"]):not([class*="h-6"])',
  ];

  for (let i = 0; i < 40; i++) {
    await new Promise(r => setTimeout(r, 3000));
    const elapsed = Math.round((Date.now() - start) / 1000);

    // 생성 중 텍스트 감지
    const generatingTexts = ['이미지 생성 중', 'Creating image', 'Generating'];
    let isCreating = false;
    for (const gText of generatingTexts) {
      const el = page.locator(`text="${gText}"`).first();
      if (await el.isVisible({ timeout: 1_000 }).catch(() => false)) {
        isCreating = true;
        break;
      }
    }

    if (isCreating) {
      console.log(`[Test] ${elapsed}초: 이미지 생성 중...`);
      continue;
    }

    // 이미지 감지 (chatgpt-image.ts와 동일 로직)
    for (const selector of imageSelectors) {
      try {
        const images = page.locator(selector);
        const count = await images.count();
        if (count === 0) continue;

        const img = images.last();
        const isLoaded = await img.evaluate((el: HTMLImageElement) => {
          return el.complete && el.naturalWidth > 200 && el.naturalHeight > 200;
        }).catch(() => false);

        if (isLoaded) {
          const src = await img.evaluate((el: HTMLImageElement) => el.src.substring(0, 120)).catch(() => '');
          const size = await img.evaluate((el: HTMLImageElement) => `${el.naturalWidth}x${el.naturalHeight}`).catch(() => '?');
          console.log(`[Test] SUCCESS: 이미지 감지! selector="${selector}", size=${size}`);
          console.log(`[Test]   src: ${src}`);

          // 다운로드 테스트
          const dir = path.resolve(__dirname, '../test-results');
          if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
          const savePath = path.join(dir, 'test-downloaded-image.png');

          try {
            await img.screenshot({ path: savePath });
            const fileSize = fs.statSync(savePath).size;
            console.log(`[Test] SUCCESS: 이미지 저장 완료 (${Math.round(fileSize/1024)}KB): ${savePath}`);
          } catch (e: any) {
            console.log(`[Test] WARN: 스크린샷 저장 실패: ${e.message}`);
          }

          await page.screenshot({ path: path.join(dir, 'test-image-success.png'), fullPage: true });
          await browser.close();
          return;
        }
      } catch { /* continue */ }
    }

    // 텍스트 전용 응답 감지 (30초 후)
    if (!textRetried && elapsed > 30) {
      const textOnly = await page.evaluate(() => {
        const turns = document.querySelectorAll('article[data-testid^="conversation-turn-"]');
        const assistantTurns = Array.from(turns).filter(t => !t.querySelector('[data-message-author-role="user"]'));
        if (assistantTurns.length === 0) return false;

        const lastMsg = assistantTurns[assistantTurns.length - 1];
        const hasImage = !!lastMsg.querySelector('img[alt="생성된 이미지"], img[src*="backend-api/estuary/content"], img[src*="oai"], img[src^="blob:"]');
        if (hasImage) return false;

        const text = (lastMsg.textContent || '').trim();
        const hasStop = !!document.querySelector('button[aria-label*="Stop"]');
        return !hasStop && text.length > 100;
      }).catch(() => false);

      if (textOnly) {
        console.log(`[Test] ${elapsed}초: 텍스트 전용 응답 감지 -> 재요청`);
        textRetried = true;
        const retryInput = page.locator('#prompt-textarea').first();
        await retryInput.click();
        await new Promise(r => setTimeout(r, 300));
        await page.evaluate((text) => navigator.clipboard.writeText(text), 'Please generate the image now. Use DALL-E to create the actual image. Do not explain - just generate.');
        await page.keyboard.press('Control+V');
        await new Promise(r => setTimeout(r, 500));
        const retrySend = page.locator('button[data-testid="send-button"]').first();
        if (await retrySend.isVisible({ timeout: 2000 }).catch(() => false)) {
          await retrySend.click();
        } else {
          await page.keyboard.press('Enter');
        }
        console.log('[Test] 재요청 전송');
        await new Promise(r => setTimeout(r, 5000));
        continue;
      }
    }

    console.log(`[Test] ${elapsed}초: 대기 중...`);
  }

  console.log('[Test] TIMEOUT: 이미지 감지 실패');

  // 최종 DOM 분석
  const finalState = await page.evaluate(() => {
    const imgs = Array.from(document.querySelectorAll('img')).filter(img =>
      (img.naturalWidth > 50 || img.naturalHeight > 50) &&
      !img.src.includes('avatar') && !img.src.includes('icon')
    );
    const turns = document.querySelectorAll('article[data-testid^="conversation-turn-"]');
    return {
      totalTurns: turns.length,
      imagesOnPage: imgs.map(i => ({
        src: i.src.substring(0, 100),
        w: i.naturalWidth,
        h: i.naturalHeight,
        alt: i.alt?.substring(0, 30),
      })),
    };
  }).catch(() => ({ totalTurns: 0, imagesOnPage: [] }));

  console.log('[Test] 최종 상태:', JSON.stringify(finalState, null, 2));

  const dir = path.resolve(__dirname, '../test-results');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  await page.screenshot({ path: path.join(dir, 'test-image-timeout.png'), fullPage: true });

  await browser.close();
}

main().catch(console.error);
