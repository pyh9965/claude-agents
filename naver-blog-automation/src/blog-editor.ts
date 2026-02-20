/**
 * 네이버 블로그 SmartEditor ONE 조작 헬퍼
 *
 * 에디터는 iframe#mainFrame 내부에 로드됨.
 * 모든 에디터 요소 조작은 this.frame (FrameLocator) 을 통해 수행.
 * 키보드 입력은 this.page.keyboard 사용 (iframe 포커스 시 자동 전달).
 *
 * 핸들링하는 예외 상황:
 *   - "작성 중인 글이 있습니다" 임시저장 복구 다이얼로그
 *   - 이벤트/프로모션 팝업 오버레이
 *   - iframe vs 직접 페이지 구조 분기
 */
import { type Page, type FrameLocator, type Locator, expect } from '@playwright/test';
import { spawnSync } from 'child_process';
import {
  humanDelay,
  humanTypeToLocator,
  humanScroll,
  humanMouseMove,
  pageLoadDelay,
  randomInt,
} from './human-like';

export interface BlogPostData {
  title: string;
  content: string;
  tags?: string[];
  category?: string;
  images?: string[];       // 파일 경로 배열
  isPublic?: boolean;      // 공개 여부 (기본: true)
  scheduledTime?: string;  // 예약 발행 시간 (선택)
}

/** 본문 중간에 이미지를 삽입하는 인터리브 포스팅 데이터 */
export interface InterleavedSection {
  content: string;         // 이 섹션의 본문 텍스트
  image?: string;          // 이 섹션 뒤에 삽입할 이미지 경로 (선택)
}

export interface InterleavedPostData {
  title: string;
  sections: InterleavedSection[];  // 본문 + 이미지가 번갈아 배치
  tags?: string[];
  category?: string;
  isPublic?: boolean;
}

export class NaverBlogEditor {
  readonly page: Page;
  readonly blogId: string;
  private frame!: FrameLocator;
  private useIframe = true;

  constructor(page: Page, blogId: string) {
    this.page = page;
    this.blogId = blogId;

    // "이 페이지를 이탈하시겠습니까?" beforeunload 다이얼로그 자동 수락
    this.page.on('dialog', (dialog) => {
      dialog.accept().catch(() => {});
    });
  }

  // ─── 블로그 가독성 포맷팅 ───

  /**
   * 블로그 본문을 사람이 쓴 것처럼 가독성 좋게 포맷팅
   * - 2~3문장마다 빈 줄(문단 구분) 삽입
   * - 이미 줄바꿈이 있는 텍스트는 기존 구조 유지
   * - 리스트/번호 항목은 그대로 보존
   */
  private formatForBlog(text: string): string {
    // 이미 충분한 문단 구분이 있으면 그대로 반환
    const existingParagraphs = text.split(/\n\s*\n/).filter(p => p.trim());
    if (existingParagraphs.length >= 3) {
      return text;
    }

    // 줄 단위로 분리
    const lines = text.split('\n');
    const result: string[] = [];

    for (const line of lines) {
      const trimmed = line.trim();

      // 빈 줄은 그대로 유지
      if (!trimmed) {
        result.push('');
        continue;
      }

      // 리스트/번호 항목은 그대로 보존
      if (/^[\d]+[.)]\s|^[-•·]\s|^[①-⑳]/.test(trimmed)) {
        result.push(trimmed);
        continue;
      }

      // 짧은 줄(제목/소제목 느낌)은 그대로
      if (trimmed.length < 30) {
        result.push(trimmed);
        continue;
      }

      // 긴 텍스트를 문장 단위로 분리하여 2~3문장마다 문단 나누기
      const formatted = this.splitIntoParagraphs(trimmed);
      result.push(formatted);
    }

    return result.join('\n');
  }

  /**
   * 긴 텍스트를 2~3문장 단위 문단으로 분리
   * 한국어 문장 종결 패턴: ~다. ~요. ~죠. ~죠! ~까? ~네. 등
   */
  private splitIntoParagraphs(text: string): string {
    // 문장 종결 패턴으로 분리 (마침표/물음표/느낌표 + 공백)
    // 한국어: ~다. ~요. ~죠. ~네. ~까? ~야! ~세요. ~습니다. ~었다. ~였다. 등
    const sentenceEndPattern = /([.!?])\s+/g;
    const sentences: string[] = [];
    let lastIndex = 0;

    let match;
    while ((match = sentenceEndPattern.exec(text)) !== null) {
      sentences.push(text.substring(lastIndex, match.index + match[1].length).trim());
      lastIndex = match.index + match[0].length;
    }
    // 마지막 남은 텍스트
    if (lastIndex < text.length) {
      const remaining = text.substring(lastIndex).trim();
      if (remaining) sentences.push(remaining);
    }

    // 문장이 3개 이하면 분리 불필요
    if (sentences.length <= 3) {
      return text;
    }

    // 2~3문장씩 묶어 문단 생성
    const paragraphs: string[] = [];
    let i = 0;
    while (i < sentences.length) {
      // 남은 문장 수에 따라 2~3문장씩 그룹
      const remaining = sentences.length - i;
      let groupSize: number;
      if (remaining <= 3) {
        groupSize = remaining; // 남은 거 전부
      } else if (remaining === 4) {
        groupSize = 2; // 2+2로 균등 분배
      } else {
        groupSize = randomInt(2, 3); // 랜덤 2~3문장
      }

      const group = sentences.slice(i, i + groupSize);
      paragraphs.push(group.join(' '));
      i += groupSize;
    }

    return paragraphs.join('\n\n');
  }

  // ─── OS 레벨 파일 다이얼로그 닫기 ───

  /**
   * Windows 네이티브 파일 다이얼로그(#32770) 강제 닫기
   * C# 코드 내부에서 EnumWindows + WM_CLOSE 처리 (PowerShell scriptblock delegate 문제 회피)
   */
  private closeNativeFileDialogs(): void {
    // C# 내부에서 EnumWindows 콜백을 완전히 처리 (PowerShell delegate 변환 불가 문제 해결)
    const script = [
      'try {',
      "Add-Type -Name DC -Namespace W32 -EA Stop -MemberDefinition @'",
      'delegate bool EWP(IntPtr h, IntPtr l);',
      '[DllImport("user32.dll")] static extern bool EnumWindows(EWP f, IntPtr l);',
      '[DllImport("user32.dll")] static extern int GetClassName(IntPtr h, System.Text.StringBuilder s, int n);',
      '[DllImport("user32.dll")] static extern bool IsWindowVisible(IntPtr h);',
      '[DllImport("user32.dll")] static extern bool PostMessage(IntPtr h, uint m, IntPtr w, IntPtr l);',
      'public static void CloseAll() {',
      '  EnumWindows((h, l) => {',
      '    if (IsWindowVisible(h)) {',
      '      var sb = new System.Text.StringBuilder(256);',
      '      GetClassName(h, sb, 256);',
      '      if (sb.ToString() == "#32770") PostMessage(h, 0x0010, IntPtr.Zero, IntPtr.Zero);',
      '    }',
      '    return true;',
      '  }, IntPtr.Zero);',
      '}',
      "'@",
      '} catch {}',
      '[W32.DC]::CloseAll()',
    ].join('\n');

    try {
      const encoded = Buffer.from(script, 'utf16le').toString('base64');
      spawnSync('C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe', ['-NonInteractive', '-EncodedCommand', encoded], {
        timeout: 10_000,
        stdio: 'ignore',
      });
    } catch { /* 다이얼로그 없음 - 무시 */ }
  }

  /** 외부에서 호출 가능한 정리 메서드 - OS 파일 다이얼로그 닫기 */
  async cleanup(): Promise<void> {
    this.closeNativeFileDialogs();
  }

  // ─── 내부 헬퍼: iframe / page 자동 분기 ───

  /** iframe 내부 또는 직접 페이지에서 locator 반환 */
  private loc(selector: string): Locator {
    return this.useIframe
      ? this.frame.locator(selector)
      : this.page.locator(selector);
  }

  /** iframe 내부 또는 직접 페이지에서 role-based locator 반환 */
  private getByRole(role: Parameters<Page['getByRole']>[0], options?: Parameters<Page['getByRole']>[1]): Locator {
    return this.useIframe
      ? this.frame.getByRole(role, options)
      : this.page.getByRole(role, options);
  }

  /** iframe 내부 또는 직접 페이지에서 text locator 반환 */
  private getByText(text: string | RegExp): Locator {
    return this.useIframe
      ? this.frame.getByText(text)
      : this.page.getByText(text);
  }

  // ─── 네비게이션 & 에디터 대기 ───

  /** 블로그 글쓰기 페이지로 이동 */
  async navigateToEditor(): Promise<void> {
    await this.page.goto(`https://blog.naver.com/${this.blogId}/postwrite`, {
      waitUntil: 'domcontentloaded',
    });
    await pageLoadDelay();
    await this.waitForEditor();
  }

  /** 에디터 로딩 대기 + 팝업 처리 */
  private async waitForEditor(): Promise<void> {
    console.log(`[Editor] 에디터 감지 시작 (URL: ${this.page.url()})`);

    // Step 1: iframe 방식 시도
    try {
      this.frame = this.page.frameLocator('iframe#mainFrame');
      await this.frame.getByRole('button', { name: '발행' }).waitFor({
        state: 'visible',
        timeout: 30_000,
      });
      this.useIframe = true;
      console.log('[Editor] iframe 에디터 감지됨');
    } catch {
      console.log('[Editor] iframe 방식 실패, 직접 페이지 시도...');

      // Step 2: 직접 페이지 방식 시도
      try {
        await this.page.getByRole('button', { name: '발행' }).waitFor({
          state: 'visible',
          timeout: 10_000,
        });
        this.useIframe = false;
        console.log('[Editor] 직접 페이지 에디터 감지됨');
      } catch {
        // Step 3: 대체 URL 시도
        console.log('[Editor] 대체 URL 시도...');
        await this.page.goto(
          `https://blog.naver.com/GoBlogWrite.naver?blogId=${this.blogId}`,
          { waitUntil: 'domcontentloaded' },
        );
        await pageLoadDelay();
        await humanDelay(3000, 5000);

        try {
          this.frame = this.page.frameLocator('iframe#mainFrame');
          await this.frame.getByRole('button', { name: '발행' }).waitFor({
            state: 'visible',
            timeout: 30_000,
          });
          this.useIframe = true;
        } catch {
          await this.page.getByRole('button', { name: '발행' }).waitFor({
            state: 'visible',
            timeout: 15_000,
          });
          this.useIframe = false;
        }
        console.log(`[Editor] 대체 URL 에디터 감지됨 (iframe=${this.useIframe})`);
      }
    }

    // Step 4: 모든 팝업/다이얼로그 처리
    await this.dismissAllPopups();

    await humanDelay(1000, 2000);
    console.log('[Editor] 에디터 준비 완료');
  }

  // ─── 팝업 & 다이얼로그 처리 ───

  /** 모든 팝업/다이얼로그 한번에 처리 */
  private async dismissAllPopups(): Promise<void> {
    await this.dismissDraftDialog();
    await this.dismissEventPopup();
    await this.dismissOverlayPopups();
  }

  /** 오버레이 팝업 닫기 (이미지 업로드 후 남는 레이어 등) */
  private async dismissOverlayPopups(): Promise<void> {
    // layer_popup_wrap 계열 팝업 닫기
    const overlaySelectors = [
      '[class*="layer_popup_wrap"] button[class*="close"]',
      '[class*="layer_popup_wrap"] button[class*="Close"]',
      '[class*="layer_popup_wrap"] .btn_close',
      '[class*="layer_popup_wrap"] button:has-text("닫기")',
      '[class*="layer_popup_wrap"] button:has-text("취소")',
      '[class*="layer_popup_wrap"] button:has-text("확인")',
      // 일반 오버레이 닫기
      '.dimmed + [class*="popup"] button[class*="close"]',
      '[class*="LayerPopup"] button[class*="close"]',
    ];

    for (const sel of overlaySelectors) {
      try {
        // 페이지 레벨에서 먼저 시도
        const btn = this.page.locator(sel).first();
        if (await btn.isVisible({ timeout: 1_000 }).catch(() => false)) {
          await btn.click();
          await humanDelay(300, 600);
          console.log(`[Editor] 오버레이 팝업 닫기: ${sel}`);
          return;
        }
      } catch { /* continue */ }
      try {
        // iframe 내부에서도 시도
        const btn = this.loc(sel).first();
        if (await btn.isVisible({ timeout: 1_000 }).catch(() => false)) {
          await btn.click();
          await humanDelay(300, 600);
          console.log(`[Editor] 오버레이 팝업 닫기 (iframe): ${sel}`);
          return;
        }
      } catch { /* continue */ }
    }

    // ESC 키로 폴백 시도
    try {
      const overlay = this.page.locator('[class*="layer_popup_wrap"]').first();
      if (await overlay.isVisible({ timeout: 1_000 }).catch(() => false)) {
        await this.page.keyboard.press('Escape');
        await humanDelay(500, 1000);
        console.log('[Editor] ESC로 오버레이 닫기 시도');
      }
    } catch { /* no overlay */ }
  }

  /**
   * "작성 중인 글이 있습니다" 임시저장 복구 다이얼로그 처리
   * → "취소" 클릭하여 새 글로 시작
   */
  private async dismissDraftDialog(): Promise<void> {
    try {
      const draftText = this.getByText('작성 중인 글이 있습니다');
      if (await draftText.isVisible({ timeout: 3_000 })) {
        console.log('[Editor] 임시저장 복구 다이얼로그 감지 → 취소');
        // "취소" 버튼 클릭 (새 글 작성)
        const cancelBtn = this.getByRole('button', { name: '취소' });
        await cancelBtn.click();
        await humanDelay(500, 1000);
        console.log('[Editor] 임시저장 다이얼로그 닫기 완료');
      }
    } catch {
      // 다이얼로그 없음 - 정상
    }
  }

  /**
   * 이벤트/프로모션 팝업 닫기
   * (X 닫기 버튼, "7일동안 보지 않기" 등)
   */
  private async dismissEventPopup(): Promise<void> {
    // --- iframe 내부 팝업 ---
    const iframeCloseSelectors = [
      'button[class*="close"]',
      'button[class*="Close"]',
      'a[class*="close"]',
      'button[aria-label*="닫기"]',
      '[class*="popup"] button',
      '[class*="layer_popup"] button',
      '[class*="modal"] button[class*="close"]',
      '.btn_close',
      'button:near(:text("7일동안 보지 않기"))',
    ];

    for (const selector of iframeCloseSelectors) {
      try {
        const btn = this.loc(selector).first();
        if (await btn.isVisible({ timeout: 1_000 })) {
          await btn.click();
          await humanDelay(300, 500);
          console.log(`[Editor] iframe 팝업 닫기 (${selector})`);
          break;
        }
      } catch { /* 해당 셀렉터 없음 */ }
    }

    // --- 메인 페이지 팝업 (iframe 바깥) ---
    const pageCloseSelectors = [
      'button[class*="close"]',
      'a[class*="close"]',
      'button[aria-label*="닫기"]',
      '[class*="popup"] button[class*="close"]',
      '[class*="layer"] button[class*="close"]',
      '.btn_close',
      // "7일동안 보지 않기" 텍스트 근처 X 버튼
      'button:near(:text("7일동안 보지 않기"))',
    ];

    for (const selector of pageCloseSelectors) {
      try {
        const btn = this.page.locator(selector).first();
        if (await btn.isVisible({ timeout: 1_000 })) {
          await btn.click();
          await humanDelay(300, 500);
          console.log(`[Editor] 페이지 팝업 닫기 (${selector})`);
          break;
        }
      } catch { /* 해당 셀렉터 없음 */ }
    }
  }

  /**
   * 블로그 메인 페이지의 팝업 닫기 (포스팅 후 확인 시 사용)
   * 에디터 바깥에서 호출 가능
   */
  async dismissBlogPagePopups(): Promise<void> {
    // 이벤트/프로모션 팝업 (X 닫기)
    const closeSelectors = [
      'button[class*="close"]',
      'a[class*="close"]',
      'button[aria-label*="닫기"]',
      '[class*="popup"] button[class*="close"]',
      '[class*="layer"] button[class*="close"]',
      '.btn_close',
      'button:near(:text("7일동안 보지 않기"))',
    ];

    for (const selector of closeSelectors) {
      try {
        const btn = this.page.locator(selector).first();
        if (await btn.isVisible({ timeout: 2_000 })) {
          await btn.click();
          await humanDelay(300, 600);
          console.log(`[Blog] 팝업 닫기 (${selector})`);
          return;
        }
      } catch { /* 셀렉터 없음 */ }
    }

    // iframe 내부 팝업도 시도
    try {
      const frame = this.page.frameLocator('iframe#mainFrame');
      for (const selector of closeSelectors) {
        try {
          const btn = frame.locator(selector).first();
          if (await btn.isVisible({ timeout: 1_000 })) {
            await btn.click();
            await humanDelay(300, 600);
            console.log(`[Blog] iframe 팝업 닫기 (${selector})`);
            return;
          }
        } catch { /* 셀렉터 없음 */ }
      }
    } catch { /* iframe 없음 */ }
  }

  // ─── 제목 입력 ───

  async writeTitle(title: string): Promise<void> {
    console.log(`[Editor] 제목 입력: "${title}"`);

    // 제목 영역 클릭 (여러 셀렉터 시도)
    const titleLocator = this.loc('.se-title-text .se-text-paragraph')
      .or(this.loc('.se-title-text'))
      .or(this.loc('article p').first())  // 에디터 article의 첫 번째 p
      .first();

    await titleLocator.click();
    await humanDelay(300, 600);

    // 기존 내용 삭제
    await this.page.keyboard.press('Control+A');
    await humanDelay(100, 200);
    await this.page.keyboard.press('Backspace');
    await humanDelay(200, 400);

    // 제목 입력 (사람처럼)
    await humanTypeToLocator(this.page, title);
    await humanDelay(500, 1000);
  }

  // ─── 본문 입력 ───

  async writeContent(content: string): Promise<void> {
    const formatted = this.formatForBlog(content);
    console.log(`[Editor] 본문 입력 (${content.length}자 → 포맷팅 후 ${formatted.length}자)`);

    // 본문 영역 클릭 (여러 셀렉터 시도)
    const contentLocator = this.loc('.se-component.se-text .se-text-paragraph')
      .or(this.loc('.se-component.se-text'))
      .or(this.loc('.se-main-container'))
      .or(this.getByText('글감과 함께 나의 일상을'))
      .or(this.loc('article p').nth(1))  // 에디터 article의 두 번째 p
      .first();

    await contentLocator.click();
    await humanDelay(300, 600);

    // 줄 단위로 입력 (자연스럽게)
    const lines = formatted.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (line.trim() === '') {
        await this.page.keyboard.press('Enter');
        await humanDelay(200, 400);
        continue;
      }

      await humanTypeToLocator(this.page, line);

      if (i < lines.length - 1) {
        await this.page.keyboard.press('Enter');
        await humanDelay(100, 300);
      }

      if (i > 0 && i % 5 === 0) {
        await humanScroll(this.page);
      }
    }

    await humanDelay(500, 1000);
  }

  /** 클립보드를 통한 빠른 본문 입력 (대량 텍스트용) */
  async writeContentFast(content: string): Promise<void> {
    const formatted = this.formatForBlog(content);
    console.log(`[Editor] 본문 빠른 입력 (클립보드, ${content.length}자 → 포맷팅 후 ${formatted.length}자)`);

    const contentLocator = this.loc('.se-component.se-text .se-text-paragraph')
      .or(this.loc('.se-component.se-text'))
      .or(this.loc('.se-main-container'))
      .or(this.getByText('글감과 함께 나의 일상을'))
      .or(this.loc('article p').nth(1))
      .first();

    await contentLocator.click();
    await humanDelay(500, 1000);

    // 클립보드에 복사 후 붙여넣기
    await this.page.evaluate((text) => {
      navigator.clipboard.writeText(text);
    }, formatted);
    await humanDelay(300, 500);

    await this.page.keyboard.press('Control+V');
    await humanDelay(1000, 2000);
  }

  // ─── 이미지 업로드 ───

  async uploadImages(imagePaths: string[]): Promise<void> {
    if (!imagePaths.length) return;

    console.log(`[Editor] 이미지 ${imagePaths.length}개 업로드`);

    for (const imagePath of imagePaths) {
      let uploaded = false;

      // 이전 이미지 업로드 후 남은 오버레이 팝업 닫기
      await this.dismissOverlayPopups();
      await humanDelay(500, 1000);

      // ── 방법 1: 이미지 컴포넌트 버튼 → 내 PC → 파일 선택 ──
      console.log('[Editor] 이미지 업로드 방법 1: 툴바 버튼');
      try {
        // SmartEditor ONE 이미지 버튼 찾기
        const imageBtnSelectors = [
          'button.se-image-toolbar-button',
          'button[data-name="image"]',
          'button[data-command="image"]',
          'button.se-toolbar-button-image',
        ];

        let imageBtnClicked = false;
        for (const sel of imageBtnSelectors) {
          const btn = this.loc(sel).first();
          if (await btn.isVisible({ timeout: 2_000 }).catch(() => false)) {
            await btn.click({ timeout: 5_000 });
            await humanDelay(800, 1500);
            imageBtnClicked = true;
            console.log(`[Editor] 이미지 버튼 클릭: ${sel}`);
            break;
          }
        }

        // 이미지 버튼을 못 찾으면 "사진" 텍스트 버튼 시도
        if (!imageBtnClicked) {
          const photoBtn = this.getByRole('button', { name: /사진|이미지|Image|Photo/ }).first();
          if (await photoBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
            await photoBtn.click();
            await humanDelay(800, 1500);
            imageBtnClicked = true;
            console.log('[Editor] 사진/이미지 텍스트 버튼 클릭');
          }
        }

        if (imageBtnClicked) {
          // 파일 선택 이벤트 대기 + "내 PC" 클릭
          // .catch로 unhandled rejection 방지 (방법 2로 넘어갈 경우 이 promise는 버려짐)
          const fileChooserPromise = this.page.waitForEvent('filechooser', { timeout: 10_000 })
            .catch(() => null);

          const pcSelectors = [
            'label:has-text("내 PC")',
            'button:has-text("내 PC")',
            'a:has-text("내 PC")',
            'span:has-text("내 PC")',
          ];

          let pcClicked = false;
          for (const sel of pcSelectors) {
            const pcBtn = this.loc(sel).first();
            if (await pcBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
              await pcBtn.click();
              pcClicked = true;
              console.log(`[Editor] "내 PC" 클릭: ${sel}`);
              break;
            }
          }

          // "내 PC"를 못 찾으면 페이지 레벨에서도 시도 (iframe 밖일 수 있음)
          if (!pcClicked && this.useIframe) {
            for (const sel of pcSelectors) {
              const pcBtn = this.page.locator(sel).first();
              if (await pcBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
                await pcBtn.click();
                pcClicked = true;
                console.log(`[Editor] "내 PC" 클릭 (페이지): ${sel}`);
                break;
              }
            }
          }

          if (pcClicked) {
            const fileChooser = await fileChooserPromise;
            if (fileChooser) {
              await fileChooser.setFiles(imagePath);
              uploaded = true;
              console.log(`[Editor] 파일 선택 완료: ${imagePath}`);
            } else {
              // 파일 다이얼로그가 OS 레벨에서 열렸지만 인터셉트 실패 → ESC로 닫기
              await this.page.keyboard.press('Escape');
              await humanDelay(300, 500);
              console.log('[Editor] 파일 다이얼로그 인터셉트 실패 → ESC로 닫음');
            }
          }
        }
      } catch (e: any) {
        console.log(`[Editor] 방법 1 실패: ${e.message}`);
        await this.page.keyboard.press('Escape').catch(() => {});
        await humanDelay(300, 500);
      }

      // Method 1 완료 후 OS 파일 다이얼로그 강제 닫기
      this.closeNativeFileDialogs();
      await humanDelay(300, 500);

      // ── 방법 2: hidden input[type="file"] 직접 사용 ──
      if (!uploaded) {
        console.log('[Editor] 이미지 업로드 방법 2: hidden file input');
        try {
          // 페이지 전체에서 file input 검색 (hidden 포함)
          const fileInputSelectors = [
            'input[type="file"][accept*="image"]',
            'input[type="file"][accept*="png"]',
            'input[type="file"][accept*="jpg"]',
            'input[type="file"]',
          ];

          for (const sel of fileInputSelectors) {
            // iframe 내부
            const iframeInput = this.loc(sel).first();
            if (await iframeInput.count() > 0) {
              await iframeInput.setInputFiles(imagePath);
              uploaded = true;
              console.log(`[Editor] hidden input 업로드 성공 (in editor): ${sel}`);
              break;
            }
            // 페이지 전체
            const pageInput = this.page.locator(sel).first();
            if (await pageInput.count() > 0) {
              await pageInput.setInputFiles(imagePath);
              uploaded = true;
              console.log(`[Editor] hidden input 업로드 성공 (in page): ${sel}`);
              break;
            }
          }
        } catch (e: any) {
          console.log(`[Editor] 방법 2 실패: ${e.message}`);
        }
      }

      // ── 방법 3: 에디터 본문에 이미지 드래그앤드롭 시뮬레이션 ──
      if (!uploaded) {
        console.log('[Editor] 이미지 업로드 방법 3: 드래그앤드롭');
        try {
          const fs = await import('fs');
          const fileBuffer = fs.readFileSync(imagePath);
          const contentArea = this.loc('.se-component.se-text .se-text-paragraph')
            .or(this.loc('.se-main-container'))
            .first();

          if (await contentArea.isVisible({ timeout: 3_000 }).catch(() => false)) {
            // DataTransfer를 시뮬레이션하여 drop 이벤트 발생
            await contentArea.evaluate(async (el, data) => {
              const uint8 = new Uint8Array(data);
              const blob = new Blob([uint8], { type: 'image/png' });
              const file = new File([blob], 'blog-thumbnail.png', { type: 'image/png' });
              const dt = new DataTransfer();
              dt.items.add(file);

              const dropEvent = new DragEvent('drop', {
                bubbles: true,
                cancelable: true,
                dataTransfer: dt,
              });
              el.dispatchEvent(dropEvent);
            }, Array.from(fileBuffer));

            await humanDelay(3000, 5000);
            uploaded = true;
            console.log('[Editor] 드래그앤드롭 이미지 삽입 시도');
          }
        } catch (e: any) {
          console.log(`[Editor] 방법 3 실패: ${e.message}`);
        }
      }

      if (uploaded) {
        await humanDelay(3000, 5000);

        // 등록/삽입/확인 버튼 (이미지 업로드 확인 패널)
        const confirmSelectors = [
          'button:has-text("등록")',
          'button:has-text("삽입")',
          'button:has-text("확인")',
          'button:has-text("첨부")',
        ];
        for (const sel of confirmSelectors) {
          const btn = this.loc(sel).first();
          if (await btn.isVisible({ timeout: 2_000 }).catch(() => false)) {
            await btn.click();
            await humanDelay(1000, 2000);
            console.log(`[Editor] 이미지 확인 버튼 클릭: ${sel}`);
            break;
          }
        }

        // 이미지 업로드 후 남는 오버레이 팝업 닫기 (다음 이미지 업로드를 위해)
        await humanDelay(1000, 2000);
        await this.dismissOverlayPopups();

        console.log(`[Editor] 이미지 업로드 완료: ${imagePath}`);
      } else {
        // 디버그: 페이지 내 모든 버튼과 input 정보 출력
        const debugInfo = await this.page.evaluate(() => {
          const buttons = Array.from(document.querySelectorAll('button')).map(b => ({
            text: b.textContent?.trim()?.substring(0, 30),
            class: b.className?.substring(0, 50),
            'data-name': b.getAttribute('data-name'),
          })).filter(b => b.text || b['data-name']);
          const inputs = Array.from(document.querySelectorAll('input[type="file"]')).map(i => ({
            accept: i.getAttribute('accept'),
            class: i.className,
            hidden: !i.offsetParent,
          }));
          return { buttons: buttons.slice(0, 15), fileInputs: inputs };
        });
        console.log('[Editor] 디버그 - 버튼 목록:', JSON.stringify(debugInfo.buttons, null, 2));
        console.log('[Editor] 디버그 - file input:', JSON.stringify(debugInfo.fileInputs, null, 2));
        await this.page.screenshot({ path: 'test-results/debug-image-upload-failed.png', fullPage: true });
        console.warn(`[Editor] 이미지 업로드 실패: ${imagePath}`);
      }

      // 각 이미지 업로드 완료 후 OS 파일 다이얼로그 강제 닫기
      this.closeNativeFileDialogs();
    }
  }

  // ─── 태그 추가 (발행 패널 내에서 호출) ───

  /**
   * 태그 추가 - 발행 패널이 열린 상태에서 호출
   * 네이버 에디터는 태그 입력이 발행 패널 안에 있음
   */
  private async addTagsInPanel(tags: string[]): Promise<void> {
    if (!tags.length) return;

    console.log(`[Editor] 태그 ${tags.length}개 추가: ${tags.join(', ')}`);

    // 발행 패널 내 태그 입력 찾기 (여러 셀렉터 시도)
    const tagInput = this.loc('input[placeholder*="태그"]')
      .or(this.loc('input[placeholder*="Tag"]'))
      .or(this.loc('.post_tag input'))
      .or(this.loc('[class*="tag"] input'))
      .or(this.loc('[class*="Tag"] input'))
      .first();

    if (!(await tagInput.isVisible({ timeout: 5_000 }).catch(() => false))) {
      console.warn('[Editor] 태그 입력란을 찾을 수 없음 → 건너뜀');
      return;
    }

    for (const tag of tags) {
      await tagInput.click();
      await humanDelay(200, 400);
      await humanTypeToLocator(this.page, tag);
      await humanDelay(200, 400);
      await this.page.keyboard.press('Enter');
      await humanDelay(300, 600);
    }
    console.log('[Editor] 태그 추가 완료');
  }

  // ─── 에디터 본문 내 태그 추가 (레거시 호환) ───

  async addTags(tags: string[]): Promise<void> {
    if (!tags.length) return;

    console.log(`[Editor] 에디터에서 태그 입력 시도...`);

    const tagInput = this.loc('input[placeholder*="태그"]')
      .or(this.loc('.post_tag input'))
      .or(this.loc('.tag input'))
      .first();

    if (!(await tagInput.isVisible({ timeout: 3_000 }).catch(() => false))) {
      // 태그 토글 버튼 시도
      const tagToggle = this.getByRole('button', { name: /태그/ })
        .or(this.loc('.tag_btn'))
        .first();
      if (await tagToggle.isVisible({ timeout: 2_000 }).catch(() => false)) {
        await tagToggle.click();
        await humanDelay(500, 1000);
      } else {
        console.log('[Editor] 에디터에 태그 입력란 없음 → 발행 패널에서 추가 예정');
        return;
      }
    }

    // 에디터 내 태그 입력란이 있으면 여기서 추가
    if (await tagInput.isVisible({ timeout: 2_000 }).catch(() => false)) {
      for (const tag of tags) {
        await tagInput.click();
        await humanDelay(200, 400);
        await humanTypeToLocator(this.page, tag);
        await humanDelay(200, 400);
        await this.page.keyboard.press('Enter');
        await humanDelay(300, 600);
      }
    }
  }

  // ─── 카테고리 선택 (발행 패널 내에서도 동작) ───

  async selectCategory(categoryName: string): Promise<void> {
    console.log(`[Editor] 카테고리 선택: "${categoryName}"`);

    const categoryBtn = this.getByRole('button', { name: /카테고리/ })
      .or(this.loc('.post_category'))
      .or(this.loc('[class*="category"] button'))
      .first();

    if (await categoryBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await categoryBtn.click();
      await humanDelay(500, 1000);

      const categoryItem = this.loc(`li:has-text("${categoryName}")`)
        .or(this.loc(`a:has-text("${categoryName}")`))
        .first();

      if (await categoryItem.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await categoryItem.click();
        await humanDelay(300, 500);
      } else {
        console.warn(`  - 카테고리 "${categoryName}" 찾을 수 없음`);
      }
    }
  }

  // ─── 임시저장 ───

  async saveDraft(): Promise<void> {
    console.log('[Editor] 임시저장...');

    const draftBtn = this.getByRole('button', { name: '저장' })
      .or(this.loc('button:has-text("임시저장")'))
      .first();

    await draftBtn.click();
    await humanDelay(1000, 2000);
    console.log('[Editor] 임시저장 완료');
  }

  // ─── 발행 (태그/카테고리/공개설정 모두 여기서 처리) ───

  async publish(isPublic: boolean = true, tags?: string[], category?: string): Promise<void> {
    console.log(`[Editor] 발행 (${isPublic ? '공개' : '비공개'})...`);

    // 0. 발행 전 오버레이 팝업 닫기 + OS 파일 다이얼로그 닫기
    await this.dismissOverlayPopups();
    this.closeNativeFileDialogs();
    await humanDelay(500, 800);

    // 1. 발행 버튼 클릭 → 발행 설정 패널 열기
    const publishBtn = this.getByRole('button', { name: '발행' }).first();
    await publishBtn.click();
    await humanDelay(2000, 3000);

    // 디버그: 발행 패널 스크린샷 저장
    await this.page.screenshot({ path: 'test-results/debug-publish-panel.png', fullPage: true });
    console.log('[Debug] 발행 패널 스크린샷 저장');

    // 2. 발행 패널 내에서 태그 추가
    if (tags?.length) {
      await this.addTagsInPanel(tags);
    }

    // 3. 카테고리 선택 (발행 패널 내)
    if (category) {
      await this.selectCategory(category);
    }

    // 4. 공개/비공개 설정 (label 클릭 - radio input은 label에 가려짐)
    if (isPublic) {
      const publicLabel = this.loc('label[for="open_public"]')
        .or(this.loc('label:has-text("공개"):not(:has-text("비공개"))'))
        .first();
      if (await publicLabel.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await publicLabel.click();
        await humanDelay(300, 500);
        console.log('[Editor] 공개 설정 완료');
      }
    } else {
      const privateLabel = this.loc('label[for="open_private"]')
        .or(this.loc('label:has-text("비공개")'))
        .first();
      if (await privateLabel.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await privateLabel.click();
        await humanDelay(300, 500);
        console.log('[Editor] 비공개 설정 완료');
      }
    }

    // 디버그: 공개 설정 후 스크린샷
    await this.page.screenshot({ path: 'test-results/debug-before-confirm.png', fullPage: true });
    console.log('[Debug] 확인 버튼 클릭 전 스크린샷 저장');

    // 5. 최종 발행 확인 버튼
    // 발행 패널 내부의 확인 버튼 찾기 (상단 발행 버튼이 아닌 패널 내 버튼)
    await humanDelay(500, 1000);

    // 발행 패널 내 버튼들을 순서대로 시도
    let confirmed = false;

    // 방법 1: data-testid 활용
    const testIdBtn = this.loc('[data-testid*="publish"], [data-testid*="confirm"]').first();
    if (!confirmed && await testIdBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await testIdBtn.click();
      confirmed = true;
      console.log('[Editor] data-testid 확인 버튼 클릭');
    }

    // 방법 2: 발행 패널 컨테이너 내부의 발행 버튼 (마지막 발행 버튼)
    if (!confirmed) {
      const allPublishBtns = this.loc('button:has-text("발행")');
      const count = await allPublishBtns.count();
      console.log(`[Debug] "발행" 버튼 ${count}개 발견`);
      if (count >= 2) {
        // 패널 내부 발행 버튼은 두 번째(마지막)
        await allPublishBtns.nth(count - 1).click();
        confirmed = true;
        console.log(`[Editor] 패널 내 발행 버튼 클릭 (${count}번째)`);
      }
    }

    // 방법 3: .btn_ok 또는 확인 버튼
    if (!confirmed) {
      const okBtn = this.loc('.btn_ok')
        .or(this.getByRole('button', { name: /확인/ }))
        .first();
      if (await okBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
        await okBtn.click();
        confirmed = true;
        console.log('[Editor] 확인 버튼 클릭');
      }
    }

    // 방법 4: 첫 번째 발행 버튼이라도 클릭 (폴백)
    if (!confirmed) {
      const fallbackBtn = this.loc('button:has-text("발행")').first();
      if (await fallbackBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
        await fallbackBtn.click();
        console.log('[Editor] 폴백: 첫 번째 발행 버튼 클릭');
      }
    }

    await humanDelay(3000, 5000);

    // 발행 후 URL 변화 확인 (에디터 → 블로그 페이지로 이동하면 성공)
    const currentUrl = this.page.url();
    if (currentUrl.includes('postwrite') || currentUrl.includes('GoBlogWrite')) {
      console.warn('[Editor] 경고: 아직 에디터 페이지 - 발행이 실패했을 수 있음');
      // 한번 더 스크린샷
      await this.page.screenshot({ path: 'test-results/debug-after-publish.png', fullPage: true });
    } else {
      console.log(`[Editor] 발행 후 이동: ${currentUrl}`);
    }

    // 발행 완료 후 남아있는 OS 파일 다이얼로그 닫기
    this.closeNativeFileDialogs();

    console.log('[Editor] 발행 프로세스 완료');
  }

  // ─── 전체 포스팅 프로세스 ───

  async createPost(data: BlogPostData): Promise<void> {
    console.log('========================================');
    console.log('[Blog] 포스팅 시작');
    console.log('========================================');

    // 1. 에디터 이동 (팝업 자동 처리 포함)
    await this.navigateToEditor();

    // 2. 제목 입력
    await this.writeTitle(data.title);

    // 3. 본문 입력
    if (data.content.length > 500) {
      await this.writeContentFast(data.content);
    } else {
      await this.writeContent(data.content);
    }

    // 4. 이미지 업로드
    if (data.images?.length) {
      await this.uploadImages(data.images);
    }

    // 5. 발행 (태그, 카테고리, 공개설정 모두 발행 패널에서 처리)
    await this.publish(
      data.isPublic ?? true,
      data.tags,
      data.category,
    );

    // 포스팅 완료 후 남아있는 OS 파일 다이얼로그 최종 정리
    this.closeNativeFileDialogs();

    console.log('========================================');
    console.log('[Blog] 포스팅 완료!');
    console.log('========================================');
  }

  // ─── 인터리브 포스팅 (본문 중간에 이미지 삽입) ───

  /**
   * 본문 중간중간에 이미지를 삽입하는 포스팅
   *
   * sections 배열의 각 요소:
   *   { content: "본문 텍스트", image: "이미지경로(선택)" }
   *
   * 예시:
   *   sections: [
   *     { content: "인트로...", image: "img1.png" },
   *     { content: "중간 내용...", image: "img2.png" },
   *     { content: "마무리..." },
   *   ]
   *
   * → 인트로 → 이미지1 → 중간 내용 → 이미지2 → 마무리
   */
  async createInterleavedPost(data: InterleavedPostData): Promise<void> {
    console.log('========================================');
    console.log('[Blog] 인터리브 포스팅 시작');
    console.log(`[Blog] 섹션 ${data.sections.length}개`);
    console.log('========================================');

    // 1. 에디터 이동
    await this.navigateToEditor();

    // 2. 제목 입력
    await this.writeTitle(data.title);

    // 3. 섹션별로 본문 + 이미지 교차 삽입
    for (let i = 0; i < data.sections.length; i++) {
      const section = data.sections[i];
      console.log(`[Editor] 섹션 ${i + 1}/${data.sections.length} 입력`);

      // 본문 입력
      if (section.content.trim()) {
        await this.writeContentAppend(section.content);
      }

      // 이미지 삽입 (있는 경우)
      if (section.image) {
        console.log(`[Editor] 섹션 ${i + 1} 이미지 삽입: ${section.image}`);
        await this.uploadImages([section.image]);
        // 이미지 삽입 후 커서를 아래로 이동 (다음 텍스트가 이미지 아래에 오도록)
        await this.page.keyboard.press('End');
        await humanDelay(300, 500);
        await this.page.keyboard.press('Enter');
        await humanDelay(300, 500);
      }
    }

    // 4. 발행
    await this.publish(
      data.isPublic ?? true,
      data.tags,
      data.category,
    );

    // 인터리브 포스팅 완료 후 남아있는 OS 파일 다이얼로그 최종 정리
    this.closeNativeFileDialogs();

    console.log('========================================');
    console.log('[Blog] 인터리브 포스팅 완료!');
    console.log('========================================');
  }

  /** 에디터 본문 끝에 텍스트 추가 (기존 내용 유지) */
  async writeContentAppend(content: string): Promise<void> {
    const formatted = this.formatForBlog(content);
    console.log(`[Editor] 본문 추가 입력 (${content.length}자 → 포맷팅 후 ${formatted.length}자)`);

    // 본문 영역의 마지막 위치 찾기
    const contentLocator = this.loc('.se-component.se-text .se-text-paragraph')
      .or(this.loc('.se-component.se-text'))
      .or(this.loc('.se-main-container'))
      .first();

    // 마지막 텍스트 영역 클릭 → End 키로 끝으로 이동
    await contentLocator.click();
    await humanDelay(200, 400);
    await this.page.keyboard.press('Control+End');
    await humanDelay(200, 400);

    // 클립보드를 통한 빠른 입력
    await this.page.evaluate((text) => {
      navigator.clipboard.writeText(text);
    }, formatted);
    await humanDelay(300, 500);

    await this.page.keyboard.press('Control+V');
    await humanDelay(1000, 2000);
  }
}
