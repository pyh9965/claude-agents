const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join('D:', 'AI프로그램제작', 'cheongyak-spsply', 'public', 'cheongyak.db');

try {
  const db = new Database(DB_PATH, { readonly: true });

  // 테이블 목록
  console.log('=== 테이블 목록 ===');
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
  tables.forEach(t => console.log(t.name));

  // 드파인 검색
  console.log('\n=== 드파인 연희 검색 ===');
  const results = db.prepare(`
    SELECT HOUSE_MANAGE_NO, PBLANC_NO, HOUSE_NM, TOT_SUPLY_HSHLDCO,
           RCRIT_PBLANC_DE, HSSPLY_ADRES, CNSTRCT_ENTRPS_NM
    FROM apt_detail
    WHERE HOUSE_NM LIKE '%드파인%' OR HOUSE_NM LIKE '%연희%'
    ORDER BY RCRIT_PBLANC_DE DESC
    LIMIT 5
  `).all();

  console.log(JSON.stringify(results, null, 2));

  if (results.length > 0) {
    const first = results[0];
    console.log('\n=== 모델(타입) 정보 ===');
    const models = db.prepare(`
      SELECT MODEL_NO, HOUSE_TY, SUPLY_AR, SUPLY_HSHLDCO, LTTOT_TOP_AMOUNT
      FROM apt_model
      WHERE HOUSE_MANAGE_NO = ?
    `).all(first.HOUSE_MANAGE_NO);
    console.log(JSON.stringify(models, null, 2));

    console.log('\n=== 경쟁률 정보 ===');
    const cmpet = db.prepare(`
      SELECT MODEL_NO, HOUSE_TY, REQ_CNT, CMPET_RATE
      FROM apt_cmpet
      WHERE HOUSE_MANAGE_NO = ?
    `).all(first.HOUSE_MANAGE_NO);
    console.log(JSON.stringify(cmpet, null, 2));
  }

  db.close();
} catch (e) {
  console.error('에러:', e.message);
}
