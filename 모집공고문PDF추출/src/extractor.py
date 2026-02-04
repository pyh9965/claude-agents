"""Gemini API를 사용한 PDF 분양가 추출"""
import os
import json
import hashlib
from pathlib import Path
from dotenv import load_dotenv
from google import genai
from google.genai import types

from .schemas import ApartmentData, HousingType, LayerPrice, PaymentSchedule
from .utils import get_logger, retry, setup_logging


# 환경변수 로드
load_dotenv()


def get_client() -> genai.Client:
    """Gemini API 클라이언트 생성"""
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise ValueError("GEMINI_API_KEY 환경변수가 설정되지 않았습니다.")
    return genai.Client(api_key=api_key)


@retry(max_attempts=3, delay=2.0, exceptions=(Exception,))
def upload_pdf(client: genai.Client, pdf_path: str) -> types.File:
    """PDF 파일을 Gemini API에 업로드

    Args:
        client: Gemini API 클라이언트
        pdf_path: PDF 파일 경로

    Returns:
        업로드된 파일 객체
    """
    logger = get_logger()
    path = Path(pdf_path)

    if not path.exists():
        raise FileNotFoundError(f"PDF 파일을 찾을 수 없습니다: {pdf_path}")

    logger.info(f"PDF 업로드 중: {path.name}")

    # ASCII 안전한 display name 생성 (한글 파일명 인코딩 문제 회피)
    file_hash = hashlib.md5(path.name.encode('utf-8')).hexdigest()[:8]
    display_name = f"pdf_{file_hash}.pdf"

    # 파일을 바이트로 읽어서 업로드
    with open(path, "rb") as f:
        uploaded_file = client.files.upload(
            file=f,
            config=types.UploadFileConfig(
                display_name=display_name,
                mime_type="application/pdf"
            )
        )

    logger.info(f"PDF 업로드 완료: {uploaded_file.name}")
    return uploaded_file


def extract_price_from_pdf(pdf_path: str) -> ApartmentData:
    """모집공고문 PDF에서 분양가 추출

    Args:
        pdf_path: PDF 파일 경로

    Returns:
        추출된 아파트 분양가 데이터
    """
    logger = get_logger()
    logger.info(f"분양가 추출 시작: {pdf_path}")

    client = get_client()

    # PDF 업로드
    uploaded_file = upload_pdf(client, pdf_path)

    # 추출 프롬프트
    extraction_prompt = """이 아파트 입주자모집공고문 PDF에서 다음 정보를 추출해주세요:

1. 단지명: 아파트 이름
2. 위치: 주소 또는 위치 정보
3. 총세대수: 전체 공급 세대수
4. 분양가: 주택형별 분양가 정보
   - 각 주택형에 대해:
     - 주택형 (예: 59A, 84B)
     - 전용면적 (m2)
     - 공급세대수
     - 층별 분양가 (층구분, 세대수, 대지비, 건축비, 분양가)
     - 최저가 (억 원 단위)
     - 최고가 (억 원 단위)
5. 납부일정: 계약금, 중도금, 잔금 비율

주의사항:
- 분양가는 원 단위로 추출 (예: 1,161,000,000)
- 최저가/최고가는 억 원 단위의 소수점으로 변환 (예: 11.61)
- 모든 숫자에서 쉼표 제거
- 정보가 없는 항목은 null 또는 빈 배열로 처리"""

    # Gemini API 호출 (Structured Output)
    logger.info("Gemini API로 분석 중...")

    response = client.models.generate_content(
        model="gemini-2.0-flash",
        contents=[
            types.Content(
                role="user",
                parts=[
                    types.Part.from_uri(
                        file_uri=uploaded_file.uri,
                        mime_type="application/pdf"
                    ),
                    types.Part.from_text(text=extraction_prompt)
                ]
            )
        ],
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
            response_schema=ApartmentData
        )
    )

    # 응답 파싱
    response_text = response.text
    logger.info("API 응답 수신 완료")

    try:
        data = json.loads(response_text)
        result = ApartmentData.model_validate(data)
        logger.info(f"추출 완료: {result.단지명}, {len(result.분양가)}개 주택형")
        return result
    except Exception as e:
        logger.error(f"응답 파싱 실패: {e}")
        logger.error(f"원본 응답: {response_text[:500]}...")
        raise ValueError(f"API 응답을 파싱할 수 없습니다: {e}")


if __name__ == "__main__":
    # 테스트 실행
    setup_logging()
    test_pdf = r"D:\AI프로그램제작\agent\모집공고문PDF추출\PDF\++260108_드파인 연희_입주자모집공고(최종).pdf"
    result = extract_price_from_pdf(test_pdf)
    print(result.model_dump_json(indent=2))
