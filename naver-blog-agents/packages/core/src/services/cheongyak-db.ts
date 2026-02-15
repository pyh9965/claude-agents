/**
 * 청약홈 데이터베이스 조회 서비스
 * cheongyak-spsply 프로젝트의 DB를 활용하여 분양 정보 조회
 */

import Database from 'better-sqlite3';
import { existsSync } from 'fs';
import { join } from 'path';

/** 청약홈 DB 경로 */
const CHEONGYAK_DB_PATH = join(
  'D:',
  'AI프로그램제작',
  'cheongyak-spsply',
  'public',
  'cheongyak.db'
);

/** 분양 상세 정보 */
export interface AptDetail {
  HOUSE_MANAGE_NO: string;
  PBLANC_NO: string;
  HOUSE_NM: string;
  TOT_SUPLY_HSHLDCO: number;
  RCRIT_PBLANC_DE: string;
  HSSPLY_ADRES: string;
  CNSTRCT_ENTRPS_NM: string;
  RCEPT_BGNDE?: string;
  RCEPT_ENDDE?: string;
  SPSPLY_RCEPT_BGNDE?: string;
  SPSPLY_RCEPT_ENDDE?: string;
  PRZWNER_PRESNATN_DE?: string;
  CNTRCT_CNCLS_BGNDE?: string;
  CNTRCT_CNCLS_ENDDE?: string;
  MVN_PREARNGE_YM?: string;
  SUBSCRPT_AREA_CODE_NM?: string;
  HMPG_ADRES?: string;      // 분양 홈페이지 주소
  PBLANC_URL?: string;      // 청약홈 공고 URL
}

/** 모델(타입) 정보 */
export interface AptModel {
  MODEL_NO: string;
  HOUSE_TY: string;
  SUPLY_AR: string;
  SUPLY_HSHLDCO: number;
  LTTOT_TOP_AMOUNT: string;
  SPSPLY_HSHLDCO?: number;
}

/** 경쟁률 정보 */
export interface AptCmpet {
  MODEL_NO: string;
  HOUSE_TY: string;
  REQ_CNT: string;
  CMPET_RATE: string;
  RESIDE_SENM?: string;
}

/** 특별공급 정보 */
export interface AptSpsply {
  HOUSE_TY: string;
  SPSPLY_HSHLDCO: number;
  MNYCH_HSHLDCO: number;
  NWWDS_NMTW_HSHLDCO: number;
  LFE_FRST_HSHLDCO: number;
  CRSPAREA_MNYCH_CNT: number;
  CRSPAREA_NWWDS_NMTW_CNT: number;
}

/** 청약홈 분양 데이터 (JSON 출력용) */
export interface CheongyakData {
  수집정보: {
    출처: string;
    수집일시: string;
    공고번호: string;
    주택관리번호: string;
  };
  기본정보: {
    아파트명: string;
    위치: string;
    시공사: string;
    총세대수: number;
    공급지역: string;
    입주예정: string;
  };
  청약일정: {
    모집공고일: string;
    특별공급접수: string;
    일반공급접수: string;
    당첨자발표: string;
    계약기간: string;
  };
  평형정보: Array<{
    타입: string;
    공급면적: string;
    공급세대수: number;
    특별공급세대수: number;
    분양최고가: string;
    분양최고가_억원: string;
  }>;
  경쟁률: Array<{
    타입: string;
    신청자수: number;
    경쟁률: string;
  }>;
  출처: Array<{
    출처명: string;
    URL: string;
  }>;
}

/**
 * 청약홈 DB 연결 확인
 */
export function isCheongyakDbAvailable(): boolean {
  return existsSync(CHEONGYAK_DB_PATH);
}

/**
 * 아파트명으로 분양 정보 검색
 */
export function searchAptByName(aptName: string): CheongyakData | null {
  if (!isCheongyakDbAvailable()) {
    console.error('청약홈 DB를 찾을 수 없습니다:', CHEONGYAK_DB_PATH);
    return null;
  }

  const db = new Database(CHEONGYAK_DB_PATH, { readonly: true });

  try {
    // 1. 기본 정보 조회
    const detail = db.prepare(`
      SELECT DISTINCT
        HOUSE_MANAGE_NO, PBLANC_NO, HOUSE_NM, TOT_SUPLY_HSHLDCO,
        RCRIT_PBLANC_DE, HSSPLY_ADRES, CNSTRCT_ENTRPS_NM,
        RCEPT_BGNDE, RCEPT_ENDDE, SPSPLY_RCEPT_BGNDE, SPSPLY_RCEPT_ENDDE,
        PRZWNER_PRESNATN_DE, CNTRCT_CNCLS_BGNDE, CNTRCT_CNCLS_ENDDE,
        MVN_PREARNGE_YM, SUBSCRPT_AREA_CODE_NM,
        HMPG_ADRES, PBLANC_URL
      FROM apt_detail
      WHERE HOUSE_NM LIKE ?
      ORDER BY RCRIT_PBLANC_DE DESC
      LIMIT 1
    `).get(`%${aptName}%`) as AptDetail | undefined;

    if (!detail) {
      console.log(`'${aptName}' 검색 결과가 없습니다.`);
      return null;
    }

    // 2. 모델(타입) 정보 조회
    const models = db.prepare(`
      SELECT DISTINCT MODEL_NO, HOUSE_TY, SUPLY_AR, SUPLY_HSHLDCO,
             SPSPLY_HSHLDCO, LTTOT_TOP_AMOUNT
      FROM apt_model
      WHERE HOUSE_MANAGE_NO = ?
      ORDER BY MODEL_NO
    `).all(detail.HOUSE_MANAGE_NO) as AptModel[];

    // 3. 경쟁률 정보 조회 (해당지역 1순위만)
    const cmpetAll = db.prepare(`
      SELECT MODEL_NO, HOUSE_TY, REQ_CNT, CMPET_RATE, RESIDE_SENM
      FROM apt_cmpet
      WHERE HOUSE_MANAGE_NO = ?
    `).all(detail.HOUSE_MANAGE_NO) as AptCmpet[];

    // 타입별 최고 경쟁률만 추출
    const cmpetMap = new Map<string, AptCmpet>();
    for (const c of cmpetAll) {
      const rate = parseFloat(c.CMPET_RATE) || 0;
      const existing = cmpetMap.get(c.HOUSE_TY);
      if (!existing || rate > (parseFloat(existing.CMPET_RATE) || 0)) {
        cmpetMap.set(c.HOUSE_TY, c);
      }
    }

    // 4. JSON 형식으로 변환
    const result: CheongyakData = {
      수집정보: {
        출처: '청약홈 (applyhome.co.kr)',
        수집일시: new Date().toISOString().split('T')[0],
        공고번호: detail.PBLANC_NO,
        주택관리번호: detail.HOUSE_MANAGE_NO,
      },
      기본정보: {
        아파트명: detail.HOUSE_NM,
        위치: detail.HSSPLY_ADRES,
        시공사: detail.CNSTRCT_ENTRPS_NM,
        총세대수: detail.TOT_SUPLY_HSHLDCO,
        공급지역: detail.SUBSCRPT_AREA_CODE_NM || '',
        입주예정: detail.MVN_PREARNGE_YM || '',
      },
      청약일정: {
        모집공고일: detail.RCRIT_PBLANC_DE,
        특별공급접수: detail.SPSPLY_RCEPT_BGNDE
          ? `${detail.SPSPLY_RCEPT_BGNDE} ~ ${detail.SPSPLY_RCEPT_ENDDE}`
          : '',
        일반공급접수: detail.RCEPT_BGNDE
          ? `${detail.RCEPT_BGNDE} ~ ${detail.RCEPT_ENDDE}`
          : '',
        당첨자발표: detail.PRZWNER_PRESNATN_DE || '',
        계약기간: detail.CNTRCT_CNCLS_BGNDE
          ? `${detail.CNTRCT_CNCLS_BGNDE} ~ ${detail.CNTRCT_CNCLS_ENDDE}`
          : '',
      },
      평형정보: models.map((m) => {
        const priceWon = parseInt(m.LTTOT_TOP_AMOUNT || '0', 10) * 10000;
        const priceEok = (priceWon / 100000000).toFixed(2);
        return {
          타입: m.HOUSE_TY,
          공급면적: `${m.SUPLY_AR}㎡`,
          공급세대수: m.SUPLY_HSHLDCO,
          특별공급세대수: m.SPSPLY_HSHLDCO || 0,
          분양최고가: `${parseInt(m.LTTOT_TOP_AMOUNT || '0', 10).toLocaleString()}만원`,
          분양최고가_억원: `${priceEok}억원`,
        };
      }),
      경쟁률: Array.from(cmpetMap.values())
        .filter((c) => parseFloat(c.CMPET_RATE) > 0)
        .map((c) => ({
          타입: c.HOUSE_TY,
          신청자수: parseInt(c.REQ_CNT, 10) || 0,
          경쟁률: `${c.CMPET_RATE}:1`,
        })),
      출처: [
        // 분양 홈페이지 (있는 경우)
        ...(detail.HMPG_ADRES ? [{
          출처명: '분양 홈페이지',
          URL: detail.HMPG_ADRES,
        }] : []),
        // 청약홈 공고 페이지 (있는 경우)
        ...(detail.PBLANC_URL ? [{
          출처명: '청약홈 공고',
          URL: detail.PBLANC_URL,
        }] : [{
          출처명: '청약홈',
          URL: 'https://www.applyhome.co.kr',
        }]),
        {
          출처명: '공공데이터포털',
          URL: 'https://www.data.go.kr/data/15098547/openapi.do',
        },
      ],
    };

    return result;
  } finally {
    db.close();
  }
}

/**
 * 최근 분양 목록 조회
 */
export function getRecentAptList(limit: number = 10): AptDetail[] {
  if (!isCheongyakDbAvailable()) {
    return [];
  }

  const db = new Database(CHEONGYAK_DB_PATH, { readonly: true });

  try {
    const results = db.prepare(`
      SELECT DISTINCT HOUSE_MANAGE_NO, PBLANC_NO, HOUSE_NM,
             TOT_SUPLY_HSHLDCO, RCRIT_PBLANC_DE, HSSPLY_ADRES, CNSTRCT_ENTRPS_NM
      FROM apt_detail
      ORDER BY RCRIT_PBLANC_DE DESC
      LIMIT ?
    `).all(limit) as AptDetail[];

    return results;
  } finally {
    db.close();
  }
}
