import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '.env') });

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  retries: 0,
  workers: 1,
  timeout: 120_000,
  reporter: [['list'], ['html', { open: 'never' }]],

  use: {
    // 네이버 감지 우회를 위한 설정
    channel: 'chrome',
    headless: false,
    viewport: { width: 1400, height: 900 },
    locale: 'ko-KR',
    timezoneId: 'Asia/Seoul',
    actionTimeout: 15_000,
    navigationTimeout: 30_000,

    // 실제 브라우저처럼 보이도록
    userAgent: undefined, // Chrome 기본 UA 사용
    javaScriptEnabled: true,
    ignoreHTTPSErrors: true,
    bypassCSP: false,

    // 녹화 (디버깅용)
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    video: 'retain-on-failure',

    launchOptions: {
      args: [
        '--disable-blink-features=AutomationControlled',
        '--disable-infobars',
        '--no-sandbox',
      ],
      slowMo: 50,
    },
  },

  projects: [
    {
      name: 'auth-setup',
      testMatch: /auth\.setup\.ts/,
    },
    {
      name: 'blog-post',
      testMatch: /blog-post\.spec\.ts/,
      dependencies: ['auth-setup'],
      use: {
        storageState: 'playwright/.auth/naver.json',
      },
    },
  ],
});
