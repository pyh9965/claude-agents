/**
 * Chrome CDP 연결 관리자
 *
 * Chrome 136+ 보안 정책 대응:
 *   기본 프로필(User Data)로는 --remote-debugging-port 사용이 차단됨.
 *   → 별도의 전용 디버그 프로필 디렉토리를 생성하여 사용.
 *   → 최초 1회 수동 로그인 후 쿠키가 영구 저장됨.
 *
 * 참고:
 *   https://developer.chrome.com/blog/remote-debugging-port
 *   https://github.com/browser-use/browser-use/issues/1520
 *
 * 사용법:
 *   1. npm run chrome:setup   → Chrome 디버그 프로필 생성 + 네이버 수동 로그인
 *   2. npm run post:cdp       → 로그인된 프로필로 자동 포스팅
 */
import { chromium, type Browser, type Page, type BrowserContext } from 'playwright';
import { execSync, spawn, type ChildProcess } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';

export interface CDPConfig {
  /** Chrome 실행 파일 경로 */
  chromePath?: string;
  /** 전용 디버그 프로필 디렉토리 (기본: ~/.chrome-debug-profile) */
  userDataDir?: string;
  /** CDP 디버깅 포트 (기본: 9222) */
  debugPort?: number;
  /** 기존 Chrome 프로세스 종료 여부 (기본: true) */
  killExisting?: boolean;
  /** Chrome 시작 대기 시간 ms (기본: 15000) */
  launchWaitMs?: number;
}

/** CDP 연결 결과 */
export interface CDPConnection {
  browser: Browser;
  context: BrowserContext;
  page: Page;
}

/**
 * Windows 기본 Chrome 경로 탐지
 */
function findChromePath(): string {
  const candidates = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    `${process.env.LOCALAPPDATA}\\Google\\Chrome\\Application\\chrome.exe`,
  ];

  for (const p of candidates) {
    try {
      if (fs.existsSync(p)) return p;
    } catch { /* continue */ }
  }

  try {
    const result = execSync('where chrome', { encoding: 'utf-8' }).trim();
    if (result) return result.split('\n')[0].trim();
  } catch { /* not found */ }

  throw new Error(
    'Chrome을 찾을 수 없습니다. CDPConfig.chromePath를 직접 지정해주세요.'
  );
}

/**
 * 전용 디버그 프로필 경로 (기본 프로필과 완전히 분리)
 *
 * Chrome 136+ 보안 정책:
 *   기본 User Data 경로로는 remote-debugging-port 사용 불가.
 *   별도 경로를 사용해야 DPAPI 암호화도 정상 동작.
 */
function getDebugProfileDir(): string {
  return path.join(os.homedir(), '.chrome-debug-profile');
}

export class ChromeCDP {
  private config: Required<CDPConfig>;
  private chromeProcess: ChildProcess | null = null;
  private browser: Browser | null = null;

  constructor(config: CDPConfig = {}) {
    this.config = {
      chromePath: config.chromePath || findChromePath(),
      userDataDir: config.userDataDir || getDebugProfileDir(),
      debugPort: config.debugPort || 9222,
      killExisting: config.killExisting ?? true,
      launchWaitMs: config.launchWaitMs ?? 15000,
    };
  }

  /** 디버그 프로필이 이미 존재하는지 확인 */
  isProfileSetup(): boolean {
    return fs.existsSync(this.config.userDataDir) &&
      fs.existsSync(path.join(this.config.userDataDir, 'Default'));
  }

  /** 프로필 경로 반환 */
  getProfilePath(): string {
    return this.config.userDataDir;
  }

  /**
   * Chrome이 이미 디버깅 포트로 실행 중인지 확인
   */
  private async isDebugPortOpen(): Promise<boolean> {
    try {
      const http = require('http');
      return new Promise((resolve) => {
        const req = http.get(
          `http://127.0.0.1:${this.config.debugPort}/json/version`,
          (res: any) => {
            resolve(res.statusCode === 200);
            res.resume();
          },
        );
        req.on('error', () => resolve(false));
        req.setTimeout(2000, () => {
          req.destroy();
          resolve(false);
        });
      });
    } catch {
      return false;
    }
  }

  /**
   * 기존 Chrome 프로세스 종료 (Windows)
   */
  private killExistingChrome(): void {
    try {
      execSync('taskkill /F /IM chrome.exe /T 2>nul', { stdio: 'ignore' });
      console.log('[CDP] 기존 Chrome 프로세스 종료');
    } catch {
      // Chrome이 실행 중이 아님 - 정상
    }
  }

  /**
   * Chrome 프로필 잠금 파일 제거
   */
  private removeLockFiles(): void {
    const lockFiles = ['lockfile', 'SingletonLock', 'SingletonSocket', 'SingletonCookie'];
    for (const lockFile of lockFiles) {
      const lockPath = path.join(this.config.userDataDir, lockFile);
      try {
        if (fs.existsSync(lockPath)) {
          fs.unlinkSync(lockPath);
        }
      } catch { /* 무시 */ }
    }
  }

  /**
   * Chrome을 디버깅 포트와 함께 실행
   */
  private launchChrome(): void {
    // 프로필 디렉토리 생성 (없으면)
    if (!fs.existsSync(this.config.userDataDir)) {
      fs.mkdirSync(this.config.userDataDir, { recursive: true });
      console.log(`[CDP] 디버그 프로필 디렉토리 생성: ${this.config.userDataDir}`);
    }

    this.removeLockFiles();

    const userDataDir = this.config.userDataDir.replace(/\\/g, '/');
    const chromePath = this.config.chromePath.replace(/\\/g, '/');

    console.log(`[CDP] Chrome 실행 (디버그 프로필: ${userDataDir})`);
    console.log(`[CDP] 디버깅 포트: ${this.config.debugPort}`);

    const cmd = `"${chromePath}" --remote-debugging-port=${this.config.debugPort} --user-data-dir="${userDataDir}" --no-first-run --no-default-browser-check --disable-background-timer-throttling --disable-backgrounding-occluded-windows --disable-renderer-backgrounding`;

    this.chromeProcess = spawn(cmd, {
      shell: true,
      detached: true,
      stdio: 'ignore',
      windowsHide: false,
    } as any);

    this.chromeProcess.on('error', (err) => {
      console.error(`[CDP] Chrome 실행 오류: ${err.message}`);
    });

    this.chromeProcess.unref();
  }

  /**
   * CDP 포트가 열릴 때까지 대기
   */
  private async waitForDebugPort(timeoutMs: number = 30000): Promise<void> {
    const start = Date.now();
    let attempts = 0;
    while (Date.now() - start < timeoutMs) {
      attempts++;
      if (await this.isDebugPortOpen()) {
        console.log(`[CDP] 디버깅 포트 준비 완료 (${attempts}회 시도, ${Date.now() - start}ms)`);
        return;
      }
      if (attempts % 10 === 0) {
        console.log(`[CDP] 포트 대기 중... (${Math.round((Date.now() - start) / 1000)}초)`);
      }
      await new Promise((r) => setTimeout(r, 1000));
    }
    throw new Error(
      `[CDP] Chrome 디버깅 포트(${this.config.debugPort})가 ${timeoutMs}ms 내에 열리지 않았습니다.\n` +
      `확인 사항:\n` +
      `1. Chrome이 정상 실행되었는지\n` +
      `2. 포트 ${this.config.debugPort}가 사용 중이 아닌지\n` +
      `3. 프로필 경로: ${this.config.userDataDir}`
    );
  }

  /**
   * Chrome에 CDP로 연결
   *
   * 1. 기존 Chrome 종료 (설정에 따라)
   * 2. 전용 디버그 프로필로 Chrome 실행
   * 3. CDP로 Playwright 연결
   * 4. 페이지 반환
   */
  async connect(): Promise<CDPConnection> {
    const alreadyRunning = await this.isDebugPortOpen();

    if (alreadyRunning) {
      console.log('[CDP] 이미 디버깅 포트가 열려있음 → 바로 연결');
    } else {
      if (this.config.killExisting) {
        this.killExistingChrome();
        await new Promise((r) => setTimeout(r, 3000));
      }

      this.launchChrome();
      await this.waitForDebugPort(this.config.launchWaitMs + 15000);
    }

    // Playwright CDP 연결
    console.log('[CDP] Playwright 연결 중...');
    this.browser = await chromium.connectOverCDP(
      `http://127.0.0.1:${this.config.debugPort}`,
    );
    console.log('[CDP] Playwright 연결 성공!');

    // 컨텍스트와 페이지 가져오기
    const contexts = this.browser.contexts();
    const context = contexts[0];

    if (!context) {
      throw new Error('[CDP] 브라우저 컨텍스트를 찾을 수 없습니다');
    }

    // 기존 탭 사용 또는 새 탭 생성
    const pages = context.pages();
    let page;

    if (pages.length > 0) {
      page = pages.find(p => {
        const url = p.url();
        return url === 'about:blank' || url.includes('newtab') || url.includes('naver.com');
      }) || pages[0];
      console.log(`[CDP] 기존 탭 사용: ${page.url()}`);
    } else {
      page = await context.newPage();
      console.log('[CDP] 새 탭 생성');
    }

    return { browser: this.browser, context, page };
  }

  /**
   * CDP 연결 해제 (Chrome은 종료하지 않음)
   */
  async disconnect(): Promise<void> {
    if (this.browser) {
      console.log('[CDP] Playwright 연결 해제 (Chrome은 유지됨)');
      this.browser = null;
    }
  }

  /**
   * CDP 연결 해제 + Chrome 종료
   */
  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      console.log('[CDP] Chrome 종료됨');
      this.browser = null;
    }
  }
}
