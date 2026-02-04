const fs = require('fs');
const path = require('path');
const XLSX = require('./node_modules/xlsx');

const scratchpad = 'C:\\Users\\pyh99\\AppData\\Local\\Temp\\claude\\D--AI-------agent\\21d7fdb4-c093-4610-b155-aaca4be88a7e\\scratchpad';
const outputDir = 'D:\\AI프로그램제작\\agent\\네이버 검색 API';
const content = fs.readFileSync(path.join(scratchpad, 'raw_data.json'), 'utf8');

let allItems = [];
let buffer = '';

const lines = content.split('\n');
for (const line of lines) {
  buffer += line;
  try {
    const data = JSON.parse(buffer);
    if (data.items) allItems = allItems.concat(data.items);
    buffer = '';
  } catch(e) {}
}

// 중복 제거
const seen = new Set();
const unique = allItems.filter(item => {
  if (seen.has(item.link)) return false;
  seen.add(item.link);
  return true;
}).sort((a, b) => b.postdate.localeCompare(a.postdate));

console.log('총 ' + unique.length + '개 게시글 처리 중...');

// 엑셀 데이터 생성
const wsData = [
  ['번호', '날짜', '제목', '블로거', 'URL']
];

unique.forEach((item, i) => {
  const date = item.postdate;
  const formatted = date.slice(0,4) + '-' + date.slice(4,6) + '-' + date.slice(6);
  const title = item.title.replace(/<[^>]*>/g, '').replace(/&quot;/g, '"');
  const blogger = item.bloggername;
  const url = item.link.replace(/\\\//g, '/');

  wsData.push([i+1, formatted, title, blogger, url]);
});

const wb = XLSX.utils.book_new();
const ws = XLSX.utils.aoa_to_sheet(wsData);

// 컬럼 너비 설정
ws['!cols'] = [
  { wch: 6 },   // 번호
  { wch: 12 },  // 날짜
  { wch: 60 },  // 제목
  { wch: 25 },  // 블로거
  { wch: 50 }   // URL
];

XLSX.utils.book_append_sheet(wb, ws, '드파인연희 블로그');

const xlsxPath = path.join(outputDir, '드파인연희_블로그_목록.xlsx');
XLSX.writeFile(wb, xlsxPath);
console.log('✅ Excel 파일 저장 완료!');
console.log('📁 저장 위치: ' + xlsxPath);
