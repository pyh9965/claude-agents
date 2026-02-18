/**
 * ChatGPT 웹 자동화 이미지 생성기
 *
 * Chrome CDP 연결된 Playwright Page를 받아 chatgpt.com에서
 * 이미지를 생성하고 다운로드합니다.
 *
 * 전략:
 *   - 동일한 Chrome 디버그 프로필(~/.chrome-debug-profile)에 ChatGPT도 로그인
 *   - 다중 셀렉터 폴백 (ChatGPT UI가 자주 변경되므로)
 *   - 이미지 다운로드 3단계 폴백: fetch→download 버튼→스크린샷
 *
 * 사전 준비:
 *   npm run chrome:setup → ChatGPT 로그인 (최초 1회)
 */
import { type Page } from 'playwright';
import { humanDelay } from './human-like';
import fs from 'fs';
import path from 'path';

export interface ImageGenerationOptions {
  /** 이미지 생성 프롬프트 */
  prompt: string;
  /** 이미지 저장 경로 */
  savePath: string;
  /** 생성 대기 타임아웃 ms (기본: 120000) */
  timeoutMs?: number;
}

export interface BlogContent {
  title: string;
  sections: Array<{
    content: string;
    imagePrompt?: string;
  }>;
  tags: string[];
}

export class ChatGPTImageGenerator {
  private page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  // ─── 네비게이션 & 로그인 확인 ───

  /** chatgpt.com으로 이동 + 로그인 상태 확인 */
  async navigateToChatGPT(): Promise<void> {
    console.log('[ChatGPT] chatgpt.com으로 이동...');
    await this.page.goto('https://chatgpt.com', {
      waitUntil: 'domcontentloaded',
    });
    await humanDelay(3000, 5000);

    const isLoggedIn = await this.checkLoginStatus();
    if (!isLoggedIn) {
      throw new Error(
        '[ChatGPT] 로그인되지 않음. npm run chrome:setup 으로 ChatGPT에 로그인하세요.',
      );
    }
    console.log('[ChatGPT] 로그인 상태 확인 완료');
  }

  /** 로그인 상태 확인 (로그인 버튼 유무로 판별) */
  private async checkLoginStatus(): Promise<boolean> {
    // 로그인 버튼이 보이면 미로그인 (이 체크를 먼저 해야 함)
    const loginSelectors = [
      'button:has-text("Log in")',
      'button:has-text("로그인")',
      'a:has-text("Log in")',
      'a:has-text("Sign up")',
      'button:has-text("Sign up")',
    ];

    for (const selector of loginSelectors) {
      try {
        const el = this.page.locator(selector).first();
        if (await el.isVisible({ timeout: 3_000 }).catch(() => false)) {
          return false;
        }
      } catch { /* continue */ }
    }

    // 로그인 버튼이 없으면 프롬프트 입력란 존재 여부 확인
    const loggedInSelectors = [
      '#prompt-textarea',
      '[data-testid="prompt-textarea"]',
      'div[contenteditable="true"][data-placeholder]',
    ];

    for (const selector of loggedInSelectors) {
      try {
        const el = this.page.locator(selector).first();
        if (await el.isVisible({ timeout: 5_000 }).catch(() => false)) {
          return true;
        }
      } catch { /* continue */ }
    }

    return false;
  }

  // ─── 대화 관리 ───

  /** 새 대화 시작 */
  async startNewChat(): Promise<void> {
    console.log('[ChatGPT] 새 대화 시작...');

    const newChatSelectors = [
      'a[data-testid="create-new-chat-button"]',
      'button[data-testid="create-new-chat-button"]',
      'nav a:has-text("New chat")',
      'nav a:has-text("새 채팅")',
      'a[href="/"]:has-text("ChatGPT")',
    ];

    for (const selector of newChatSelectors) {
      try {
        const btn = this.page.locator(selector).first();
        if (await btn.isVisible({ timeout: 3_000 }).catch(() => false)) {
          await btn.click();
          await humanDelay(1000, 2000);
          console.log('[ChatGPT] 새 대화 시작됨');
          return;
        }
      } catch { /* continue */ }
    }

    // 폴백: 메인 페이지로 직접 이동
    await this.page.goto('https://chatgpt.com', {
      waitUntil: 'domcontentloaded',
    });
    await humanDelay(2000, 3000);
    console.log('[ChatGPT] chatgpt.com 메인으로 이동 (새 대화 준비)');
  }

  // ─── 프롬프트 전송 ───

  /** 이미지 생성 프롬프트 전송 */
  async sendImagePrompt(prompt: string): Promise<void> {
    const preview = prompt.length > 60 ? prompt.substring(0, 60) + '...' : prompt;
    console.log(`[ChatGPT] 프롬프트 전송: "${preview}"`);

    // 텍스트 입력란 찾기
    const inputSelectors = [
      '#prompt-textarea',
      '[data-testid="prompt-textarea"]',
      'div[contenteditable="true"][data-placeholder]',
      'div[contenteditable="true"]',
      'textarea',
    ];

    let inputFound = false;
    for (const selector of inputSelectors) {
      try {
        const input = this.page.locator(selector).first();
        if (await input.isVisible({ timeout: 5_000 }).catch(() => false)) {
          await input.click();
          await humanDelay(300, 600);

          // contenteditable vs textarea 분기
          const tagName = await input.evaluate(el => el.tagName.toLowerCase());

          if (tagName === 'textarea') {
            await input.fill(prompt);
          } else {
            // contenteditable div: 붙여넣기로 빠르게 입력
            await this.page.evaluate((text) => {
              navigator.clipboard.writeText(text);
            }, prompt);
            await humanDelay(200, 400);
            await this.page.keyboard.press('Control+V');
          }

          inputFound = true;
          await humanDelay(500, 1000);
          break;
        }
      } catch { /* continue */ }
    }

    if (!inputFound) {
      // 디버그: 스크린샷 저장
      await this.page.screenshot({ path: 'test-results/debug-chatgpt-input-not-found.png' });
      throw new Error('[ChatGPT] 텍스트 입력란을 찾을 수 없습니다');
    }

    // 전송 버튼 클릭
    await humanDelay(300, 600);

    const sendSelectors = [
      'button[data-testid="send-button"]',
      'button[aria-label="Send prompt"]',
      'button[aria-label="메시지 전송"]',
      'form button[type="submit"]',
    ];

    let sendClicked = false;
    for (const selector of sendSelectors) {
      try {
        const btn = this.page.locator(selector).first();
        if (await btn.isVisible({ timeout: 3_000 }).catch(() => false)) {
          await btn.click();
          sendClicked = true;
          console.log('[ChatGPT] 프롬프트 전송 완료');
          break;
        }
      } catch { /* continue */ }
    }

    if (!sendClicked) {
      // 폴백: Enter 키
      await this.page.keyboard.press('Enter');
      console.log('[ChatGPT] Enter키로 프롬프트 전송');
    }

    await humanDelay(2000, 3000);
  }

  // ─── 이미지 생성 대기 ───

  /** 이미지 생성 완료 대기 (폴링) */
  async waitForImageGeneration(timeoutMs = 240_000): Promise<void> {
    console.log(`[ChatGPT] 이미지 생성 대기 (최대 ${timeoutMs / 1000}초)...`);

    const startTime = Date.now();
    let lastLog = startTime;

    while (Date.now() - startTime < timeoutMs) {
      const hasImage = await this.findGeneratedImage();
      if (hasImage) {
        console.log(
          `[ChatGPT] 이미지 생성 완료 (${Math.round((Date.now() - startTime) / 1000)}초 소요)`,
        );
        // 이미지 렌더링 안정화 대기
        await humanDelay(2000, 3000);
        return;
      }

      // 10초마다 진행 로그
      if (Date.now() - lastLog > 10_000) {
        console.log(
          `[ChatGPT] 대기 중... (${Math.round((Date.now() - startTime) / 1000)}초)`,
        );
        lastLog = Date.now();
      }

      await humanDelay(2000, 3000);
    }

    // 타임아웃 시 디버그 스크린샷
    await this.page.screenshot({ path: 'test-results/debug-chatgpt-timeout.png', fullPage: true });
    throw new Error(`[ChatGPT] 이미지 생성 타임아웃 (${timeoutMs / 1000}초 초과)`);
  }

  /** 생성된 이미지 존재 여부 확인 (생성 완료 상태만 감지) */
  private async findGeneratedImage(): Promise<boolean> {
    // "이미지 생성 중" 텍스트가 있으면 아직 생성 중 → 미완료
    const generatingTexts = [
      '이미지 생성 중',
      'Creating image',
      'Generating',
    ];
    for (const text of generatingTexts) {
      try {
        const el = this.page.locator(`text="${text}"`).first();
        if (await el.isVisible({ timeout: 1_000 }).catch(() => false)) {
          return false; // 아직 생성 중
        }
      } catch { /* continue */ }
    }

    // ChatGPT 응답 내 이미지 셀렉터 (우선순위 순)
    const imageSelectors = [
      // DALL-E 이미지 컨테이너
      '[data-testid="image-container"] img',
      // 응답 내 이미지 (다양한 src 패턴)
      '[data-message-author-role="assistant"] img[src*="oaidalleapi"]',
      '[data-message-author-role="assistant"] img[src*="dalle"]',
      '[data-message-author-role="assistant"] img[src*="openai"]',
      // blob URL 이미지
      '[data-message-author-role="assistant"] img[src^="blob:"]',
      // 일반 이미지 (아바타/아이콘 제외, 크기 큰 것만)
      '[data-message-author-role="assistant"] img:not([src*="avatar"]):not([src*="icon"]):not([alt="User"]):not([alt="ChatGPT"])',
      // 더 넓은 범위
      'article img[src*="oai"]',
      'article img[src^="blob:"]',
      'article img[src^="https://"]',
    ];

    for (const selector of imageSelectors) {
      try {
        const images = this.page.locator(selector);
        const count = await images.count();
        if (count === 0) continue;

        // 마지막 이미지가 로드 완료되었는지 확인 (최소 200px 이상)
        const img = images.last();
        const isLoaded = await img.evaluate((el: HTMLImageElement) => {
          return el.complete && el.naturalWidth > 200 && el.naturalHeight > 200;
        }).catch(() => false);

        if (isLoaded) return true;
      } catch { /* continue */ }
    }

    return false;
  }

  // ─── 이미지 다운로드 ───

  /**
   * 생성된 이미지 다운로드 → 로컬 파일 저장
   *
   * 4단계 폴백:
   *   1. 다운로드 버튼(↓) 클릭 → download 이벤트
   *   2. 이미지 src URL → fetch → base64 → 파일
   *   3. canvas 렌더링 → base64 → 파일
   *   4. 이미지 요소 스크린샷 (최후 수단)
   */
  async downloadGeneratedImage(savePath: string): Promise<string> {
    console.log(`[ChatGPT] 이미지 다운로드 → ${savePath}`);

    // 저장 디렉토리 생성
    const dir = path.dirname(savePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const imageSelectors = [
      '[data-testid="image-container"] img',
      '[data-message-author-role="assistant"] img[src*="oaidalleapi"]',
      '[data-message-author-role="assistant"] img[src*="dalle"]',
      '[data-message-author-role="assistant"] img[src*="openai"]',
      '[data-message-author-role="assistant"] img[src^="blob:"]',
      '[data-message-author-role="assistant"] img[src^="https://"]:not([src*="avatar"]):not([src*="icon"]):not([width="24"]):not([width="20"])',
      'article img[src*="oai"]',
      'article img[src^="blob:"]',
      'article img[src^="https://"]',
    ];

    // ── 방법 1: 다운로드 버튼(↓) 클릭 ──
    console.log('[ChatGPT] 방법 1: 다운로드 버튼 시도...');
    try {
      const downloadBtnSelectors = [
        // ChatGPT 이미지 하단 다운로드 버튼
        'button[aria-label*="Download"]',
        'button[aria-label*="다운로드"]',
        'button[aria-label*="download"]',
        // SVG 다운로드 아이콘 버튼 (↓ 화살표)
        'button:has(svg path[d*="M12"])',
        // 이미지 컨테이너 내 버튼
        '[data-testid="image-container"] button',
        // 일반 다운로드 링크
        'a[download]',
        'a[href*="download"]',
      ];

      for (const selector of downloadBtnSelectors) {
        try {
          const btn = this.page.locator(selector).last();
          if (await btn.isVisible({ timeout: 2_000 }).catch(() => false)) {
            const downloadPromise = this.page.waitForEvent('download', { timeout: 15_000 });
            await btn.click();
            const download = await downloadPromise;
            await download.saveAs(savePath);
            console.log(`[ChatGPT] 이미지 저장 완료 (다운로드 버튼): ${savePath}`);
            return savePath;
          }
        } catch { /* continue */ }
      }
    } catch (e: any) {
      console.log(`[ChatGPT] 다운로드 버튼 실패: ${e.message}`);
    }

    // ── 방법 2: fetch로 이미지 데이터 추출 ──
    console.log('[ChatGPT] 방법 2: fetch 시도...');
    for (const selector of imageSelectors) {
      try {
        const images = this.page.locator(selector);
        const count = await images.count();
        if (count === 0) continue;

        const img = images.last();
        const isLoaded = await img.evaluate((el: HTMLImageElement) =>
          el.complete && el.naturalWidth > 200,
        ).catch(() => false);
        if (!isLoaded) continue;

        console.log(`[ChatGPT] 이미지 발견 (${selector}), fetch 시도...`);

        const base64Data = await img.evaluate(async (el: HTMLImageElement) => {
          try {
            const response = await fetch(el.src, { credentials: 'include' });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const blob = await response.blob();
            return new Promise<string>((resolve, reject) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve(reader.result as string);
              reader.onerror = reject;
              reader.readAsDataURL(blob);
            });
          } catch {
            return null;
          }
        }).catch(() => null);

        if (base64Data) {
          const base64 = base64Data.replace(/^data:image\/\w+;base64,/, '');
          fs.writeFileSync(savePath, Buffer.from(base64, 'base64'));
          console.log(`[ChatGPT] 이미지 저장 완료 (fetch): ${savePath}`);
          return savePath;
        }
      } catch { /* continue */ }
    }

    // ── 방법 3: canvas 렌더링 ──
    console.log('[ChatGPT] 방법 3: canvas 렌더링 시도...');
    for (const selector of imageSelectors) {
      try {
        const images = this.page.locator(selector);
        const count = await images.count();
        if (count === 0) continue;

        const img = images.last();
        const isLoaded = await img.evaluate((el: HTMLImageElement) =>
          el.complete && el.naturalWidth > 200,
        ).catch(() => false);
        if (!isLoaded) continue;

        const canvasData = await img.evaluate((el: HTMLImageElement) => {
          try {
            const canvas = document.createElement('canvas');
            canvas.width = el.naturalWidth;
            canvas.height = el.naturalHeight;
            const ctx = canvas.getContext('2d')!;
            ctx.drawImage(el, 0, 0);
            return canvas.toDataURL('image/png');
          } catch {
            return null;
          }
        }).catch(() => null);

        if (canvasData) {
          const base64 = canvasData.replace(/^data:image\/\w+;base64,/, '');
          fs.writeFileSync(savePath, Buffer.from(base64, 'base64'));
          console.log(`[ChatGPT] 이미지 저장 완료 (canvas): ${savePath}`);
          return savePath;
        }
      } catch { /* continue */ }
    }

    // ── 방법 4: 요소 스크린샷 (최후 폴백) ──
    console.log('[ChatGPT] 방법 4: 스크린샷 폴백...');
    for (const selector of imageSelectors) {
      try {
        const img = this.page.locator(selector).last();
        if (await img.isVisible({ timeout: 2_000 }).catch(() => false)) {
          const box = await img.boundingBox();
          if (box && box.width > 200 && box.height > 200) {
            await img.screenshot({ path: savePath });
            console.log(`[ChatGPT] 이미지 저장 완료 (스크린샷): ${savePath}`);
            return savePath;
          }
        }
      } catch { /* continue */ }
    }

    // 실패 시 디버그: 페이지 내 모든 img 태그 정보 출력
    const allImages = await this.page.evaluate(() => {
      return Array.from(document.querySelectorAll('img')).map(img => ({
        src: img.src?.substring(0, 100),
        width: img.naturalWidth,
        height: img.naturalHeight,
        alt: img.alt?.substring(0, 50),
      }));
    }).catch(() => []);
    console.log('[ChatGPT] 페이지 내 이미지 목록:', JSON.stringify(allImages, null, 2));

    await this.page.screenshot({ path: 'test-results/debug-chatgpt-download-failed.png', fullPage: true });
    throw new Error('[ChatGPT] 이미지를 다운로드할 수 없습니다');
  }

  // ─── 통합 워크플로우 ───

  /**
   * 이미지 생성 전체 프로세스
   *
   * 1. chatgpt.com 접속 + 로그인 확인
   * 2. 새 대화 시작
   * 3. 프롬프트 전송
   * 4. 이미지 생성 대기
   * 5. 이미지 다운로드
   */
  async generateImage(options: ImageGenerationOptions): Promise<string> {
    const { prompt, savePath, timeoutMs = 240_000 } = options;

    await this.navigateToChatGPT();
    await this.startNewChat();
    await this.sendImagePrompt(prompt);
    await this.waitForImageGeneration(timeoutMs);
    return await this.downloadGeneratedImage(savePath);
  }

  // ─── 블로그 글 생성 ───

  /** ChatGPT에게 블로그 글 작성 요청 후 구조화된 데이터로 반환 */
  async generateBlogContent(topic: string): Promise<BlogContent> {
    console.log(`[ChatGPT] 블로그 글 생성 시작: "${topic}"`);

    await this.navigateToChatGPT();
    await this.startNewChat();

    const prompt = `네이버 블로그 글을 작성해줘.

주제: ${topic}

아래 형식으로 정확히 작성해줘. 구분자를 반드시 지켜줘:

---TITLE---
SEO 최적화된 블로그 제목 한 줄

---SECTION1---
도입부. 300~500자. 독자의 관심을 끄는 도입부.

---IMAGE1---
이 섹션에 어울리는 사실적인 사진 스타일 DALL-E 이미지 프롬프트 (영어, 1문장)

---SECTION2---
핵심 정보. 500~800자. 주제의 본론.

---IMAGE2---
이 섹션에 어울리는 사실적인 사진 스타일 DALL-E 이미지 프롬프트 (영어, 1문장)

---SECTION3---
팁/추천/비교. 300~500자.

---IMAGE3---
이 섹션에 어울리는 사실적인 사진 스타일 DALL-E 이미지 프롬프트 (영어, 1문장)

---SECTION4---
마무리 요약. 100~200자.

---TAGS---
관련 태그 5개, 쉼표 구분

규칙:
- 본문은 네이버 블로그 스타일, 친근하고 읽기 쉽게 작성
- 이미지 프롬프트는 영어로, 구체적인 장면 묘사
- 구분자(---TITLE--- 등)를 정확히 그대로 사용`;

    await this.sendImagePrompt(prompt);
    await this.waitForTextResponse();
    const responseText = await this.getLastResponseText();

    console.log(`[ChatGPT] 응답 수신 (${responseText.length}자)`);
    const content = this.parseBlogContent(responseText);
    console.log(`[ChatGPT] 파싱 완료: 제목="${content.title}", 섹션=${content.sections.length}개, 태그=${content.tags.length}개`);

    return content;
  }

  /** ChatGPT 텍스트 응답 완료 대기 */
  async waitForTextResponse(timeoutMs = 120_000): Promise<void> {
    console.log('[ChatGPT] 텍스트 응답 대기 중...');
    const startTime = Date.now();

    // 1단계: 응답 시작 감지 (stop 버튼 또는 assistant 메시지)
    while (Date.now() - startTime < 15_000) {
      const stopBtn = this.page.locator(
        'button[data-testid="stop-button"], button[aria-label="Stop generating"], button[aria-label="응답 중지"]',
      );
      if (await stopBtn.first().isVisible({ timeout: 1_000 }).catch(() => false)) {
        break;
      }
      const msgs = this.page.locator('[data-message-author-role="assistant"]');
      if ((await msgs.count()) > 0) break;
      await humanDelay(500, 1000);
    }

    // 2단계: 스트리밍 완료 대기 (stop 버튼 사라짐 + 텍스트 안정화)
    let lastText = '';
    let stableCount = 0;
    let lastLog = startTime;

    while (Date.now() - startTime < timeoutMs) {
      const stopBtn = this.page.locator(
        'button[data-testid="stop-button"], button[aria-label="Stop generating"], button[aria-label="응답 중지"]',
      );
      const isGenerating = await stopBtn.first().isVisible({ timeout: 1_500 }).catch(() => false);

      if (!isGenerating) {
        const currentText = await this.getLastResponseText().catch(() => '');
        if (currentText.length > 50 && currentText === lastText) {
          stableCount++;
          if (stableCount >= 2) {
            console.log(
              `[ChatGPT] 응답 완료 (${Math.round((Date.now() - startTime) / 1000)}초 소요, ${currentText.length}자)`,
            );
            return;
          }
        } else {
          lastText = currentText;
          stableCount = 0;
        }
      }

      if (Date.now() - lastLog > 10_000) {
        console.log(`[ChatGPT] 응답 대기 중... (${Math.round((Date.now() - startTime) / 1000)}초)`);
        lastLog = Date.now();
      }

      await humanDelay(1500, 2500);
    }

    await this.page.screenshot({ path: 'test-results/debug-chatgpt-text-timeout.png', fullPage: true });
    throw new Error(`[ChatGPT] 텍스트 응답 타임아웃 (${timeoutMs / 1000}초 초과)`);
  }

  /** ChatGPT 마지막 응답 텍스트 추출 */
  async getLastResponseText(): Promise<string> {
    return await this.page.evaluate(() => {
      const messages = document.querySelectorAll('[data-message-author-role="assistant"]');
      if (messages.length === 0) return '';
      const lastMsg = messages[messages.length - 1];
      const markdown = lastMsg.querySelector('.markdown, .prose');
      return (markdown || lastMsg).textContent?.trim() || '';
    });
  }

  /** 구조화된 응답 텍스트 파싱 */
  private parseBlogContent(text: string): BlogContent {
    const result: BlogContent = { title: '', sections: [], tags: [] };

    // 제목
    const titleMatch = text.match(/---TITLE---\s*([\s\S]*?)(?=---SECTION)/);
    result.title = titleMatch ? titleMatch[1].trim().replace(/\n/g, ' ') : '';

    // 섹션 + 이미지 프롬프트
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

    // 태그
    const tagsMatch = text.match(/---TAGS---\s*([\s\S]*?)$/);
    if (tagsMatch) {
      result.tags = tagsMatch[1]
        .trim()
        .split(/[,，\n]/)
        .map(t => t.replace(/^[\s#\-\d.]+/, '').trim())
        .filter(t => t.length > 0 && t.length < 20);
    }

    // 폴백: 파싱 실패 시 전체 텍스트를 단일 섹션으로
    if (result.sections.length === 0) {
      console.log('[ChatGPT] 구조 파싱 실패 → 전체 텍스트를 단일 섹션으로 처리');
      result.title = result.title || '블로그 글';
      result.sections.push({ content: text });
    }

    return result;
  }
}
