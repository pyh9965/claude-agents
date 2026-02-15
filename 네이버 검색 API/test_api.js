const https = require('https');
const fs = require('fs');
const path = require('path');

// .env 파일 직접 읽기
const envPath = path.join(__dirname, '.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match) envVars[match[1].trim()] = match[2].trim();
});

const clientId = envVars.NAVER_CLIENT_ID;
const clientSecret = envVars.NAVER_CLIENT_SECRET;
const query = encodeURIComponent('더희스페이스');

const options = {
  hostname: 'openapi.naver.com',
  path: `/v1/search/blog?query=${query}&display=5&sort=date`,
  method: 'GET',
  headers: {
    'X-Naver-Client-Id': clientId,
    'X-Naver-Client-Secret': clientSecret
  }
};

console.log('🔍 네이버 블로그 검색 API 테스트');
console.log('📝 검색어: 더희스페이스');
console.log('─'.repeat(50));

const req = https.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    if (res.statusCode === 200) {
      const result = JSON.parse(data);
      console.log(`✅ API 호출 성공!`);
      console.log(`📊 총 검색 결과: ${result.total}건`);
      console.log('─'.repeat(50));

      result.items.forEach((item, i) => {
        const title = item.title.replace(/<[^>]*>/g, '');
        const date = item.postdate;
        const formatted = `${date.slice(0,4)}-${date.slice(4,6)}-${date.slice(6)}`;
        console.log(`\n[${i+1}] ${title}`);
        console.log(`    📅 ${formatted} | 👤 ${item.bloggername}`);
      });
    } else {
      console.log(`❌ API 오류: ${res.statusCode}`);
      console.log(data);
    }
  });
});

req.on('error', (e) => {
  console.error(`❌ 요청 실패: ${e.message}`);
});

req.end();
