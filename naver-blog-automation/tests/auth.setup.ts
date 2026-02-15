/**
 * 네이버 로그인 셋업
 *
 * 사용법:
 *   1. .env 파일에 NAVER_ID, NAVER_PW 설정
 *   2. npm run login (headed 모드로 실행)
 *   3. 최초 실행 시 캡차/2단계 인증이 필요할 수 있음 → 수동 처리
 *   4. 로그인 성공 시 playwright/.auth/naver.json에 세션 저장
 *   5. 이후 실행부터는 저장된 세션 재사용
 */
import { test as setup, expect } from '@playwright/test';
import path from 'path';
import { applyStealthScripts, humanDelay, humanTypeToLocator, pageLoadDelay } from '../src/human-like';

const authFile = path.join(__dirname, '../playwright/.auth/naver.json');

setup('네이버 로그인', async ({ page }) => {
  // 1. 봇 감지 우회 스크립트 적용
  await applyStealthScripts(page);

  // 2. 네이버 로그인 페이지 이동
  await page.goto('https://nid.naver.com/nidlogin.login', {
    waitUntil: 'domcontentloaded',
  });
  await pageLoadDelay();

  // 3. 아이디 입력
  // 네이버는 빠른 자동 입력을 감지하므로 클립보드 방식 사용
  const idInput = page.locator('#id');
  await idInput.click();
  await humanDelay(300, 600);

  // 클립보드를 통한 입력 (네이버 키보드 보안 우회)
  const naverId = process.env.NAVER_ID;
  const naverPw = process.env.NAVER_PW;

  if (!naverId || !naverPw) {
    throw new Error('.env 파일에 NAVER_ID와 NAVER_PW를 설정해주세요');
  }

  // 아이디 입력 (evaluate로 직접 값 설정)
  await page.evaluate((id) => {
    const el = document.querySelector('#id') as HTMLInputElement;
    if (el) {
      el.focus();
      el.value = id;
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }, naverId);
  await humanDelay(500, 1000);

  // 4. 비밀번호 입력
  await page.evaluate((pw) => {
    const el = document.querySelector('#pw') as HTMLInputElement;
    if (el) {
      el.focus();
      el.value = pw;
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }, naverPw);
  await humanDelay(500, 1000);

  // 5. 로그인 버튼 클릭
  const loginBtn = page.locator('.btn_login, #log\\.login, button[type="submit"]').first();
  await loginBtn.click();
  await humanDelay(2000, 4000);

  // 6. 로그인 후 중간 페이지 처리
  // 기기 등록 페이지 (deviceConfirm) 또는 캡차/추가 인증 대기
  try {
    // 네이버 메인 또는 기기 등록 페이지로 이동 대기
    await page.waitForURL(
      (url) =>
        url.hostname === 'www.naver.com' ||
        url.pathname.includes('deviceConfirm') ||
        url.pathname.includes('redirect'),
      { timeout: 15_000 },
    );
  } catch {
    // 캡차/추가 인증 대기 (최대 2분)
    console.log('========================================');
    console.log('[Auth] 캡차 또는 추가 인증이 필요합니다.');
    console.log('[Auth] 브라우저에서 수동으로 처리해주세요.');
    console.log('[Auth] 최대 2분 대기합니다...');
    console.log('========================================');

    await page.waitForURL(
      (url) =>
        url.hostname === 'www.naver.com' ||
        url.hostname === 'blog.naver.com' ||
        url.pathname.includes('deviceConfirm') ||
        url.pathname.includes('redirect'),
      { timeout: 120_000 },
    );
  }

  // 6-1. 기기 등록 페이지 처리 ("등록" 버튼 클릭)
  if (page.url().includes('deviceConfirm')) {
    console.log('[Auth] 기기 등록 페이지 감지 → "등록" 클릭');
    const registerBtn = page.locator('button:has-text("등록"), a:has-text("등록")').first();
    await registerBtn.click();
    await humanDelay(2000, 4000);
    // 등록 후 네이버 메인으로 리다이렉트 대기
    await page.waitForURL(
      (url) =>
        url.hostname === 'www.naver.com' ||
        url.hostname === 'blog.naver.com',
      { timeout: 15_000 },
    ).catch(() => {
      console.log('[Auth] 리다이렉트 대기 중...');
    });
  }

  // 7. 로그인 상태 확인
  // 네이버 메인에서 로그인 상태 확인
  await page.goto('https://www.naver.com', { waitUntil: 'domcontentloaded' });
  await humanDelay(1000, 2000);

  // 메일/카페 등 로그인 후에만 보이는 요소 확인
  const isLoggedIn = await page.locator('#account, .MyView-module__link_login___HpHMW, a[href*="mail.naver.com"]').first()
    .isVisible({ timeout: 10_000 })
    .catch(() => false);

  if (!isLoggedIn) {
    // 한번 더 시도: 블로그로 이동하여 확인
    await page.goto('https://blog.naver.com', { waitUntil: 'domcontentloaded' });
    await humanDelay(1000, 2000);
  }

  // 8. 세션 상태 저장
  await page.context().storageState({ path: authFile });
  console.log(`[Auth] 세션 저장 완료: ${authFile}`);
});
