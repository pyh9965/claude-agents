/**
 * 이미지 포함 통합 포스팅 스크립트 (인터리브 배치)
 *
 * 전체 워크플로우:
 *   1. Chrome CDP 연결
 *   2. ChatGPT에서 이미지 3개 생성 + 다운로드
 *   3. 네이버 블로그 에디터 열기
 *   4. [본문1] → [이미지1] → [본문2] → [이미지2] → [본문3] → [이미지3] 교차 배치
 *   5. 발행
 *
 * 사용법:
 *   npm run post:full
 */
import dotenv from 'dotenv';
import path from 'path';
import { ChromeCDP } from '../src/chrome-cdp';
import { NaverBlogEditor, type InterleavedPostData } from '../src/blog-editor';
import { ChatGPTImageGenerator } from '../src/chatgpt-image';
import { applyStealthScripts, humanDelay } from '../src/human-like';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

// ============================================================
// 설정: 이미지 프롬프트 3개 & 블로그 포스팅 내용 (섹션별)
// ============================================================
const IMAGE_PROMPTS = [
  '블로그 음식 사진을 그려줘: 김이 모락모락 나는 뜨끈한 칼국수 한 그릇을 위에서 45도 각도로 찍은 구도. 하얀 면발이 맑은 국물 위에 보이고, 호박, 감자, 양파가 함께 있다. 나무 테이블 위에 놓인 뚝배기, 따뜻하고 정감 있는 한국 가정식 느낌. 사실적인 음식 사진 스타일.',
  '블로그 음식 사진을 그려줘: 칼국수 면을 직접 만드는 모습. 나무 도마 위에 밀가루를 뿌려 넓게 편 반죽을 칼로 가지런히 썰고 있는 손 클로즈업. 주변에 밀가루 가루가 날리고, 잘 썰어진 면발이 옆에 가지런히 놓여 있다. 밝은 자연광, 한국 가정 부엌 배경. 사실적인 사진 스타일.',
  '블로그 음식 사진을 그려줘: 바지락 칼국수와 들깨 칼국수가 나란히 놓인 테이블. 왼쪽은 바지락과 맑은 국물의 해물 칼국수, 오른쪽은 고소한 들깨 국물의 크리미한 칼국수. 반찬으로 김치와 깍두기가 곁들여져 있다. 한국 식당의 따뜻한 분위기. 사실적인 음식 사진 스타일.',
];

// 이미지 파일 경로
const imagePaths = [
  path.resolve(__dirname, '../output/kalguksu-1.png'),
  path.resolve(__dirname, '../output/kalguksu-2.png'),
  path.resolve(__dirname, '../output/kalguksu-3.png'),
];

// 본문을 3개 섹션으로 나누어 이미지와 교차 배치
const postData: InterleavedPostData = {
  title: '칼국수 완벽 가이드, 종류부터 맛집 고르는 법까지 총정리',
  sections: [
    {
      // 섹션 1: 인트로 + 역사 → 이미지 1 (칼국수 한 그릇)
      content: `안녕하세요, 오늘은 한국인의 소울푸드 칼국수에 대해 깊이 있게 알아보겠습니다.

칼국수란?

칼국수는 밀가루 반죽을 얇게 밀어 칼로 잘라 만든 면을 육수에 넣고 끓인 한국 전통 면 요리입니다. 이름 그대로 '칼로 자른 국수'라는 뜻이며, 손으로 직접 반죽하고 칼로 써는 정성이 담긴 음식입니다. 뜨끈한 국물에 쫄깃한 면발이 어우러져 남녀노소 누구나 사랑하는 한식 대표 메뉴 중 하나입니다.

칼국수의 역사

칼국수의 역사는 고려시대까지 거슬러 올라갑니다. 당시에는 밀가루가 귀했기 때문에 귀족이나 상류층에서만 먹을 수 있는 고급 음식이었습니다. 조선시대에 들어서면서 밀 재배가 확대되어 서민들도 즐길 수 있게 되었고, 특히 여름철 밀 수확 후 햇밀가루로 칼국수를 만들어 먹는 것이 계절 별미가 되었습니다.

한국전쟁 이후 미국의 밀가루 원조가 들어오면서 칼국수는 전국적으로 대중화되었습니다. 각 지역마다 고유한 스타일이 발전하여 오늘날 다양한 종류의 칼국수를 만날 수 있게 되었습니다.
`,
      image: imagePaths[0],
    },
    {
      // 섹션 2: 칼국수 종류 → 이미지 2 (면 만드는 모습)
      content: `
칼국수의 종류

칼국수는 육수 재료에 따라 다양한 종류로 나뉩니다.

1. 멸치 칼국수: 가장 기본적인 칼국수입니다. 멸치와 다시마로 우린 맑은 국물이 특징이며, 감자, 호박, 양파 등의 채소가 들어갑니다. 깔끔하고 시원한 맛이 매력입니다.

2. 바지락 칼국수: 충남 서해안 지역의 대표 칼국수입니다. 신선한 바지락에서 나오는 시원한 국물맛이 일품이며, 해산물 특유의 감칠맛이 면에 배어듭니다. 인천 소래포구, 충남 보령 등이 유명합니다.

3. 들깨 칼국수: 들깨를 갈아 넣어 고소하고 크리미한 국물이 특징입니다. 구수한 맛이 일품이며, 추운 겨울에 특히 인기가 많습니다. 강원도 지역에서 즐겨 먹습니다.

4. 닭칼국수: 닭을 푹 고아 만든 진한 국물에 칼국수를 넣은 보양식입니다. 닭고기의 담백함과 면의 쫄깃함이 조화롭습니다. 여름 보양식으로도 인기입니다.

5. 해물 칼국수: 새우, 홍합, 오징어 등 다양한 해산물을 넣어 끓인 칼국수입니다. 해물의 시원한 국물맛이 깊고, 건더기도 풍성해서 푸짐한 한 끼가 됩니다.

6. 팥칼국수: 팥을 삶아 걸쭉하게 만든 국물에 칼국수를 넣은 독특한 메뉴입니다. 달콤하면서도 고소한 팥 국물이 새로운 맛의 경험을 선사합니다.

맛있는 칼국수의 비결

맛있는 칼국수를 만드는 핵심 포인트를 알아봅시다.

면 반죽: 밀가루에 소금과 물을 넣고 반죽합니다. 반죽은 30분 이상 충분히 숙성시켜야 면이 쫄깃해집니다. 반죽을 밀 때는 균일한 두께로 밀어야 고르게 익습니다. 면의 두께는 2~3mm가 적당하며, 너무 얇으면 퍼지고 너무 두꺼우면 안 익습니다.

육수: 멸치는 머리와 내장을 제거한 후 사용해야 쓴맛이 나지 않습니다. 다시마, 양파, 대파와 함께 30분 이상 끓여야 깊은 맛이 납니다. 육수가 충분히 우러나면 건더기는 건져내고 맑은 국물만 사용합니다.

끓이기: 팔팔 끓는 육수에 면을 넣고, 감자와 호박을 함께 넣어 끓입니다. 면을 넣은 후 한소끔 끓어오르면 찬물을 한 번 부어주면 면이 더 쫄깃해집니다. 총 10~15분 정도 끓이면 완성입니다.
`,
      image: imagePaths[1],
    },
    {
      // 섹션 3: 맛집 팁 + 마무리 → 이미지 3 (바지락/들깨 칼국수)
      content: `
칼국수 맛집 고르는 팁

좋은 칼국수집을 찾는 몇 가지 팁을 소개합니다.

- 직접 면을 뽑는 곳: 수제 면은 공장 면과 확연히 다릅니다. 면을 직접 반죽하고 써는 곳이라면 기본기가 탄탄한 집입니다.
- 국물 맛이 깔끔한 곳: 조미료 맛이 아닌 자연 재료의 맛이 나는 국물이어야 합니다. 뒷맛이 깔끔하고 계속 먹고 싶어지는 국물이 좋은 국물입니다.
- 김치가 맛있는 곳: 의외로 칼국수집의 실력은 곁들이 김치에서 드러납니다. 직접 담근 배추김치나 깍두기가 맛있으면 음식 전반에 정성을 들이는 집입니다.
- 줄 서는 곳: 현지인들이 줄을 서서 먹는 곳은 대체로 실패하지 않습니다. 특히 점심시간에 직장인들이 많이 찾는 곳을 주목하세요.

칼국수와 함께 즐기는 음식

칼국수와 잘 어울리는 사이드 메뉴도 있습니다.

- 공깃밥: 국물에 밥을 말아 먹으면 또 다른 맛입니다
- 김치전: 바삭한 김치전과 칼국수의 조합은 환상적입니다
- 보쌈: 칼국수 전문점에서 보쌈을 함께 파는 곳이 많은데, 궁합이 아주 좋습니다
- 만두: 칼국수와 만두의 조합은 한국인의 클래식 조합입니다
`,
      image: imagePaths[2],
    },
    {
      // 섹션 4: 마무리 (이미지 없음)
      content: `
마무리

칼국수는 정성이 담긴 한국의 전통 면 요리입니다. 손으로 직접 반죽하고 칼로 자르는 과정에서 만드는 이의 마음이 담기고, 뜨끈한 국물 한 그릇에 하루의 피로가 풀리는 위로의 음식이기도 합니다.

추운 날 김이 모락모락 나는 칼국수 한 그릇, 생각만 해도 따뜻해지지 않나요? 오늘 점심으로 칼국수 한 그릇 어떠세요?`,
    },
  ],
  tags: ['칼국수', '칼국수맛집', '수제칼국수', '한국음식', '면요리'],
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

  if (!cdp.isProfileSetup()) {
    console.error('========================================');
    console.error('[CDP] 디버그 프로필이 설정되지 않았습니다!');
    console.error('[CDP] 먼저 npm run chrome:setup 을 실행해주세요.');
    console.error('========================================');
    process.exit(1);
  }

  console.log('========================================');
  console.log('[Full] 칼국수 이미지 3개 생성 + 인터리브 블로그 포스팅');
  console.log(`[Full] 블로그 ID: ${blogId}`);
  console.log('========================================');

  try {
    // 1. Chrome CDP 연결
    const { page, context } = await cdp.connect();
    await applyStealthScripts(page);

    const fs = await import('fs');

    // ── Step 1: ChatGPT 이미지 3개 생성 ──
    console.log('\n[Step 1/2] ChatGPT 이미지 3개 생성');
    console.log('─'.repeat(40));

    const generator = new ChatGPTImageGenerator(page);

    for (let i = 0; i < IMAGE_PROMPTS.length; i++) {
      const imgPath = imagePaths[i];

      // 이미 존재하면 스킵
      if (fs.existsSync(imgPath) && fs.statSync(imgPath).size > 10000) {
        console.log(`\n[이미지 ${i + 1}/3] 기존 이미지 재사용: ${imgPath} (${Math.round(fs.statSync(imgPath).size / 1024)}KB)`);
        continue;
      }

      console.log(`\n[이미지 ${i + 1}/3] 생성 시작...`);
      await generator.generateImage({
        prompt: IMAGE_PROMPTS[i],
        savePath: imgPath,
      });
      console.log(`[이미지 ${i + 1}/3] 생성 완료: ${imgPath}`);

      // 다음 이미지 생성 전 잠시 대기
      if (i < IMAGE_PROMPTS.length - 1) {
        await humanDelay(2000, 4000);
      }
    }

    // 생성된 이미지 확인 → 유효한 이미지만 섹션에 반영
    for (const section of postData.sections) {
      if (section.image && (!fs.existsSync(section.image) || fs.statSync(section.image).size <= 10000)) {
        console.warn(`[경고] 이미지 없음, 텍스트만 사용: ${section.image}`);
        section.image = undefined;
      }
    }

    const validCount = postData.sections.filter(s => s.image).length;
    console.log(`\n[Step 1/2] 이미지 ${validCount}/3개 준비 완료`);

    // ── Step 2: 네이버 블로그 인터리브 포스팅 ──
    console.log('\n[Step 2/2] 네이버 블로그 인터리브 포스팅');
    console.log('─'.repeat(40));

    // 네이버 작업용 새 탭
    const blogPage = await context.newPage();
    await applyStealthScripts(blogPage);

    // 로그인 상태 확인
    await blogPage.goto('https://www.naver.com', { waitUntil: 'domcontentloaded' });
    await humanDelay(2000, 3000);

    const isLoggedIn = await blogPage
      .locator('#account, .MyView-module__link_login___HpHMW, a[href*="mail.naver.com"]')
      .first()
      .isVisible({ timeout: 5_000 })
      .catch(() => false);

    if (!isLoggedIn) {
      throw new Error(
        '[Blog] 네이버 로그인 안 됨! npm run chrome:setup 으로 로그인하세요.',
      );
    }
    console.log('[Blog] 네이버 로그인 확인');

    // 인터리브 포스팅 (본문 중간에 이미지 삽입)
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
      path: 'test-results/full-post-verified.png',
      fullPage: true,
    });
    console.log('[Full] 스크린샷 저장: test-results/full-post-verified.png');

    console.log('========================================');
    console.log('[Full] 칼국수 인터리브 포스팅 완료!');
    console.log('========================================');
  } catch (error) {
    console.error('[Full] 오류:', error);
    process.exit(1);
  } finally {
    await cdp.disconnect();
  }
}

main();
