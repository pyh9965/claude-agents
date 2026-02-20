/**
 * Claude AI 웹 자동화 블로그 글 생성기
 *
 * Chrome CDP 연결된 Playwright Page를 받아 claude.ai에서
 * 블로그 글을 생성합니다.
 *
 * 핵심 전략: 스트리밍 중 [data-is-streaming="true"] 요소에서 텍스트를
 * 실시간 캡처합니다. 이 시점에서 해당 요소는 확실히 어시스턴트 응답입니다.
 *
 * 제약: Claude는 이미지 생성 기능이 없습니다.
 * 이미지 생성이 필요하면 ChatGPT/Gemini를 사용하세요.
 *
 * 사전 준비: Chrome 디버그 프로필에서 claude.ai 로그인 (최초 1회)
 */
import { type Page } from 'playwright';
import { humanDelay } from './human-like';
import type { BlogContent, ImageGenerationOptions } from './chatgpt-image';
import fs from 'fs';
import path from 'path';

export class ClaudeGenerator {
  private page: Page;

  /** 스트리밍 중 캡처된 응답 텍스트 (가장 신뢰할 수 있는 소스) */
  private capturedResponseText = '';

  constructor(page: Page) {
    this.page = page;
  }

  // ─── 네비게이션 & 로그인 확인 ───

  async navigateToClaude(): Promise<void> {
    console.log('[Claude] claude.ai로 이동...');
    await this.page.goto('https://claude.ai/new', {
      waitUntil: 'domcontentloaded',
    });
    await humanDelay(3000, 5000);

    const isLoggedIn = await this.checkLoginStatus();
    if (!isLoggedIn) {
      throw new Error('[Claude] 로그인되지 않음. Chrome 디버그 프로필에서 claude.ai에 로그인하세요.');
    }
    console.log('[Claude] 로그인 상태 확인 완료');
  }

  private async checkLoginStatus(): Promise<boolean> {
    const loginSelectors = [
      'button:has-text("Log in")',
      'a:has-text("Log in")',
      'button:has-text("Sign up")',
      'a:has-text("Sign up")',
      'button:has-text("로그인")',
      'a:has-text("Get started")',
    ];
    for (const sel of loginSelectors) {
      if (await this.page.locator(sel).first().isVisible({ timeout: 2_000 }).catch(() => false)) {
        return false;
      }
    }

    const loggedInSelectors = [
      'div.ProseMirror[contenteditable="true"]',
      'div[contenteditable="true"]',
      'fieldset div[contenteditable="true"]',
      '[data-placeholder]',
      'p[data-placeholder]',
    ];
    for (const sel of loggedInSelectors) {
      if (await this.page.locator(sel).first().isVisible({ timeout: 5_000 }).catch(() => false)) {
        return true;
      }
    }

    return true;
  }

  // ─── 새 대화 시작 ───

  async startNewChat(): Promise<void> {
    console.log('[Claude] 새 대화 시작...');

    const currentUrl = this.page.url();
    if (!currentUrl.includes('claude.ai/new')) {
      await this.page.goto('https://claude.ai/new', { waitUntil: 'domcontentloaded' });
      await humanDelay(2000, 3000);
    }

    const inputSelectors = [
      'div.ProseMirror[contenteditable="true"]',
      'div[contenteditable="true"]',
      'fieldset div[contenteditable="true"]',
    ];
    for (const sel of inputSelectors) {
      if (await this.page.locator(sel).first().isVisible({ timeout: 5_000 }).catch(() => false)) {
        console.log('[Claude] 새 대화 준비 완료');
        return;
      }
    }

    console.log('[Claude] /new 페이지 로드 완료 (입력란 대기 중)');
    await humanDelay(1000, 2000);
  }

  // ─── 프롬프트 전송 ───

  async sendPrompt(prompt: string): Promise<void> {
    const preview = prompt.length > 70 ? prompt.substring(0, 70) + '...' : prompt;
    console.log(`[Claude] 프롬프트 전송: "${preview}"`);

    const inputSelectors = [
      'div.ProseMirror[contenteditable="true"]',
      'fieldset div[contenteditable="true"]',
      'div[contenteditable="true"][data-placeholder]',
      'div[contenteditable="true"]',
      'p[data-placeholder]',
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
      this.saveDebugScreenshot('input-not-found');
      throw new Error('[Claude] 텍스트 입력란을 찾을 수 없습니다');
    }

    // 전송 버튼
    const sendSelectors = [
      'button[aria-label="Send Message"]',
      'button[aria-label="Send message"]',
      'button[aria-label="메시지 보내기"]',
      'button[type="submit"]',
      'button:has(svg[viewBox="0 0 256 256"])',
      'button:has(> svg)',
    ];

    let sent = false;
    for (const sel of sendSelectors) {
      const btn = this.page.locator(sel).first();
      if (await btn.isVisible({ timeout: 3_000 }).catch(() => false)) {
        const isDisabled = await btn.isDisabled().catch(() => false);
        if (!isDisabled) {
          await btn.click();
          sent = true;
          console.log('[Claude] 프롬프트 전송 완료');
          break;
        }
      }
    }

    if (!sent) {
      await this.page.keyboard.press('Enter');
      console.log('[Claude] Enter키로 프롬프트 전송');
    }

    await humanDelay(2000, 3000);
  }

  // ─── 핵심: 텍스트 응답 대기 + 실시간 캡처 ───

  /**
   * Claude 응답이 완료될 때까지 대기하면서 텍스트를 실시간 캡처합니다.
   *
   * 전략:
   * 1. [data-is-streaming="true"] 감지 → 스트리밍 중 텍스트 캡처
   *    이 시점에서 해당 요소는 확실히 어시스턴트의 응답
   * 2. 스트리밍 완료 감지 (streaming="false" 또는 Stop 버튼 사라짐)
   * 3. 안정성 확인 (텍스트가 더 이상 변하지 않으면 완료)
   */
  async waitForTextResponse(timeoutMs = 180_000): Promise<void> {
    console.log('[Claude] 텍스트 응답 대기 중...');
    this.capturedResponseText = '';

    const startTime = Date.now();
    let streamingDetected = false;
    let stableCount = 0;
    let lastCapturedLen = 0;
    let lastLogTime = startTime;

    // 응답 시작까지 잠시 대기
    await humanDelay(3000, 5000);

    while (Date.now() - startTime < timeoutMs) {
      const result = await this.page.evaluate(() => {
        // ── 1단계: 활성 스트리밍 요소 탐색 ──
        const streamingTrue = document.querySelector('[data-is-streaming="true"]');
        if (streamingTrue) {
          // 스트리밍 중! 이 요소는 확실히 어시스턴트 응답.
          // <details> (thinking 블록) 제외하고 텍스트 추출
          const clone = streamingTrue.cloneNode(true) as HTMLElement;
          clone.querySelectorAll('details').forEach(d => d.remove());
          const text = (clone.innerText || clone.textContent || '').trim();
          return { phase: 'streaming' as const, text, len: text.length };
        }

        // ── 2단계: 스트리밍 완료 요소 탐색 ──
        const streamingFalse = document.querySelector('[data-is-streaming="false"]');
        if (streamingFalse) {
          // user-message 내부가 아닌지 확인
          if (!streamingFalse.closest('[data-testid="user-message"]')) {
            const clone = streamingFalse.cloneNode(true) as HTMLElement;
            clone.querySelectorAll('details').forEach(d => d.remove());
            const text = (clone.innerText || clone.textContent || '').trim();
            return { phase: 'completed' as const, text, len: text.length };
          }
        }

        // ── 3단계: Stop 버튼으로 생성 중 감지 ──
        const buttons = document.querySelectorAll('button');
        for (const btn of buttons) {
          const label = btn.getAttribute('aria-label') || '';
          const text = btn.textContent || '';
          if (label.includes('Stop') || label.includes('중지') || text.includes('Stop')) {
            return { phase: 'generating' as const, text: '', len: 0 };
          }
        }

        // ── 4단계: 깜빡이는 커서 애니메이션 감지 ──
        if (document.querySelector('[class*="cursor"][class*="blink"], .animate-pulse')) {
          return { phase: 'generating' as const, text: '', len: 0 };
        }

        return { phase: 'idle' as const, text: '', len: 0 };
      }).catch(() => ({ phase: 'error' as const, text: '', len: 0 }));

      // 결과 처리
      if (result.phase === 'streaming') {
        streamingDetected = true;
        this.capturedResponseText = result.text;
        stableCount = 0;

        if (Date.now() - lastLogTime > 10_000) {
          console.log(`[Claude] 스트리밍 중... ${result.len}자 수신`);
          lastLogTime = Date.now();
        }
      } else if (result.phase === 'completed') {
        // 스트리밍이 false로 변경됨 → 완료
        if (result.len > 50) {
          this.capturedResponseText = result.text;
          console.log(`[Claude] 스트리밍 완료 (data-is-streaming="false"), ${result.len}자`);
          // 안정성 확인 한 번 더
          await humanDelay(2000, 3000);
          return;
        }
      } else if (result.phase === 'generating') {
        streamingDetected = true;
        stableCount = 0;
      } else if (result.phase === 'idle') {
        if (streamingDetected && this.capturedResponseText.length > 50) {
          // 스트리밍이 감지됐었는데 이제 관련 요소가 모두 사라짐
          // → 캡처된 텍스트로 완료 처리
          stableCount++;
          if (stableCount >= 2) {
            console.log(`[Claude] 스트리밍 요소 사라짐, 캡처된 텍스트 사용 (${this.capturedResponseText.length}자)`);
            return;
          }
        } else if (!streamingDetected) {
          // 아직 스트리밍이 시작되지 않음 → 계속 대기
        }
      }

      // 텍스트 길이 변화 로그
      if (this.capturedResponseText.length !== lastCapturedLen && this.capturedResponseText.length > 0) {
        lastCapturedLen = this.capturedResponseText.length;
      }

      await humanDelay(2000, 3000);
    }

    // 타임아웃이지만 캡처된 텍스트가 있으면 사용
    if (this.capturedResponseText.length > 50) {
      console.log(`[Claude] 타임아웃이지만 캡처된 텍스트 있음 (${this.capturedResponseText.length}자)`);
      return;
    }

    this.saveDebugScreenshot('text-timeout');
    throw new Error(`[Claude] 텍스트 응답 타임아웃 (${timeoutMs / 1000}초 초과)`);
  }

  /**
   * 마지막 어시스턴트 응답 텍스트 반환
   *
   * 우선순위:
   * 1. 아티팩트 패널에서 추출 (Claude가 artifact로 출력하는 경우 최우선)
   * 2. 스트리밍 중 캡처된 텍스트
   * 3. DOM에서 직접 추출
   * 4. Copy 버튼 + 클립보드
   */
  async getLastResponseText(): Promise<string> {
    // ── 소스 1: 아티팩트 패널 (최우선) ──
    const artifactText = await this.extractFromArtifact();
    if (artifactText.length > 50) {
      const cleaned = this.cleanResponseText(artifactText);
      if (cleaned.includes('---TITLE---') && cleaned.includes('---SECTION')) {
        console.log(`[Claude] 아티팩트에서 마커 확인됨 (${cleaned.length}자)`);
        return cleaned;
      }
      console.log(`[Claude] 아티팩트 텍스트에 마커 없음 (${cleaned.length}자), 다음 소스 시도`);
    }

    // ── 소스 2: 스트리밍 중 캡처된 텍스트 ──
    if (this.capturedResponseText.length > 50) {
      let text = this.cleanResponseText(this.capturedResponseText);
      if (text.includes('---TITLE---') && text.includes('---SECTION')) {
        console.log(`[Claude] 캡처된 텍스트에서 마커 확인됨 (${text.length}자)`);
        return text;
      }
      console.log(`[Claude] 캡처된 텍스트에 마커 없음 (${text.length}자), DOM 폴백 시도`);
    }

    // ── 소스 3: DOM에서 직접 추출 ──
    const domText = await this.extractFromDOM();
    if (domText.length > 50) {
      const cleaned = this.cleanResponseText(domText);
      if (cleaned.includes('---TITLE---')) {
        console.log(`[Claude] DOM에서 마커 확인됨 (${cleaned.length}자)`);
        return cleaned;
      }
    }

    // ── 소스 4: Copy 버튼 + 클립보드 ──
    const clipText = await this.extractViaCopyButton();
    if (clipText.length > 50) {
      const cleaned = this.cleanResponseText(clipText);
      console.log(`[Claude] Copy 버튼에서 추출 (${cleaned.length}자)`);
      return cleaned;
    }

    // 어떤 소스든 가장 긴 텍스트 반환
    const best = [artifactText, this.capturedResponseText, domText, clipText]
      .map(t => this.cleanResponseText(t))
      .sort((a, b) => b.length - a.length)[0];

    if (best.length > 0) {
      console.log(`[Claude] 최선의 텍스트 반환 (${best.length}자)`);
      return best;
    }

    this.saveDebugScreenshot('no-response-text');
    return '';
  }

  /**
   * 아티팩트 패널에서 텍스트 추출
   *
   * Claude가 구조화된 콘텐츠를 아티팩트(오른쪽 패널)로 출력하는 경우,
   * 대화 영역에는 설명 텍스트만 있고 실제 콘텐츠는 아티팩트에 있음.
   *
   * 전략:
   * 1. 아티팩트 패널의 "복사" 버튼 클릭 → 클립보드에서 텍스트 추출
   * 2. 아티팩트 패널 DOM에서 직접 텍스트 추출 (폴백)
   */
  private async extractFromArtifact(): Promise<string> {
    try {
      // ── 전략 1: 아티팩트 "복사" 버튼 클릭 ──
      // 아티팩트 패널 헤더의 "복사" 버튼은 대화 영역의 Copy 버튼과 다름
      const copyBtnSelectors = [
        // 아티팩트 헤더 영역의 복사 버튼
        'button:has-text("복사")',
        'button:has-text("Copy")',
        '[data-testid="copy-artifact"] button',
        '[aria-label="Copy artifact"]',
        '[aria-label="복사"]',
      ];

      for (const sel of copyBtnSelectors) {
        const btns = this.page.locator(sel);
        const count = await btns.count().catch(() => 0);
        if (count === 0) continue;

        // 아티팩트 패널의 복사 버튼을 찾기 위해 각 버튼 검사
        for (let i = 0; i < count; i++) {
          const btn = btns.nth(i);
          if (!await btn.isVisible({ timeout: 2_000 }).catch(() => false)) continue;

          // 아티팩트 패널 내부의 버튼인지 확인 (대화 영역이 아닌)
          const isInArtifact = await btn.evaluate((el) => {
            // 아티팩트 패널은 보통 aside, [role="complementary"],
            // 또는 특정 클래스를 가진 패널 안에 있음
            const parent = el.closest('[class*="artifact"], [class*="Artifact"], [role="complementary"], aside, [class*="side-panel"], [class*="panel"]');
            // 또는 대화 영역 밖에 있는 경우
            const inConversation = el.closest('[class*="conversation"], [class*="chat-message"], [data-testid="user-message"]');
            return !!parent || !inConversation;
          }).catch(() => false);

          if (!isInArtifact) continue;

          await btn.click();
          await humanDelay(500, 800);

          const text = await this.page.evaluate(() =>
            navigator.clipboard.readText(),
          ).catch(() => '');

          if (text.length > 50) {
            console.log(`[Claude] 아티팩트 복사 버튼으로 ${text.length}자 추출`);
            return text;
          }
        }
      }

      // ── 전략 2: 아티팩트 패널 DOM에서 직접 추출 ──
      const artifactText = await this.page.evaluate(() => {
        // 아티팩트 콘텐츠 영역 탐색
        const artifactSelectors = [
          '[class*="artifact-content"]',
          '[class*="ArtifactContent"]',
          '[data-testid*="artifact"] [class*="content"]',
          '[role="complementary"] [class*="content"]',
          // 아티팩트는 보통 code 또는 pre 또는 markdown 렌더링 영역에 있음
          'aside [class*="prose"]',
          'aside pre',
          '[class*="side-panel"] [class*="prose"]',
        ];

        for (const sel of artifactSelectors) {
          const els = document.querySelectorAll(sel);
          for (const el of els) {
            const text = (el.textContent || '').trim();
            if (text.includes('---TITLE---') && text.includes('---SECTION')) {
              return text;
            }
          }
        }

        // 대화 영역이 아닌 곳에서 ---TITLE--- 마커를 포함한 텍스트 블록 찾기
        const allElements = document.querySelectorAll('div, section, article, aside, pre, code');
        for (const el of allElements) {
          // 대화 메시지 영역 내부는 건너뛰기
          if (el.closest('[data-testid="user-message"]')) continue;
          if (el.closest('[data-is-streaming]')) continue;

          const text = (el.textContent || '').trim();
          // 마커가 있고, 프롬프트 템플릿이 아닌 것
          if (text.includes('---TITLE---') &&
              text.includes('---SECTION1---') &&
              text.includes('---IMAGE1---') &&
              !text.includes('아래 형식으로 정확히 작성해줘') &&
              !text.includes('구분자를 반드시 지켜줘') &&
              text.length < 10000) { // 너무 긴 것은 전체 페이지
            // 자식 요소 중 더 정확한 것이 있는지 확인
            const children = el.querySelectorAll('div, section, pre');
            let bestChild = '';
            for (const child of children) {
              const ct = (child.textContent || '').trim();
              if (ct.includes('---TITLE---') && ct.includes('---SECTION1---') &&
                  ct.length > 100 && ct.length < text.length) {
                if (!bestChild || ct.length < bestChild.length) {
                  bestChild = ct;
                }
              }
            }
            return bestChild || text;
          }
        }

        return '';
      }).catch(() => '');

      if (artifactText.length > 50) {
        console.log(`[Claude] 아티팩트 DOM에서 ${artifactText.length}자 추출`);
        return artifactText;
      }

    } catch (e: any) {
      console.log(`[Claude] 아티팩트 추출 실패: ${e.message}`);
    }

    return '';
  }

  /** DOM에서 어시스턴트 응답 텍스트 직접 추출 */
  private async extractFromDOM(): Promise<string> {
    return await this.page.evaluate(() => {
      // 모든 data-is-streaming 요소 중 user-message가 아닌 것
      const streamEls = document.querySelectorAll('[data-is-streaming]');
      for (let i = streamEls.length - 1; i >= 0; i--) {
        const el = streamEls[i];
        if (!el.closest('[data-testid="user-message"]')) {
          const clone = el.cloneNode(true) as HTMLElement;
          clone.querySelectorAll('details').forEach(d => d.remove());
          return (clone.innerText || clone.textContent || '').trim();
        }
      }

      // .font-claude-response 시도
      const responses = document.querySelectorAll('.font-claude-response');
      if (responses.length > 0) {
        const last = responses[responses.length - 1];
        const clone = last.cloneNode(true) as HTMLElement;
        clone.querySelectorAll('details').forEach(d => d.remove());
        return (clone.innerText || clone.textContent || '').trim();
      }

      // user-message가 아닌 메시지 블록 탐색
      const userMsgs = document.querySelectorAll('[data-testid="user-message"]');
      if (userMsgs.length > 0) {
        const lastUserMsg = userMsgs[userMsgs.length - 1];
        // user-message의 최상위 턴 컨테이너를 찾고, 그 다음 형제가 어시스턴트 턴
        let turnContainer = lastUserMsg.parentElement;
        while (turnContainer && turnContainer.parentElement) {
          const parent = turnContainer.parentElement;
          const siblings = parent.children;
          let foundUser = false;
          for (let i = 0; i < siblings.length; i++) {
            if (siblings[i] === turnContainer || siblings[i].contains(lastUserMsg)) {
              foundUser = true;
              continue;
            }
            if (foundUser) {
              // 유저 메시지 다음 형제 = 어시스턴트 응답
              const text = (siblings[i].innerText || siblings[i].textContent || '').trim();
              if (text.length > 100 && !siblings[i].querySelector('[data-testid="user-message"]')) {
                return text;
              }
            }
          }
          turnContainer = parent;
        }
      }

      return '';
    }).catch(() => '');
  }

  /** Copy 버튼을 클릭해서 클립보드에서 텍스트 추출 (최후 수단) */
  private async extractViaCopyButton(): Promise<string> {
    try {
      // Copy 버튼 찾기 (aria-label 또는 텍스트 기반)
      const copySelectors = [
        'button[aria-label*="Copy"]',
        'button[aria-label*="copy"]',
        'button[aria-label*="복사"]',
      ];

      for (const sel of copySelectors) {
        const btns = this.page.locator(sel);
        const count = await btns.count().catch(() => 0);
        if (count > 0) {
          // 마지막 Copy 버튼 (가장 최근 메시지의 것)
          const lastBtn = btns.nth(count - 1);
          if (await lastBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
            await lastBtn.click();
            await humanDelay(300, 500);
            const text = await this.page.evaluate(() =>
              navigator.clipboard.readText(),
            ).catch(() => '');
            if (text.length > 50) {
              console.log(`[Claude] Copy 버튼으로 클립보드에서 ${text.length}자 추출`);
              return text;
            }
          }
        }
      }
    } catch (e: any) {
      console.log(`[Claude] Copy 버튼 추출 실패: ${e.message}`);
    }
    return '';
  }

  /** 응답 텍스트 정리: thinking 제거, 프롬프트 텍스트 제거 */
  private cleanResponseText(rawText: string): string {
    let text = rawText.trim();
    if (!text) return '';

    // thinking 제거: ---TITLE--- 이전의 모든 텍스트 (영어 reasoning 등)
    const titleIdx = text.indexOf('---TITLE---');
    if (titleIdx > 0) {
      text = text.substring(titleIdx);
    }

    return text.trim();
  }

  // ─── 블로그 글 생성 ───

  async generateBlogContent(topic: string): Promise<BlogContent> {
    console.log(`[Claude] 블로그 글 생성 시작: "${topic}"`);

    await this.navigateToClaude();
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
- 구분자(---TITLE--- 등)를 정확히 그대로 사용
- 중요: artifact를 생성하지 말고 이 대화창에 직접 텍스트로 출력해줘`;

    await this.sendPrompt(prompt);
    await this.waitForTextResponse();

    const text = await this.getLastResponseText();
    console.log(`[Claude] 응답 수신 (${text.length}자)`);

    // 디버그: 추출된 텍스트의 처음 200자 로그
    console.log(`[Claude] 텍스트 미리보기: "${text.substring(0, 200).replace(/\n/g, '↵')}"`);

    // 추출된 텍스트에 마커가 없거나 프롬프트 템플릿인 경우 → 아티팩트/bruteForce 재시도
    const needsRetry = !text.includes('---TITLE---') ||
      !text.includes('---SECTION1---') ||
      text.includes('구분자를 반드시 지켜줘') ||
      text.includes('아래 형식으로 정확히 작성해줘');

    if (needsRetry) {
      console.log('[Claude] ⚠️ 텍스트에 마커 없거나 프롬프트 혼입 → 재추출 시도');
      this.saveDebugScreenshot('needs-retry');

      // 아티팩트에서 한 번 더 시도 (응답 완료 후 패널이 열렸을 수 있음)
      const artifactRetry = await this.extractFromArtifact();
      if (artifactRetry.length > 100 && artifactRetry.includes('---TITLE---')) {
        console.log(`[Claude] 아티팩트 재추출 성공 (${artifactRetry.length}자)`);
        text = this.cleanResponseText(artifactRetry);
      } else {
        // DOM 전체 분석 후 재추출 시도
        const retryText = await this.bruteForceExtract();
        if (retryText.length > 100 && retryText.includes('---TITLE---')) {
          console.log(`[Claude] bruteForce 재추출 성공 (${retryText.length}자)`);
          text = this.cleanResponseText(retryText);
        }
      }
    }

    const content = this.parseBlogContent(text);
    console.log(`[Claude] 파싱 완료: 제목="${content.title}", 섹션=${content.sections.length}개, 태그=${content.tags.length}개`);

    return content;
  }

  /**
   * DOM 전체를 분석해서 어시스턴트 응답을 brute-force로 찾기
   * 모든 전략이 실패했을 때 사용하는 최후 수단
   */
  private async bruteForceExtract(): Promise<string> {
    return await this.page.evaluate(() => {
      const results: Array<{ text: string; source: string }> = [];

      // 페이지의 모든 요소 중 ---TITLE---와 ---SECTION1---을 모두 포함하는 것 찾기
      const allElements = document.querySelectorAll('*');
      for (const el of allElements) {
        // user-message 내부는 건너뛰기
        if (el.closest('[data-testid="user-message"]')) continue;

        const text = (el.innerText || el.textContent || '').trim();

        // 프롬프트 템플릿이 아닌 실제 응답인지 확인
        // 프롬프트에는 "아래 형식으로 정확히 작성해줘"가 포함됨
        // 실제 응답에는 포함되지 않음
        if (text.includes('---TITLE---') &&
            text.includes('---SECTION1---') &&
            !text.includes('아래 형식으로 정확히 작성해줘') &&
            !text.includes('구분자를 반드시 지켜줘')) {
          results.push({
            text,
            source: `<${el.tagName.toLowerCase()} class="${(el.className?.toString() || '').substring(0, 60)}">`,
          });
        }
      }

      if (results.length === 0) {
        // 프롬프트 제외 필터 없이 다시 시도 (마지막에서 응답만 추출)
        for (const el of allElements) {
          if (el.closest('[data-testid="user-message"]')) continue;

          const text = (el.innerText || el.textContent || '').trim();
          if (text.includes('---TITLE---') && text.includes('---SECTION1---')) {
            // ---TITLE---가 2번 이상 나오면 마지막 것만 사용
            const lastTitleIdx = text.lastIndexOf('---TITLE---');
            const secondLastTitleIdx = text.lastIndexOf('---TITLE---', lastTitleIdx - 1);
            if (secondLastTitleIdx >= 0) {
              // 유저 프롬프트 + 응답이 합쳐진 경우 → 마지막 ---TITLE---부터
              results.push({
                text: text.substring(lastTitleIdx),
                source: `<${el.tagName.toLowerCase()}> [split-from-idx-${lastTitleIdx}]`,
              });
            } else {
              results.push({
                text,
                source: `<${el.tagName.toLowerCase()}> [no-filter]`,
              });
            }
          }
        }
      }

      // 가장 짧은 것이 가장 정확 (불필요한 wrapper 텍스트 제외)
      // 단, 최소 100자 이상이어야 실제 응답
      const valid = results.filter(r => r.text.length > 100);
      valid.sort((a, b) => a.text.length - b.text.length);

      if (valid.length > 0) {
        return valid[0].text;
      }

      return '';
    }).catch(() => '');
  }

  private parseBlogContent(rawText: string): BlogContent {
    const result: BlogContent = { title: '', sections: [], tags: [] };

    // 유저 프롬프트 + Claude 응답이 합쳐진 경우 대비:
    // ---TITLE---가 2회 이상 등장하면 마지막 응답 부분만 사용
    let text = rawText;
    const titleOccurrences = text.split('---TITLE---');
    if (titleOccurrences.length > 2) {
      const lastIdx = text.lastIndexOf('---TITLE---');
      text = text.substring(lastIdx);
      console.log('[Claude] 중복 마커 감지 → 마지막 응답 부분만 파싱');
    }

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
      let imagePrompt = imageMatch ? imageMatch[1].trim().split('\n')[0].trim() : undefined;

      // 템플릿 지시문이 캡처된 경우 무시 (한글 지시문은 이미지 프롬프트가 아님)
      if (imagePrompt && /이 섹션에 어울리는|사실적인 사진 스타일|이미지 프롬프트/.test(imagePrompt)) {
        console.log(`[Claude] IMAGE${i} 템플릿 지시문 감지 → 건너뜀`);
        imagePrompt = undefined;
      }

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
      console.log('[Claude] 구조 파싱 실패 → 전체 텍스트를 단일 섹션으로 처리');
      result.title = result.title || '블로그 글';
      result.sections.push({ content: text });
    }

    return result;
  }

  // ─── 이미지 생성 (미지원) ───

  async generateImage(_options: ImageGenerationOptions): Promise<string> {
    throw new Error('[Claude] Claude는 이미지 생성을 지원하지 않습니다. ChatGPT 또는 Gemini를 사용하세요.');
  }

  // ─── 유틸리티 ───

  private saveDebugScreenshot(label: string): void {
    const dir = path.resolve(__dirname, '../test-results');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const filePath = path.join(dir, `debug-claude-${label}.png`);
    this.page.screenshot({ path: filePath, fullPage: true }).catch(() => {});
    console.log(`[Claude] 디버그 스크린샷: ${filePath}`);
  }
}
