/**
 * 네이버 API 통합 테스트 스크립트
 */

import { config } from 'dotenv';
config();

import { getNaverAPIService, NaverAPIService } from '../src/services/naver-api.js';

async function testNaverAPI() {
  console.log('🔍 네이버 검색 API 통합 테스트\n');
  console.log('─'.repeat(50));

  const naverAPI = getNaverAPIService();

  // API 사용 가능 여부 확인
  if (!naverAPI.isAvailable()) {
    console.log('❌ 네이버 API 키가 설정되지 않았습니다.');
    console.log('   .env 파일의 NAVER_CLIENT_ID, NAVER_CLIENT_SECRET을 확인하세요.');
    return;
  }

  console.log('✅ 네이버 API 키 확인됨\n');

  // 블로그 검색 테스트
  try {
    console.log('📝 블로그 검색: "더희스페이스"');
    const blogResult = await naverAPI.searchBlog({
      query: '더희스페이스',
      display: 5,
      sort: 'date',
    });

    console.log(`   총 ${blogResult.total}건 검색됨\n`);

    blogResult.items.forEach((item, i) => {
      const title = NaverAPIService.stripHtml(item.title);
      const date = `${item.postdate.slice(0, 4)}-${item.postdate.slice(4, 6)}-${item.postdate.slice(6)}`;
      console.log(`   [${i + 1}] ${title}`);
      console.log(`       📅 ${date} | 👤 ${item.bloggername}\n`);
    });
  } catch (error) {
    console.error('❌ 블로그 검색 실패:', error);
  }

  console.log('─'.repeat(50));

  // 뉴스 검색 테스트
  try {
    console.log('📰 뉴스 검색: "AI 에이전트"');
    const newsResult = await naverAPI.searchNews({
      query: 'AI 에이전트',
      display: 3,
      sort: 'date',
    });

    console.log(`   총 ${newsResult.total}건 검색됨\n`);

    newsResult.items.forEach((item, i) => {
      const title = NaverAPIService.stripHtml(item.title);
      console.log(`   [${i + 1}] ${title}`);
      console.log(`       🔗 ${item.link}\n`);
    });
  } catch (error) {
    console.error('❌ 뉴스 검색 실패:', error);
  }

  console.log('─'.repeat(50));
  console.log('✅ 테스트 완료!');
}

testNaverAPI();
