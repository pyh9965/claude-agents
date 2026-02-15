/**
 * Chrome을 디버깅 포트와 함께 실행하는 유틸리티
 *
 * 전용 디버그 프로필을 사용 (Chrome 136+ 보안 정책 대응).
 *
 * 사용법:
 *   npm run chrome:debug
 *
 * Chrome이 디버깅 포트(9222)와 함께 실행됩니다.
 * 이 상태에서 npm run post:cdp 를 실행하면 됩니다.
 *
 * 옵션:
 *   --no-kill    기존 Chrome을 종료하지 않음
 *   --port=9333  포트 변경
 */
import { ChromeCDP } from '../src/chrome-cdp';

async function main() {
  const args = process.argv.slice(2);
  const noKill = args.includes('--no-kill');
  const portArg = args.find(a => a.startsWith('--port='));
  const port = portArg ? parseInt(portArg.split('=')[1]) : 9222;

  const cdp = new ChromeCDP({
    debugPort: port,
    killExisting: !noKill,
  });

  console.log('========================================');
  console.log('[Chrome] 디버깅 모드로 Chrome 실행');
  console.log(`[Chrome] 포트: ${port}`);
  console.log(`[Chrome] 프로필: ${cdp.getProfilePath()}`);
  console.log(`[Chrome] 기존 Chrome 종료: ${!noKill ? '예' : '아니오'}`);
  console.log('========================================');

  if (!cdp.isProfileSetup()) {
    console.log('[Chrome] 디버그 프로필이 없습니다.');
    console.log('[Chrome] 먼저 npm run chrome:setup 을 실행해주세요.');
    process.exit(1);
  }

  try {
    const { page } = await cdp.connect();

    // 네이버로 이동하여 로그인 상태 확인
    await page.goto('https://www.naver.com', { waitUntil: 'domcontentloaded' });
    await new Promise(r => setTimeout(r, 3000));

    const isLoggedIn = await page
      .locator('#account, .MyView-module__link_login___HpHMW, a[href*="mail.naver.com"]')
      .first()
      .isVisible({ timeout: 5_000 })
      .catch(() => false);

    console.log('');
    if (isLoggedIn) {
      console.log('[Chrome] 네이버 로그인 상태: 확인됨');
      console.log('[Chrome] 바로 npm run post:cdp 실행 가능!');
    } else {
      console.log('[Chrome] 네이버 로그인 상태: 미로그인');
      console.log('[Chrome] npm run chrome:setup 으로 로그인해주세요.');
    }

    console.log('');
    console.log('========================================');
    console.log(`[Chrome] CDP 준비 완료 (포트: ${port})`);
    console.log('[Chrome] 이 터미널을 닫아도 Chrome은 유지됩니다.');
    console.log('========================================');

    await cdp.disconnect();

  } catch (error) {
    console.error('[Chrome] 오류:', error);
    process.exit(1);
  }
}

main();
