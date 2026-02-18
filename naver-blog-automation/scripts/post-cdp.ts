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
  title: '삼색 고양이의 모든 것, 성격부터 유전학까지 총정리',
  content: `안녕하세요, 오늘은 고양이 중에서도 독특한 매력을 지닌 삼색 고양이에 대해 알아보겠습니다.

삼색 고양이란?

삼색 고양이는 흰색, 검은색, 주황색(또는 갈색) 세 가지 털 색을 가진 고양이를 말합니다. 영어로는 'Calico Cat'이라고 부르며, 일본에서는 '미케네코'라고 합니다. 삼색 고양이는 특정 품종이 아니라 털 색 패턴을 기준으로 한 분류입니다. 코리안 숏헤어, 페르시안, 먼치킨 등 다양한 품종에서 삼색 패턴이 나타날 수 있습니다.

삼색 고양이는 거의 다 암컷?

삼색 고양이의 가장 흥미로운 특징은 99.97%가 암컷이라는 점입니다. 이건 우연이 아니라 유전학적인 이유가 있습니다.

고양이의 털 색은 X 염색체에 의해 결정됩니다. 주황색 털을 만드는 유전자와 검은색 털을 만드는 유전자가 모두 X 염색체 위에 있습니다. 암컷은 XX 염색체를 가지고 있어서 두 개의 X 염색체에 각각 다른 색 유전자를 가질 수 있습니다. 반면 수컷은 XY 염색체이기 때문에 X 염색체가 하나뿐이라 주황색 또는 검은색 중 하나만 가질 수 있습니다.

수컷 삼색 고양이는 XXY 염색체(클라인펠터 증후군)를 가진 매우 드문 경우에만 나타나며, 약 3천 마리 중 1마리 꼴로 태어납니다. 수컷 삼색이는 대부분 생식 능력이 없습니다.

삼색 고양이의 성격

삼색 고양이는 '까칠하다'는 인식이 있는데, 실제로 미국 UC데이비스 수의대의 연구에 따르면 삼색 고양이가 단색 고양이보다 약간 더 공격적인 성향을 보인다고 합니다. 하지만 이는 통계적 경향일 뿐이고, 개체마다 성격 차이가 큽니다.

일반적으로 삼색 고양이의 성격은 다음과 같이 알려져 있습니다.

- 독립적이고 자존심이 강하다
- 호기심이 많고 활발하다
- 집사에게 애교를 부릴 때와 혼자 있고 싶을 때가 뚜렷하다
- 영리하고 눈치가 빠르다
- 낯선 사람에게는 경계심을 보이기도 한다

물론 성격은 품종, 양육 환경, 사회화 시기 등 다양한 요인에 의해 결정되므로 털 색만으로 성격을 단정 짓기는 어렵습니다.

삼색 고양이 vs 고등어 태비 vs 턱시도 차이

고양이 털 패턴은 다양한데, 비슷해 보여도 구분이 있습니다.

1. 삼색(캘리코): 흰색 바탕에 검은색과 주황색 큰 패치가 뚜렷하게 구분됨
2. 토티(거북등): 검은색과 주황색이 뒤섞여 있고 흰색이 거의 없음
3. 고등어 태비: 줄무늬 패턴 (삼색과는 다른 유전자)
4. 턱시도: 검은색과 흰색 두 가지 색만 있음

삼색 고양이와 토티셸은 같은 유전적 원리를 공유하지만, 흰 반점 유전자(S 유전자)의 유무에 따라 구분됩니다.

삼색 고양이는 행운의 상징?

일본의 '마네키네코(복 고양이 인형)'가 바로 삼색 고양이를 모델로 한 것입니다. 일본에서는 삼색 고양이가 행운과 부를 불러온다고 믿어왔습니다. 이 믿음은 동아시아뿐 아니라 전 세계적으로 퍼져 있는데, 영미권에서도 삼색 고양이를 'Money Cat'이라고 부르기도 합니다.

특히 수컷 삼색 고양이는 태어날 확률이 매우 낮아서 더욱 행운의 상징으로 여겨집니다.

삼색 고양이 키울 때 참고할 점

삼색 고양이를 키울 때 특별히 다른 점은 없지만, 몇 가지 알아두면 좋은 것들이 있습니다.

- 건강: 삼색 패턴 자체가 특정 질병과 연관되지는 않습니다. 다만 품종에 따른 유전질환은 확인이 필요합니다.
- 사회화: 독립적인 성향이 강할 수 있으므로, 어릴 때부터 다양한 경험을 시켜주는 것이 좋습니다.
- 공간: 활발한 편이라 수직 공간(캣타워 등)을 마련해주면 좋아합니다.
- 놀이: 사냥 본능이 강해서 낚싯대 장난감이나 깃털 장난감에 잘 반응합니다.

삼색 고양이, 세상에 하나뿐인 무늬

삼색 고양이의 털 패턴은 X 염색체 불활성화라는 무작위 과정에 의해 만들어지기 때문에, 같은 부모에게서 태어난 삼색 고양이라도 무늬가 전부 다릅니다. 세상에 똑같은 삼색 고양이는 없는 셈이죠. 바로 이 점이 삼색 고양이의 가장 큰 매력이 아닐까요?

삼색 고양이를 키우고 계시다면, 그 독특한 무늬와 성격을 가진 세상에 하나뿐인 아이와 함께하는 행운을 즐겨보세요!`,

  tags: ['삼색고양이', '캘리코', '고양이성격', '고양이유전학', '반려묘'],
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
