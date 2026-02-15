/**
 * 사람처럼 행동하기 위한 유틸리티
 * 네이버의 봇 감지를 우회하기 위해 랜덤 딜레이와 자연스러운 동작을 시뮬레이션
 */
import { type Page } from '@playwright/test';

/** min~max 사이 랜덤 정수 */
export function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/** 랜덤 딜레이 (ms) */
export async function humanDelay(min = 500, max = 1500): Promise<void> {
  const ms = randomInt(min, max);
  await new Promise((r) => setTimeout(r, ms));
}

/** 짧은 딜레이 (타이핑 사이) */
export async function typingDelay(): Promise<void> {
  await humanDelay(30, 120);
}

/** 페이지 전환 후 딜레이 */
export async function pageLoadDelay(): Promise<void> {
  await humanDelay(1500, 3000);
}

/** 사람처럼 텍스트 입력 (한 글자씩 랜덤 속도) */
export async function humanType(page: Page, selector: string, text: string): Promise<void> {
  await page.click(selector);
  await humanDelay(200, 500);

  for (const char of text) {
    await page.keyboard.type(char, { delay: randomInt(30, 150) });
  }
}

/** 로케이터에 사람처럼 텍스트 입력 */
export async function humanTypeToLocator(page: Page, text: string): Promise<void> {
  for (const char of text) {
    await page.keyboard.type(char, { delay: randomInt(30, 150) });
  }
}

/** 랜덤 스크롤 (사람처럼) */
export async function humanScroll(page: Page): Promise<void> {
  const scrollAmount = randomInt(100, 400);
  await page.mouse.wheel(0, scrollAmount);
  await humanDelay(300, 800);
}

/** 랜덤 마우스 이동 */
export async function humanMouseMove(page: Page): Promise<void> {
  const x = randomInt(100, 1200);
  const y = randomInt(100, 700);
  await page.mouse.move(x, y, { steps: randomInt(5, 15) });
  await humanDelay(100, 300);
}

/** WebDriver 감지 우회 스크립트 */
export async function applyStealthScripts(page: Page): Promise<void> {
  await page.addInitScript(() => {
    // navigator.webdriver 숨기기
    Object.defineProperty(navigator, 'webdriver', {
      get: () => undefined,
    });

    // chrome.runtime 추가 (일반 Chrome처럼)
    if (!(window as any).chrome) {
      (window as any).chrome = { runtime: {} };
    }

    // plugins 배열 추가
    Object.defineProperty(navigator, 'plugins', {
      get: () => [1, 2, 3, 4, 5],
    });

    // languages 설정
    Object.defineProperty(navigator, 'languages', {
      get: () => ['ko-KR', 'ko', 'en-US', 'en'],
    });

    // permissions query override
    const originalQuery = window.navigator.permissions.query;
    window.navigator.permissions.query = (parameters: any) =>
      parameters.name === 'notifications'
        ? Promise.resolve({ state: Notification.permission } as PermissionStatus)
        : originalQuery(parameters);
  });
}
