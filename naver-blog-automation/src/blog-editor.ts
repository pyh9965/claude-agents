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

export class NaverBlogEditor {
  readonly page: Page;
  readonly blogId: string;
  private frame!: FrameLocator;
  private useIframe = true;

  constructor(page: Page, blogId: string) {
    this.page = page;
    this.blogId = blogId;
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
    console.log(`[Editor] 본문 입력 (${content.length}자)`);

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
    const lines = content.split('\n');

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
    console.log(`[Editor] 본문 빠른 입력 (클립보드, ${content.length}자)`);

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
    }, content);
    await humanDelay(300, 500);

    await this.page.keyboard.press('Control+V');
    await humanDelay(1000, 2000);
  }

  // ─── 이미지 업로드 ───

  async uploadImages(imagePaths: string[]): Promise<void> {
    if (!imagePaths.length) return;

    console.log(`[Editor] 이미지 ${imagePaths.length}개 업로드`);

    for (const imagePath of imagePaths) {
      // "사진 추가" 버튼 클릭
      const imageBtn = this.getByRole('button', { name: /사진/ })
        .or(this.loc('button.se-image-toolbar-button'))
        .or(this.loc('button[data-name="image"]'))
        .first();

      if (await imageBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
        await imageBtn.click();
        await humanDelay(500, 1000);
      }

      // 파일 선택 다이얼로그 처리
      const fileChooserPromise = this.page.waitForEvent('filechooser', { timeout: 10_000 });

      // "내 PC" 버튼 클릭
      const pcUpload = this.getByRole('button', { name: /내 PC|PC/ })
        .or(this.loc('label:has-text("내 PC")'))
        .first();
      if (await pcUpload.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await pcUpload.click();
      }

      try {
        const fileChooser = await fileChooserPromise;
        await fileChooser.setFiles(imagePath);
        console.log(`  - 업로드: ${imagePath}`);
      } catch {
        const fileInput = this.loc('input[type="file"][accept*="image"]').first();
        if (await fileInput.count() > 0) {
          await fileInput.setInputFiles(imagePath);
          console.log(`  - 직접 업로드: ${imagePath}`);
        } else {
          console.warn(`  - 업로드 실패: ${imagePath}`);
        }
      }

      await humanDelay(2000, 4000);

      // 등록/삽입/확인 버튼
      const insertBtn = this.getByRole('button', { name: /등록|삽입/ }).first();
      if (await insertBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await insertBtn.click();
        await humanDelay(1000, 2000);
      }
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

    console.log('========================================');
    console.log('[Blog] 포스팅 완료!');
    console.log('========================================');
  }
}
