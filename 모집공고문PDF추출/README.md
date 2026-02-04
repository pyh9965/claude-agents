# 아파트 모집공고문 PDF 분양가 추출기

청약홈에서 다운로드한 아파트 입주자모집공고문 PDF에서 분양가 데이터를 자동 추출하는 Python CLI 도구

## 설치

```bash
pip install -r requirements.txt
```

## 사용법

```bash
python extract_price.py --input 모집공고문.pdf --output ./results/
```

## 기능

- Google Gemini API로 PDF 분석
- Pydantic으로 데이터 검증
- JSON/CSV/MD 형식으로 결과 저장

## 환경 설정

.env 파일에 GEMINI_API_KEY 설정 필요

```
GEMINI_API_KEY=your_api_key_here
```
