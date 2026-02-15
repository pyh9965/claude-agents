/**
 * CDP 모드 블로그 포스팅 스크립트
 *
 * 전용 디버그 프로필의 Chrome을 사용하여 네이버 블로그에 포스팅.
 *
 * 사전 준비:
 *   npm run chrome:setup  → 디버그 프로필 생성 + 네이버 수동 로그인 (최초 1회)
 *
 * 사용법:
 *   npm run post:cdp
 */
import dotenv from 'dotenv';
import path from 'path';
import { ChromeCDP } from '../src/chrome-cdp';
import { NaverBlogEditor, type BlogPostData } from '../src/blog-editor';
import { applyStealthScripts, humanDelay } from '../src/human-like';

// .env 로드
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// ============================================================
// 포스팅 내용 설정
// ============================================================
const postData: BlogPostData = {
  title: '레드향 제철 시기와 고르는 법, 귤과 뭐가 다를까?',
  content: `안녕하세요, 오늘은 겨울철 대표 과일 레드향에 대해 알아보겠습니다.

레드향이란?

레드향은 한라봉(청견)과 온주밀감(귤)을 교배해서 만든 만감류 품종입니다. 껍질이 붉은 주황색을 띠어서 '레드향'이라는 이름이 붙었습니다. 주로 제주도에서 재배되며, 2000년대 중반부터 본격적으로 시장에 나오기 시작했습니다.

레드향 제철 시기

레드향의 제철은 1월부터 3월까지입니다. 12월 말부터 수확이 시작되지만, 가장 맛있는 시기는 1월 중순에서 2월입니다. 이 시기에 당도가 가장 높고 과즙이 풍부합니다.

레드향 vs 일반 귤, 뭐가 다를까?

1. 크기: 레드향은 일반 귤보다 2~3배 크고, 한라봉보다는 약간 작습니다.
2. 당도: 일반 귤이 10~12 브릭스인 반면, 레드향은 12~14 브릭스로 더 달콤합니다.
3. 식감: 과육이 부드럽고 과즙이 매우 풍부합니다. 한 입 베어 물면 과즙이 터지는 느낌입니다.
4. 껍질: 귤처럼 손으로 쉽게 까지만, 껍질이 조금 더 두껍습니다.
5. 씨: 씨가 거의 없어서 먹기 편합니다.

맛있는 레드향 고르는 법

- 무게감이 있는 것: 들었을 때 묵직한 것이 과즙이 많습니다.
- 껍질 색이 진한 것: 붉은 주황색이 진할수록 잘 익은 것입니다.
- 꼭지가 싱싱한 것: 꼭지가 초록색이고 마르지 않은 것이 신선합니다.
- 탄력이 있는 것: 살짝 눌렀을 때 적당한 탄력이 느껴지는 것이 좋습니다.

레드향 보관법

상온에서 3~5일, 냉장 보관 시 1~2주 정도 보관 가능합니다. 비닐백에 넣어 냉장실에 보관하면 수분 손실을 막을 수 있습니다. 단, 너무 오래 냉장하면 신맛이 강해질 수 있으니 가급적 빨리 드시는 것을 추천합니다.

레드향 칼로리와 영양성분

레드향 100g당 칼로리는 약 47kcal로 낮은 편입니다. 비타민C가 풍부해서 감기 예방에 도움이 되고, 구연산이 피로 회복에 효과적입니다. 겨울철 면역력 관리에 딱 좋은 과일이죠.

올 겨울, 달콤한 레드향으로 비타민 충전하세요!`,

  tags: ['레드향', '제철과일', '겨울과일', '귤'],
  isPublic: true,
};

// ============================================================

async function main() {
  const blogId = process.env.BLOG_ID || process.env.NAVER_ID || '';
  if (!blogId) {
    console.error('ERROR: .env에 BLOG_ID 또는 NAVER_ID를 설정해주세요');
    process.exit(1);
  }

  const cdp = new ChromeCDP({
    debugPort: 9222,
    killExisting: true,
  });

  // 프로필 설정 확인
  if (!cdp.isProfileSetup()) {
    console.error('========================================');
    console.error('[CDP] 디버그 프로필이 설정되지 않았습니다!');
    console.error('[CDP] 먼저 npm run chrome:setup 을 실행해주세요.');
    console.error('========================================');
    process.exit(1);
  }

  console.log('========================================');
  console.log('[CDP] 네이버 블로그 자동 포스팅');
  console.log(`[CDP] 블로그 ID: ${blogId}`);
  console.log(`[CDP] 프로필: ${cdp.getProfilePath()}`);
  console.log('========================================');

  try {
    // 1. Chrome 연결
    const { page } = await cdp.connect();

    // 2. 스텔스 스크립트 적용
    await applyStealthScripts(page);

    // 3. 로그인 상태 확인
    console.log('[CDP] 로그인 상태 확인 중...');
    await page.goto('https://www.naver.com', { waitUntil: 'domcontentloaded' });
    await humanDelay(2000, 3000);

    const isLoggedIn = await page
      .locator('#account, .MyView-module__link_login___HpHMW, a[href*="mail.naver.com"]')
      .first()
      .isVisible({ timeout: 5_000 })
      .catch(() => false);

    if (isLoggedIn) {
      console.log('[CDP] 네이버 로그인 확인!');
    } else {
      console.error('[CDP] 네이버 로그인 안 됨!');
      console.error('[CDP] npm run chrome:setup 으로 다시 로그인해주세요.');
      await cdp.disconnect();
      process.exit(1);
    }

    // 4. 블로그 포스팅
    const editor = new NaverBlogEditor(page, blogId);
    await editor.createPost(postData);

    // 5. 발행 확인
    await humanDelay(3000, 5000);
    await page.goto(`https://blog.naver.com/${blogId}`, {
      waitUntil: 'domcontentloaded',
    });
    await humanDelay(3000, 5000);

    await editor.dismissBlogPagePopups();
    await humanDelay(1000, 2000);

    // 제목 확인
    const blogFrame = page.frameLocator('iframe#mainFrame');
    const postTitle = blogFrame
      .locator(`text=${postData.title}`)
      .or(blogFrame.getByText(postData.title))
      .or(page.locator(`text=${postData.title}`))
      .first();

    const titleFound = await postTitle
      .isVisible({ timeout: 15_000 })
      .catch(() => false);

    if (titleFound) {
      console.log(`[CDP] 게시글 확인 완료: "${postData.title}"`);
    } else {
      console.log('[CDP] 메인에서 제목 미발견 → 최신 글 확인');
      const latestPost = blogFrame
        .locator('a[class*="title"], .post-title a, a[class*="Title"]')
        .first();
      if (await latestPost.isVisible({ timeout: 5_000 }).catch(() => false)) {
        const latestTitle = await latestPost.textContent();
        console.log(`[CDP] 최신 게시글: "${latestTitle?.trim()}"`);
      }
    }

    // 스크린샷
    await page.screenshot({
      path: 'test-results/cdp-publish-verified.png',
      fullPage: true,
    });
    console.log('[CDP] 스크린샷 저장: test-results/cdp-publish-verified.png');

    console.log('========================================');
    console.log('[CDP] 블로그 포스팅 완료!');
    console.log('========================================');
  } catch (error) {
    console.error('[CDP] 오류 발생:', error);
    process.exit(1);
  } finally {
    await cdp.disconnect();
  }
}

main();
