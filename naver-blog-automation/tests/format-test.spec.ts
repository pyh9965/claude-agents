/**
 * 강원도 고성 여행 - 전체 파이프라인 E2E 테스트
 * ChatGPT 이미지 생성 → 인터리브 블로그 포스팅 (발행은 비공개)
 *
 * 사용법:
 *   npx playwright test tests/format-test.spec.ts --project=cdp-test --headed
 *
 * 사전 조건:
 *   1. Chrome 디버그 모드 실행: npm run chrome:debug
 *   2. 네이버 + ChatGPT 로그인 완료: npm run chrome:setup
 */
import { test, chromium, type Page, type BrowserContext } from '@playwright/test';
import { NaverBlogEditor, type InterleavedPostData } from '../src/blog-editor';
import { ChatGPTImageGenerator } from '../src/chatgpt-image';
import { applyStealthScripts, humanDelay } from '../src/human-like';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

// 이미지 생성 + 블로그 포스팅은 시간이 오래 걸림
test.setTimeout(300_000); // 5분

// ── 이미지 프롬프트 3개 ──
const IMAGE_PROMPTS = [
  '블로그 여행 사진을 그려줘: 강원도 고성 통일전망대에서 바라본 금강산 풍경. 맑은 하늘 아래 웅장한 산봉우리들이 펼쳐지고, 전망대 난간이 앞에 보인다. 가을 단풍이 물든 산과 동해 바다가 함께 보이는 파노라마 구도. 사실적인 여행 사진 스타일.',
  '블로그 여행 사진을 그려줘: 강원도 고성 화진포 해변의 일출 풍경. 잔잔한 동해 바다 위로 붉은 태양이 떠오르고, 넓은 모래사장에 아침 빛이 반짝인다. 해변 뒤로 소나무 숲이 보이고, 평화롭고 고요한 분위기. 사실적인 풍경 사진 스타일.',
  '블로그 음식 사진을 그려줘: 강원도 고성 대진항 물회 한 그릇. 신선한 광어, 우럭 회가 얼음 위에 올려져 있고, 매콤새콤한 양념장이 곁들여진 물회. 옆에 소주 한 잔과 바다가 보이는 항구 식당 배경. 사실적인 음식 사진 스타일.',
];

const OUTPUT_DIR = path.resolve(__dirname, '../output');
const IMAGE_PATHS = [
  path.join(OUTPUT_DIR, 'goseong-1.png'),
  path.join(OUTPUT_DIR, 'goseong-2.png'),
  path.join(OUTPUT_DIR, 'goseong-3.png'),
];

// ── 인터리브 포스팅 데이터 ──
const postData: InterleavedPostData = {
  title: '강원도 고성 여행 완벽 가이드 - 통일전망대부터 화진포까지',
  sections: [
    {
      content: `강원도 고성은 동해안의 숨겨진 보석 같은 여행지입니다. 서울에서 약 3시간이면 도착할 수 있는 이곳은 때묻지 않은 자연경관과 맑은 바다로 여행자들의 마음을 사로잡습니다. 특히 사계절 내내 다양한 매력을 뽐내는 곳이라 언제 방문해도 후회 없는 여행이 될 거예요.

고성 여행의 하이라이트, 통일전망대

고성에 왔다면 통일전망대는 꼭 방문해야 할 필수 코스입니다. 이곳에서는 금강산의 웅장한 봉우리들을 육안으로 확인할 수 있어요. 맑은 날에는 해금강의 절경까지 한눈에 들어오는데, 분단의 현실을 체감하면서도 자연의 아름다움에 감탄하게 되는 특별한 경험을 할 수 있습니다. 전망대 입장 전에 통일안보공원에서 출입 신청을 해야 하니 신분증은 꼭 챙겨가세요. 관람 시간은 오전 9시부터 오후 4시까지이며, 동절기에는 시간이 단축될 수 있으니 미리 확인하고 가시는 걸 추천합니다.`,
      image: IMAGE_PATHS[0],
    },
    {
      content: `화진포의 아름다운 호수와 해변

화진포는 동해안 최대의 자연 석호로, 호수와 바다가 만나는 독특한 풍경을 자랑합니다. 화진포 해변은 수심이 얕고 모래가 고와서 가족 여행객들에게 특히 인기가 많아요. 해변 주변에는 이승만 별장, 이기붕 별장, 김일성 별장이 역사 전시관으로 운영되고 있어 역사 공부도 함께 할 수 있습니다. 호수 둘레길을 따라 산책하면 철새들의 군무도 볼 수 있는데, 특히 겨울철에는 고니와 청둥오리 등 다양한 철새들이 찾아와 장관을 이룹니다.

송지호와 왕곡마을의 전통 풍경

송지호는 화진포와 함께 고성의 대표적인 석호입니다. 주변에 조성된 관찰 데크에서는 천연기념물인 큰고니를 가까이에서 관찰할 수 있어요. 송지호 해변은 서퍼들에게도 인기 있는 스팟이니 서핑에 관심 있다면 한번 도전해보세요.`,
      image: IMAGE_PATHS[1],
    },
    {
      content: `고성 맛집과 먹거리

고성 여행에서 빼놓을 수 없는 것이 바로 신선한 해산물입니다. 대진항과 거진항에서는 갓 잡은 회와 물회를 저렴한 가격에 즐길 수 있어요. 특히 고성 물회는 동해안 특유의 담백한 맛이 일품인데, 현지인들이 추천하는 대진항 수산시장 근처 횟집들을 방문해보세요. 가을에는 대게 시즌이 시작되어 싱싱한 대게를 맛볼 수 있고, 여름에는 오징어와 한치가 제철이라 회로 먹으면 정말 맛있습니다.`,
      image: IMAGE_PATHS[2],
    },
    {
      content: `고성 여행 팁

1. 교통: 서울에서 속초 고속버스 이용 후 시내버스 환승, 또는 자가용 추천
2. 숙소: 화진포, 송지호 근처 펜션과 글램핑장이 인기
3. 추천 시기: 여름(해수욕), 가을(단풍+대게), 겨울(철새+설경)
4. 준비물: 통일전망대 방문 시 신분증 필수

고성은 속초나 강릉에 비해 아직 덜 알려진 여행지라 한적하고 여유로운 여행을 즐길 수 있다는 것이 가장 큰 장점입니다. 복잡한 도심을 벗어나 자연 속에서 힐링하고 싶다면 강원도 고성으로 떠나보세요!`,
    },
  ],
  tags: ['강원도여행', '고성여행', '통일전망대', '화진포', '동해안여행'],
  isPublic: false, // 테스트이므로 비공개 발행
};

test.describe('강원도 고성 여행 - 전체 파이프라인 (CDP)', () => {

  test('이미지 3개 생성 → 인터리브 블로그 포스팅', async () => {
    const blogId = process.env.BLOG_ID || process.env.NAVER_ID || '';
    test.skip(!blogId, '.env에 BLOG_ID 설정 필요');

    // 출력 디렉토리 생성
    if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

    // ── CDP로 기존 Chrome에 연결 ──
    const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
    const context = browser.contexts()[0];
    const chatgptPage = context.pages()[0] || await context.newPage();

    try {
      await applyStealthScripts(chatgptPage);

      // ══════════════════════════════════════
      // Step 1: ChatGPT 이미지 3개 생성
      // ══════════════════════════════════════
      console.log('\n[Step 1/2] ChatGPT 이미지 3개 생성');
      console.log('─'.repeat(40));

      const generator = new ChatGPTImageGenerator(chatgptPage);

      for (let i = 0; i < IMAGE_PROMPTS.length; i++) {
        const imgPath = IMAGE_PATHS[i];

        // 이미 존재하면 스킵
        if (fs.existsSync(imgPath) && fs.statSync(imgPath).size > 10000) {
          console.log(`[이미지 ${i + 1}/3] 기존 이미지 재사용: ${imgPath} (${Math.round(fs.statSync(imgPath).size / 1024)}KB)`);
          continue;
        }

        console.log(`[이미지 ${i + 1}/3] 생성 시작...`);
        await generator.generateImage({
          prompt: IMAGE_PROMPTS[i],
          savePath: imgPath,
        });
        console.log(`[이미지 ${i + 1}/3] 생성 완료: ${imgPath}`);

        if (i < IMAGE_PROMPTS.length - 1) {
          await humanDelay(2000, 4000);
        }
      }

      // 유효한 이미지만 섹션에 반영
      for (const section of postData.sections) {
        if (section.image && (!fs.existsSync(section.image) || fs.statSync(section.image).size <= 10000)) {
          console.warn(`[경고] 이미지 없음/너무 작음 → 텍스트만 사용: ${section.image}`);
          section.image = undefined;
        }
      }

      const validCount = postData.sections.filter(s => s.image).length;
      console.log(`\n[Step 1] 이미지 ${validCount}/3개 준비 완료`);

      // ══════════════════════════════════════
      // Step 2: 네이버 블로그 인터리브 포스팅
      // ══════════════════════════════════════
      console.log('\n[Step 2/2] 네이버 블로그 인터리브 포스팅');
      console.log('─'.repeat(40));

      // 네이버용 새 탭
      const blogPage = await context.newPage();
      await applyStealthScripts(blogPage);

      // 로그인 확인
      await blogPage.goto('https://www.naver.com', { waitUntil: 'domcontentloaded' });
      await humanDelay(2000, 3000);

      const isLoggedIn = await blogPage
        .locator('#account, .MyView-module__link_login___HpHMW, a[href*="mail.naver.com"]')
        .first()
        .isVisible({ timeout: 5_000 })
        .catch(() => false);

      test.skip(!isLoggedIn, '네이버 로그인 필요');

      console.log('[Blog] 네이버 로그인 확인');

      // 인터리브 포스팅 실행 (formatForBlog 자동 적용)
      const editor = new NaverBlogEditor(blogPage, blogId);
      await editor.createInterleavedPost(postData);

      // 발행 확인
      await humanDelay(3000, 5000);
      await blogPage.goto(`https://blog.naver.com/${blogId}`, {
        waitUntil: 'domcontentloaded',
      });
      await humanDelay(3000, 5000);
      await editor.dismissBlogPagePopups();

      await blogPage.screenshot({
        path: 'test-results/goseong-post-verified.png',
        fullPage: true,
      });

      console.log('========================================');
      console.log('[Test] 강원도 고성 여행 포스팅 완료! (비공개)');
      console.log('[Test] 스크린샷: test-results/goseong-post-verified.png');
      console.log('========================================');

    } finally {
      // 남아있는 OS 파일 다이얼로그 정리 (spawnSync 직접 호출 - editor 스코프 밖)
      try {
        const { spawnSync } = await import('child_process');
        const script = [
          '$s = New-Object -ComObject WScript.Shell',
          '@("열기","Open","파일 열기") | ForEach-Object {',
          '  if ($s.AppActivate($_)) { Start-Sleep -Milliseconds 300; $s.SendKeys("{ESC}") }',
          '}',
        ].join('\n');
        const encoded = Buffer.from(script, 'utf16le').toString('base64');
        spawnSync('C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe', ['-NonInteractive', '-EncodedCommand', encoded], {
          timeout: 5_000, stdio: 'ignore',
        });
      } catch { /* ignore */ }
      // Chrome 유지 (종료하지 않음)
    }
  });
});
