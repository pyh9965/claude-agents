/**
 * 분양 홈페이지 크롤링 서비스
 * 청약홈 DB의 HMPG_ADRES를 활용하여 추가 정보 수집
 */

import { getModelId } from '../utils/config.js';

/** 홈페이지에서 추출한 정보 */
export interface HomepageInfo {
  브랜드명: {
    한글: string;
    영문: string;
  };
  프로젝트설명: string;
  주요특징: string[];
  시공사정보: {
    시공사: string;
    대표자?: string;
    연락처?: string;
  };
  위치정보: {
    현장주소: string;
    모델하우스?: string;
    주변시설?: string[];
  };
  마케팅포인트: string[];
  크롤링일시: string;
  원본URL: string;
}

/**
 * 분양 홈페이지에서 정보 추출
 */
export async function crawlHomepage(url: string): Promise<HomepageInfo | null> {
  if (!url || !url.startsWith('http')) {
    console.log('유효하지 않은 홈페이지 URL:', url);
    return null;
  }

  try {
    // 홈페이지 HTML 가져오기
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'ko-KR,ko;q=0.9,en;q=0.8',
      },
    });

    if (!response.ok) {
      console.error(`홈페이지 접근 실패: ${response.status} ${response.statusText}`);
      return null;
    }

    const html = await response.text();

    // HTML에서 주요 텍스트 추출 (스크립트, 스타일 제거)
    const textContent = extractTextFromHtml(html);

    // Gemini를 사용하여 정보 추출
    const extractedInfo = await extractInfoWithAI(textContent, url);

    return extractedInfo;
  } catch (error) {
    console.error('홈페이지 크롤링 오류:', error);
    return null;
  }
}

/**
 * HTML에서 텍스트 추출
 */
function extractTextFromHtml(html: string): string {
  // 스크립트, 스타일 태그 제거
  let text = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<noscript[^>]*>[\s\S]*?<\/noscript>/gi, '');

  // HTML 태그 제거하고 텍스트만 추출
  text = text.replace(/<[^>]+>/g, ' ');

  // HTML 엔티티 디코딩
  text = text
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");

  // 여러 공백을 하나로
  text = text.replace(/\s+/g, ' ').trim();

  // 너무 길면 잘라내기 (토큰 제한)
  if (text.length > 15000) {
    text = text.substring(0, 15000) + '...';
  }

  return text;
}

/**
 * AI를 사용하여 텍스트에서 정보 추출
 */
async function extractInfoWithAI(text: string, url: string): Promise<HomepageInfo | null> {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    console.error('Gemini API 키가 설정되지 않았습니다.');
    return null;
  }

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${getModelId('haiku')}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `다음은 분양 아파트 홈페이지의 텍스트 내용입니다. 아래 정보를 JSON 형식으로 추출해주세요.

홈페이지 텍스트:
${text}

추출할 정보 (JSON 형식으로 응답):
{
  "브랜드명": {
    "한글": "한글 브랜드명",
    "영문": "영문 브랜드명 (정확한 표기)"
  },
  "프로젝트설명": "프로젝트/단지에 대한 설명 (1-2문장)",
  "주요특징": ["특징1", "특징2", "특징3"],
  "시공사정보": {
    "시공사": "시공사명",
    "대표자": "대표자명 (있는 경우)",
    "연락처": "연락처 (있는 경우)"
  },
  "위치정보": {
    "현장주소": "현장 주소",
    "모델하우스": "모델하우스 주소 (있는 경우)",
    "주변시설": ["주변시설1", "주변시설2"]
  },
  "마케팅포인트": ["포인트1", "포인트2", "포인트3"]
}

JSON만 응답해주세요. 정보가 없는 필드는 빈 문자열이나 빈 배열로 표시하세요.`
            }]
          }],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 2000,
          }
        })
      }
    );

    if (!response.ok) {
      console.error('AI 추출 실패:', response.status);
      return null;
    }

    const result = await response.json() as {
      candidates?: Array<{
        content?: {
          parts?: Array<{ text?: string }>;
        };
      }>;
    };
    const content = result.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!content) {
      console.error('AI 응답 없음');
      return null;
    }

    // JSON 파싱 (마크다운 코드블록 제거)
    const jsonStr = content
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();

    const parsed = JSON.parse(jsonStr);

    return {
      브랜드명: parsed.브랜드명 || { 한글: '', 영문: '' },
      프로젝트설명: parsed.프로젝트설명 || '',
      주요특징: parsed.주요특징 || [],
      시공사정보: parsed.시공사정보 || { 시공사: '' },
      위치정보: parsed.위치정보 || { 현장주소: '' },
      마케팅포인트: parsed.마케팅포인트 || [],
      크롤링일시: new Date().toISOString(),
      원본URL: url,
    };
  } catch (error) {
    console.error('AI 정보 추출 오류:', error);
    return null;
  }
}

/**
 * 청약홈 데이터와 홈페이지 정보 병합
 */
export function mergeWithHomepageInfo(
  cheongyakData: Record<string, unknown>,
  homepageInfo: HomepageInfo
): Record<string, unknown> {
  return {
    ...cheongyakData,
    홈페이지정보: {
      공식브랜드명: homepageInfo.브랜드명,
      프로젝트설명: homepageInfo.프로젝트설명,
      주요특징: homepageInfo.주요특징,
      마케팅포인트: homepageInfo.마케팅포인트,
      출처URL: homepageInfo.원본URL,
      크롤링일시: homepageInfo.크롤링일시,
    },
    // 기존 출처에 홈페이지 정보 추가
    출처: [
      ...(Array.isArray((cheongyakData as any).출처) ? (cheongyakData as any).출처 : []),
    ],
  };
}
