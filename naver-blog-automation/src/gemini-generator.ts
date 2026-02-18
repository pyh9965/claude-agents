/**
 * Gemini 웹 자동화 블로그/이미지 생성기
 *
 * Chrome CDP 연결된 Playwright Page를 받아 gemini.google.com에서
 * 블로그 글과 이미지를 생성합니다.
 *
 * 사전 준비: Chrome 디버그 프로필에서 Google 계정 로그인 (최초 1회)
 */
import { type Page } from 'playwright';
import { humanDelay } from './human-like';
import fs from 'fs';
import path from 'path';
import type { BlogContent, ImageGenerationOptions } from './chatgpt-image';

export class GeminiGenerator {
  private page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  // ─── 네비게이션 & 로그인 확인 ───

  async navigateToGemini(): Promise<void> {
    console.log('[Gemini] gemini.google.com으로 이동...');
    await this.page.goto('https://gemini.google.com/app', {
      waitUntil: 'domcontentloaded',
    });
    await humanDelay(3000, 5000);

    const isLoggedIn = await this.checkLoginStatus();
    if (!isLoggedIn) {
      throw new Error('[Gemini] 로그인되지 않음. Chrome 디버그 프로필에서 Google 계정으로 로그인하세요.');
    }
    console.log('[Gemini] 로그인 상태 확인 완료');
  }

  private async checkLoginStatus(): Promise<boolean> {
    // 로그인 버튼이 보이면 미로그인
    const signInSelectors = [
      'a:has-text("Sign in")',
      'button:has-text("Sign in")',
      'a:has-text("로그인")',
      'button:has-text("로그인")',
      'a[href*="accounts.google.com/signin"]',
    ];
    for (const sel of signInSelectors) {
      if (await this.page.locator(sel).first().isVisible({ timeout: 2_000 }).catch(() => false)) {
        return false;
      }
    }

    // 로그인 버튼이 없으면 로그인된 것으로 간주
    // (프로필 아바타, 입력창 등 다양한 Gemini UI 버전 대응)
    return true;
  }

  // ─── 새 대화 시작 ───

  async startNewChat(): Promise<void> {
    console.log('[Gemini] 새 대화 시작...');

    const newChatSelectors = [
      'button[aria-label="New chat"]',
      'button[data-tooltip="New chat"]',
      'button[mattooltip="New chat"]',
      'a[href="/app"]',
    ];

    for (const sel of newChatSelectors) {
      const btn = this.page.locator(sel).first();
      if (await btn.isVisible({ timeout: 2_000 }).catch(() => false)) {
        await btn.click();
        await humanDelay(1000, 2000);
        console.log('[Gemini] 새 대화 시작됨');
        return;
      }
    }

    // 폴백: 메인 페이지로 직접 이동
    await this.page.goto('https://gemini.google.com/app', { waitUntil: 'domcontentloaded' });
    await humanDelay(2000, 3000);
    console.log('[Gemini] 메인으로 이동 (새 대화 준비)');
  }

  // ─── 프롬프트 전송 ───

  async sendPrompt(prompt: string): Promise<void> {
    const preview = prompt.length > 70 ? prompt.substring(0, 70) + '...' : prompt;
    console.log(`[Gemini] 프롬프트 전송: "${preview}"`);

    const inputSelectors = [
      'rich-textarea .ql-editor',
      'div.ql-editor[contenteditable="true"]',
      'rich-textarea p',
      'div[contenteditable="true"]',
      'textarea',
      'ms-prompt-input-wrapper .ql-editor',
      'ms-prompt-input-wrapper div[contenteditable="true"]',
      '.ql-editor',
      '[data-placeholder] ',
    ];

    let inputFound = false;
    for (const sel of inputSelectors) {
      const input = this.page.locator(sel).first();
      if (await input.isVisible({ timeout: 5_000 }).catch(() => false)) {
        await input.click();
        await humanDelay(300, 600);

        // 클립보드 붙여넣기로 빠른 입력
        await this.page.evaluate((text) => navigator.clipboard.writeText(text), prompt);
        await humanDelay(200, 400);
        await this.page.keyboard.press('Control+V');
        await humanDelay(500, 1000);
        inputFound = true;
        break;
      }
    }

    if (!inputFound) {
      await this.page.screenshot({ path: 'test-results/debug-gemini-input-not-found.png' });
      throw new Error('[Gemini] 텍스트 입력란을 찾을 수 없습니다');
    }

    // 전송 버튼
    const sendSelectors = [
      'button[aria-label="Send message"]',
      'button[aria-label="메시지 보내기"]',
      'button.send-button',
      'button[type="submit"]',
      'button[jsname="Qx7uuf"]',
    ];

    let sent = false;
    for (const sel of sendSelectors) {
      const btn = this.page.locator(sel).first();
      if (await btn.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await btn.click();
        sent = true;
        console.log('[Gemini] 프롬프트 전송 완료');
        break;
      }
    }

    if (!sent) {
      await this.page.keyboard.press('Enter');
      console.log('[Gemini] Enter키로 프롬프트 전송');
    }

    await humanDelay(2000, 3000);
  }

  // ─── 텍스트 응답 대기 ───

  async waitForTextResponse(timeoutMs = 120_000): Promise<void> {
    console.log('[Gemini] 텍스트 응답 대기 중...');
    const startTime = Date.now();
    let lastText = '';
    let stableCount = 0;
    let lastLog = startTime;

    // 응답 시작 대기
    await humanDelay(2000, 3000);

    while (Date.now() - startTime < timeoutMs) {
      const isGenerating = await this.page.locator(
        'button[aria-label="Stop generating"], button[aria-label="생성 중지"], .stop-button',
      ).first().isVisible({ timeout: 1_000 }).catch(() => false);

      if (!isGenerating) {
        const currentText = await this.getLastResponseText().catch(() => '');
        if (currentText.length > 50 && currentText === lastText) {
          stableCount++;
          if (stableCount >= 2) {
            console.log(
              `[Gemini] 응답 완료 (${Math.round((Date.now() - startTime) / 1000)}초 소요, ${currentText.length}자)`,
            );
            return;
          }
        } else {
          lastText = currentText;
          stableCount = 0;
        }
      }

      if (Date.now() - lastLog > 10_000) {
        console.log(`[Gemini] 응답 대기 중... (${Math.round((Date.now() - startTime) / 1000)}초)`);
        lastLog = Date.now();
      }

      await humanDelay(1500, 2500);
    }

    await this.page.screenshot({ path: 'test-results/debug-gemini-text-timeout.png', fullPage: true });
    throw new Error(`[Gemini] 텍스트 응답 타임아웃 (${timeoutMs / 1000}초 초과)`);
  }

  async getLastResponseText(): Promise<string> {
    return await this.page.evaluate(() => {
      const selectors = [
        '.model-response-text',
        'message-content .markdown',
        'model-response .markdown',
        '.response-container .markdown',
        '[data-response-index] .markdown',
        'p.response-text',
        '.gemini-response',
      ];
      for (const sel of selectors) {
        const els = document.querySelectorAll(sel);
        if (els.length > 0) {
          return els[els.length - 1].textContent?.trim() || '';
        }
      }
      // 폴백: 마지막 model-response 내 전체 텍스트
      const responses = document.querySelectorAll('model-response, .model-response, [data-message-role="model"]');
      if (responses.length > 0) {
        return responses[responses.length - 1].textContent?.trim() || '';
      }
      return '';
    });
  }

  // ─── 이미지 생성 대기 ───

  async waitForImageGeneration(timeoutMs = 240_000): Promise<void> {
    console.log(`[Gemini] 이미지 생성 대기 (최대 ${timeoutMs / 1000}초)...`);
    const startTime = Date.now();
    let lastLog = startTime;

    await humanDelay(3000, 5000);

    while (Date.now() - startTime < timeoutMs) {
      const hasImage = await this.findGeneratedImage();
      if (hasImage) {
        console.log(`[Gemini] 이미지 생성 완료 (${Math.round((Date.now() - startTime) / 1000)}초 소요)`);
        await humanDelay(2000, 3000);
        return;
      }

      if (Date.now() - lastLog > 10_000) {
        console.log(`[Gemini] 대기 중... (${Math.round((Date.now() - startTime) / 1000)}초)`);
        lastLog = Date.now();
      }

      await humanDelay(2000, 3000);
    }

    await this.page.screenshot({ path: 'test-results/debug-gemini-img-timeout.png', fullPage: true });
    throw new Error(`[Gemini] 이미지 생성 타임아웃 (${timeoutMs / 1000}초 초과)`);
  }

  private async findGeneratedImage(): Promise<boolean> {
    // 생성 중 텍스트가 있으면 아직 진행 중
    const generatingTexts = ['이미지 생성 중', 'Generating image', 'Creating image'];
    for (const text of generatingTexts) {
      if (await this.page.locator(`text="${text}"`).first().isVisible({ timeout: 500 }).catch(() => false)) {
        return false;
      }
    }

    const imageSelectors = [
      'img[src*="generativelanguage.googleapis.com"]',
      'img[src*="imagegeneration"]',
      'img[src*="bard-storage"]',
      '[class*="image-container"] img',
      'model-response img[src^="https://"]',
      '.response-container img[src^="https://"]',
      'message-content img[src^="https://"]',
    ];

    for (const sel of imageSelectors) {
      try {
        const imgs = this.page.locator(sel);
        if (await imgs.count() === 0) continue;

        const loaded = await imgs.last().evaluate((el: HTMLImageElement) =>
          el.complete && el.naturalWidth > 200 && el.naturalHeight > 200,
        ).catch(() => false);

        if (loaded) return true;
      } catch { /* continue */ }
    }
    return false;
  }

  // ─── 이미지 다운로드 ───

  async downloadGeneratedImage(savePath: string): Promise<string> {
    console.log(`[Gemini] 이미지 다운로드 → ${savePath}`);
    const dir = path.dirname(savePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    const imageSelectors = [
      'img[src*="generativelanguage.googleapis.com"]',
      'img[src*="imagegeneration"]',
      'img[src*="bard-storage"]',
      '[class*="image-container"] img',
      'model-response img[src^="https://"]',
      '.response-container img[src^="https://"]',
      'message-content img[src^="https://"]',
      'img[src^="https://"]:not([src*="avatar"]):not([src*="icon"]):not([src*="logo"])',
    ];

    // 방법 1: 다운로드 버튼
    console.log('[Gemini] 방법 1: 다운로드 버튼 시도...');
    try {
      const dlSelectors = [
        'button[aria-label*="Download"]',
        'button[aria-label*="다운로드"]',
        '[class*="image"] button[aria-label*="download" i]',
      ];
      for (const sel of dlSelectors) {
        const btn = this.page.locator(sel).last();
        if (await btn.isVisible({ timeout: 2_000 }).catch(() => false)) {
          const dlPromise = this.page.waitForEvent('download', { timeout: 15_000 });
          await btn.click();
          const dl = await dlPromise;
          await dl.saveAs(savePath);
          console.log(`[Gemini] 이미지 저장 완료 (다운로드 버튼): ${savePath}`);
          return savePath;
        }
      }
    } catch { /* continue */ }

    // 방법 2: fetch
    console.log('[Gemini] 방법 2: fetch 시도...');
    for (const sel of imageSelectors) {
      try {
        const imgs = this.page.locator(sel);
        if (await imgs.count() === 0) continue;

        const img = imgs.last();
        const loaded = await img.evaluate((el: HTMLImageElement) =>
          el.complete && el.naturalWidth > 200,
        ).catch(() => false);
        if (!loaded) continue;

        console.log(`[Gemini] 이미지 발견 (${sel}), fetch 시도...`);

        const base64Data = await img.evaluate(async (el: HTMLImageElement) => {
          try {
            const res = await fetch(el.src, { credentials: 'include' });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const blob = await res.blob();
            return new Promise<string>((resolve, reject) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve(reader.result as string);
              reader.onerror = reject;
              reader.readAsDataURL(blob);
            });
          } catch { return null; }
        }).catch(() => null);

        if (base64Data) {
          const base64 = base64Data.replace(/^data:image\/\w+;base64,/, '');
          fs.writeFileSync(savePath, Buffer.from(base64, 'base64'));
          console.log(`[Gemini] 이미지 저장 완료 (fetch): ${savePath}`);
          return savePath;
        }
      } catch { /* continue */ }
    }

    // 방법 3: 요소 스크린샷
    console.log('[Gemini] 방법 3: 스크린샷 폴백...');
    for (const sel of imageSelectors) {
      try {
        const img = this.page.locator(sel).last();
        if (await img.isVisible({ timeout: 2_000 }).catch(() => false)) {
          const box = await img.boundingBox();
          if (box && box.width > 200 && box.height > 200) {
            await img.screenshot({ path: savePath });
            console.log(`[Gemini] 이미지 저장 완료 (스크린샷): ${savePath}`);
            return savePath;
          }
        }
      } catch { /* continue */ }
    }

    await this.page.screenshot({ path: 'test-results/debug-gemini-download-failed.png', fullPage: true });
    throw new Error('[Gemini] 이미지를 다운로드할 수 없습니다');
  }

  // ─── 통합 워크플로우 ───

  async generateImage(options: ImageGenerationOptions): Promise<string> {
    const { prompt, savePath, timeoutMs = 240_000 } = options;
    await this.navigateToGemini();
    await this.startNewChat();
    await this.sendPrompt(`Generate an image: ${prompt}`);
    await this.waitForImageGeneration(timeoutMs);
    return await this.downloadGeneratedImage(savePath);
  }

  async generateBlogContent(topic: string): Promise<BlogContent> {
    console.log(`[Gemini] 블로그 글 생성 시작: "${topic}"`);

    await this.navigateToGemini();
    await this.startNewChat();

    const prompt = `네이버 블로그 글을 작성해줘.

주제: ${topic}

아래 형식으로 정확히 작성해줘. 구분자를 반드시 지켜줘:

---TITLE---
SEO 최적화된 블로그 제목 한 줄

---SECTION1---
도입부. 300~500자. 독자의 관심을 끄는 도입부.

---IMAGE1---
이 섹션에 어울리는 사실적인 사진 스타일 이미지 프롬프트 (영어, 1문장)

---SECTION2---
핵심 정보. 500~800자. 주제의 본론.

---IMAGE2---
이 섹션에 어울리는 사실적인 사진 스타일 이미지 프롬프트 (영어, 1문장)

---SECTION3---
팁/추천/비교. 300~500자.

---IMAGE3---
이 섹션에 어울리는 사실적인 사진 스타일 이미지 프롬프트 (영어, 1문장)

---SECTION4---
마무리 요약. 100~200자.

---TAGS---
관련 태그 5개, 쉼표 구분

규칙:
- 본문은 네이버 블로그 스타일, 친근하고 읽기 쉽게 작성
- 이미지 프롬프트는 영어로, 구체적인 장면 묘사
- 구분자(---TITLE--- 등)를 정확히 그대로 사용`;

    await this.sendPrompt(prompt);
    await this.waitForTextResponse();
    const text = await this.getLastResponseText();

    console.log(`[Gemini] 응답 수신 (${text.length}자)`);
    const content = this.parseBlogContent(text);
    console.log(`[Gemini] 파싱 완료: 제목="${content.title}", 섹션=${content.sections.length}개, 태그=${content.tags.length}개`);

    return content;
  }

  private parseBlogContent(text: string): BlogContent {
    const result: BlogContent = { title: '', sections: [], tags: [] };

    const titleMatch = text.match(/---TITLE---\s*([\s\S]*?)(?=---SECTION)/);
    result.title = titleMatch ? titleMatch[1].trim().replace(/\n/g, ' ') : '';

    for (let i = 1; i <= 4; i++) {
      const nextBoundary = `(?=---IMAGE${i}---|---SECTION${i + 1}---|---TAGS---|$)`;
      const sectionRegex = new RegExp(`---SECTION${i}---\\s*([\\s\\S]*?)${nextBoundary}`);
      const sectionMatch = text.match(sectionRegex);
      const content = sectionMatch ? sectionMatch[1].trim() : '';

      const imgNextBoundary = `(?=---SECTION${i + 1}---|---TAGS---|$)`;
      const imageRegex = new RegExp(`---IMAGE${i}---\\s*([\\s\\S]*?)${imgNextBoundary}`);
      const imageMatch = text.match(imageRegex);
      const imagePrompt = imageMatch ? imageMatch[1].trim().split('\n')[0].trim() : undefined;

      if (content) {
        result.sections.push({ content, imagePrompt: imagePrompt || undefined });
      }
    }

    const tagsMatch = text.match(/---TAGS---\s*([\s\S]*?)$/);
    if (tagsMatch) {
      result.tags = tagsMatch[1]
        .trim()
        .split(/[,，\n]/)
        .map(t => t.replace(/^[\s#\-\d.]+/, '').trim())
        .filter(t => t.length > 0 && t.length < 20);
    }

    if (result.sections.length === 0) {
      result.title = result.title || '블로그 글';
      result.sections.push({ content: text });
    }

    return result;
  }
}
