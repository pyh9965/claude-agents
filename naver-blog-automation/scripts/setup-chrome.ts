/**
 * Chrome 디버그 프로필 초기 설정
 *
 * Chrome 136+ 보안 정책으로 기본 프로필에서는 CDP(원격 디버깅) 사용 불가.
 * → 전용 디버그 프로필을 생성하고, 네이버에 수동 로그인하여 쿠키를 저장.
 * → 이후 npm run post:cdp 실행 시 로그인 없이 자동 포스팅 가능.
 *
 * 사용법:
 *   npm run chrome:setup
 *
 * 이 스크립트 실행 후:
 *   1. Chrome 브라우저가 열립니다
 *   2. 네이버(naver.com)에 직접 로그인하세요
 *   3. 로그인 완료 후 이 터미널에서 Enter를 누르세요
 *   4. ChatGPT(chatgpt.com)에 로그인하세요
 *   5. 로그인 완료 후 Enter를 누르세요
 *   6. 모든 로그인 상태가 확인되면 설정 완료!
 */
import { ChromeCDP } from '../src/chrome-cdp';
import * as readline from 'readline';

function waitForEnter(message: string): Promise<void> {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    rl.question(message, () => {
      rl.close();
      resolve();
    });
  });
}

async function main() {
  const cdp = new ChromeCDP({
    killExisting: true,
  });

  console.log('========================================');
  console.log('[Setup] Chrome 디버그 프로필 설정');
  console.log('========================================');
  console.log('');
  console.log(`프로필 경로: ${cdp.getProfilePath()}`);
  console.log('');

  if (cdp.isProfileSetup()) {
    console.log('[Setup] 기존 디버그 프로필이 존재합니다.');
    console.log('[Setup] 로그인 상태를 확인합니다...');
  } else {
    console.log('[Setup] 새 디버그 프로필을 생성합니다.');
    console.log('[Setup] Chrome이 열리면 네이버에 로그인해주세요.');
  }

  console.log('');

  try {
    // 1. Chrome 시작 + CDP 연결
    const { page, context } = await cdp.connect();

    // 2. 네이버로 이동
    await page.goto('https://nid.naver.com/nidlogin.login', {
      waitUntil: 'domcontentloaded',
    });
    await new Promise(r => setTimeout(r, 2000));

    // 3. 로그인 상태 확인
    const isAlreadyLoggedIn = await page
      .goto('https://www.naver.com', { waitUntil: 'domcontentloaded' })
      .then(() => new Promise(r => setTimeout(r, 3000)))
      .then(() => page
        .locator('#account, .MyView-module__link_login___HpHMW, a[href*="mail.naver.com"]')
        .first()
        .isVisible({ timeout: 5_000 })
        .catch(() => false)
      );

    if (isAlreadyLoggedIn) {
      console.log('========================================');
      console.log('[Setup] 이미 네이버에 로그인되어 있습니다!');
      console.log('========================================');

      // blog.naver.com 접근 테스트
      await page.goto('https://blog.naver.com/GoBlogWrite.naver', {
        waitUntil: 'domcontentloaded',
      });
      await new Promise(r => setTimeout(r, 5000));

      const postwriteUrl = page.url();
      const canWrite = !postwriteUrl.includes('nidlogin') && !postwriteUrl.includes('login');

      if (canWrite) {
        console.log('[Setup] 블로그 글쓰기 접근: 성공!');
        console.log('[Setup] npm run post:cdp 로 바로 포스팅 가능합니다.');
      } else {
        console.log('[Setup] 블로그 글쓰기 접근: 로그인 필요');
        console.log('[Setup] Chrome에서 네이버에 다시 로그인해주세요.');

        await page.goto('https://nid.naver.com/nidlogin.login', {
          waitUntil: 'domcontentloaded',
        });

        await waitForEnter('\n네이버 로그인 완료 후 Enter를 눌러주세요...');
      }
    } else {
      // 로그인 페이지로 이동
      await page.goto('https://nid.naver.com/nidlogin.login', {
        waitUntil: 'domcontentloaded',
      });

      console.log('========================================');
      console.log('[Setup] Chrome 브라우저에서 네이버에 로그인해주세요!');
      console.log('');
      console.log('  1. Chrome 브라우저에 네이버 로그인 페이지가 열려있습니다');
      console.log('  2. 아이디와 비밀번호를 입력하고 로그인하세요');
      console.log('  3. 2단계 인증이 있다면 완료해주세요');
      console.log('  4. 로그인이 완료되면 아래에서 Enter를 눌러주세요');
      console.log('========================================');

      await waitForEnter('\n네이버 로그인 완료 후 Enter를 눌러주세요...');
    }

    // 4. 최종 로그인 확인
    await page.goto('https://www.naver.com', { waitUntil: 'domcontentloaded' });
    await new Promise(r => setTimeout(r, 3000));

    const finalLoginCheck = await page
      .locator('#account, .MyView-module__link_login___HpHMW, a[href*="mail.naver.com"]')
      .first()
      .isVisible({ timeout: 5_000 })
      .catch(() => false);

    if (!finalLoginCheck) {
      console.log('[Setup] 로그인이 확인되지 않습니다.');
      console.log('[Setup] 다시 실행하여 로그인해주세요.');
      await cdp.disconnect();
      process.exit(1);
    }

    // 5. blog postwrite 접근 테스트
    console.log('[Setup] 블로그 글쓰기 접근 테스트...');
    await page.goto('https://blog.naver.com/GoBlogWrite.naver', {
      waitUntil: 'domcontentloaded',
    });
    await new Promise(r => setTimeout(r, 5000));

    const finalUrl = page.url();
    const blogAccessOk = !finalUrl.includes('nidlogin') && !finalUrl.includes('login');

    if (blogAccessOk) {
      console.log('[Setup] 네이버 블로그 글쓰기: 접근 가능');
    } else {
      console.log('[Setup] 네이버 블로그 글쓰기: 접근 불가 (추가 인증 필요)');
      console.log('[Setup] Chrome에서 blog.naver.com에 직접 접근하여');
      console.log('[Setup] 글쓰기 페이지까지 이동해보세요.');
    }

    // ── 6. ChatGPT 로그인 설정 ──
    console.log('');
    console.log('========================================');
    console.log('[Setup] ChatGPT 로그인 설정');
    console.log('========================================');

    await page.goto('https://chatgpt.com', {
      waitUntil: 'domcontentloaded',
    });
    await new Promise(r => setTimeout(r, 5000));

    // ChatGPT 로그인 상태 확인 (로그인 버튼 유무로 판별)
    const chatgptLoginBtn = await page
      .locator('button:has-text("Log in"), a:has-text("Log in"), button:has-text("로그인")')
      .first()
      .isVisible({ timeout: 8_000 })
      .catch(() => false);

    let chatgptOk = !chatgptLoginBtn;

    if (!chatgptLoginBtn) {
      // 추가 확인: 프롬프트 입력란 존재 여부
      const hasPrompt = await page
        .locator('#prompt-textarea, [data-testid="prompt-textarea"]')
        .first()
        .isVisible({ timeout: 5_000 })
        .catch(() => false);
      chatgptOk = hasPrompt;
    }

    if (chatgptOk) {
      console.log('[Setup] ChatGPT 이미 로그인되어 있습니다!');
    } else {
      console.log('[Setup] ChatGPT 로그인이 필요합니다.');
      console.log('');
      console.log('  1. Chrome 브라우저에서 chatgpt.com 페이지가 열려있습니다');
      console.log('  2. "Log in" 버튼을 클릭하여 로그인하세요');
      console.log('  3. Google/Microsoft/Apple 계정으로 로그인 가능');
      console.log('  4. 로그인 완료 후 아래에서 Enter를 눌러주세요');
      console.log('');

      await waitForEnter('ChatGPT 로그인 완료 후 Enter를 눌러주세요...');

      // 로그인 재확인
      await page.goto('https://chatgpt.com', {
        waitUntil: 'domcontentloaded',
      });
      await new Promise(r => setTimeout(r, 5000));

      const reLoginBtn = await page
        .locator('button:has-text("Log in"), a:has-text("Log in"), button:has-text("로그인")')
        .first()
        .isVisible({ timeout: 5_000 })
        .catch(() => false);

      chatgptOk = !reLoginBtn && await page
        .locator('#prompt-textarea, [data-testid="prompt-textarea"]')
        .first()
        .isVisible({ timeout: 8_000 })
        .catch(() => false);

      if (chatgptOk) {
        console.log('[Setup] ChatGPT 로그인 확인!');
      } else {
        console.log('[Setup] ChatGPT 로그인이 확인되지 않습니다.');
        console.log('[Setup] 나중에 Chrome에서 chatgpt.com에 직접 로그인해주세요.');
      }
    }

    // ── 최종 결과 출력 ──
    console.log('');
    console.log('========================================');
    console.log('[Setup] 설정 결과');
    console.log('========================================');
    console.log(`  네이버 로그인:      ${'확인'}`);
    console.log(`  블로그 글쓰기:      ${blogAccessOk ? '접근 가능' : '추가 인증 필요'}`);
    console.log(`  ChatGPT 로그인:     ${chatgptOk ? '확인' : '미완료'}`);
    console.log('');
    if (blogAccessOk && chatgptOk) {
      console.log('[Setup] 모든 설정 완료!');
      console.log('[Setup] 사용 가능한 명령어:');
      console.log('  npm run post:cdp       → 블로그 포스팅');
      console.log('  npm run chatgpt:image  → ChatGPT 이미지 생성');
      console.log('  npm run post:full      → 이미지 생성 + 블로그 포스팅');
    } else if (blogAccessOk) {
      console.log('[Setup] 네이버 블로그 포스팅 사용 가능:');
      console.log('  npm run post:cdp');
      console.log('');
      console.log('[Setup] ChatGPT 이미지 기능을 사용하려면 chatgpt.com에 로그인 필요');
    } else {
      console.log('[Setup] 일부 기능이 아직 설정되지 않았습니다.');
      console.log('[Setup] npm run chrome:setup 을 다시 실행해주세요.');
    }
    console.log('========================================');

    // Chrome은 유지 (쿠키 저장)
    await cdp.disconnect();

  } catch (error) {
    console.error('[Setup] 오류:', error);
    process.exit(1);
  }
}

main();
