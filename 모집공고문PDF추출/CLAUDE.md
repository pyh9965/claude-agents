\# 아파트 모집공고문 PDF 분양가 추출기 개발



\## 목표

청약홈에서 다운로드한 아파트 입주자모집공고문 PDF에서 분양가 데이터를 자동 추출하는 Python 도구 개발



\## 기술 스택

\- Python 3.11+

\- Google Gemini API (gemini-2.0-flash) - PDF 분석용

\- Pydantic - 데이터 검증 및 스키마 정의

\- pandas - 데이터 처리



\## 핵심 기능



\### 1. PDF 업로드 및 분석

\- Google Gemini API의 Files API로 PDF 업로드

\- Structured Output으로 JSON 형식 강제



\### 2. 추출할 데이터 스키마

```python

{

&nbsp; "단지명": str,

&nbsp; "위치": str,

&nbsp; "총세대수": int,

&nbsp; "분양가": \[

&nbsp;   {

&nbsp;     "주택형": "59A",

&nbsp;     "전용면적\_m2": 59.86,

&nbsp;     "공급세대수": 97,

&nbsp;     "층별\_분양가": \[

&nbsp;       {

&nbsp;         "층구분": "2층",

&nbsp;         "세대수": 6,

&nbsp;         "대지비": 441180000,

&nbsp;         "건축비": 719820000,

&nbsp;         "분양가\_원": 1161000000

&nbsp;       }

&nbsp;     ],

&nbsp;     "최저가\_억": 11.61,

&nbsp;     "최고가\_억": 12.43

&nbsp;   }

&nbsp; ],

&nbsp; "납부일정": {

&nbsp;   "계약금": "10%",

&nbsp;   "중도금": "60%",

&nbsp;   "잔금": "30%"

&nbsp; }

}

```



\### 3. 출력 형식

\- JSON 파일 (상세 데이터)

\- CSV 파일 (주택형별 요약)

\- 마크다운 리포트 (분석 결과)



\## 구현 요구사항



1\. \*\*환경 설정\*\*

&nbsp;  - .env 파일에서 GEMINI\_API\_KEY 로드

&nbsp;  - google-genai 라이브러리 사용



2\. \*\*메인 함수\*\*

```python

def extract\_price\_from\_pdf(pdf\_path: str) -> dict:

&nbsp;   """모집공고문 PDF에서 분양가 추출"""

&nbsp;   pass



def save\_results(data: dict, output\_dir: str):

&nbsp;   """결과를 JSON, CSV, MD로 저장"""

&nbsp;   pass

```



3\. \*\*CLI 인터페이스\*\*

```bash

python extract\_price.py --input 모집공고문.pdf --output ./results/

```



4\. \*\*에러 처리\*\*

&nbsp;  - PDF 업로드 실패 시 재시도

&nbsp;  - API 응답 검증

&nbsp;  - 추출 실패 항목 로깅



\## 테스트 파일

\- /mnt/user-data/uploads/\_\_260108\_드파인\_연희\_입주자모집공고\_최종\_.pdf



\## 프로젝트 구조

```

price-extractor/

├── src/

│   ├── \_\_init\_\_.py

│   ├── extractor.py      # Gemini API 호출

│   ├── schemas.py        # Pydantic 스키마

│   └── utils.py          # 유틸리티

├── tests/

│   └── test\_extractor.py

├── .env.example

├── requirements.txt

└── README.md

```



\## 시작하기

1\. 먼저 프로젝트 폴더 구조 생성

2\. requirements.txt 작성 (google-genai, pydantic, pandas, python-dotenv)

3\. Pydantic 스키마 정의

4\. Gemini API 연동 코드 작성

5\. 테스트 PDF로 검증

6\. CLI 인터페이스 추가

```



---



\## 📋 더 간단한 버전 (한 줄 요약)



Claude Code에 이렇게만 말해도 돼:

```

아파트 모집공고문 PDF에서 분양가를 추출하는 Python 도구 만들어줘.

Google Gemini API로 PDF를 분석하고, Pydantic으로 스키마 검증해서

JSON/CSV로 저장하는 CLI 도구로 만들어줘.

테스트 파일은 /mnt/user-data/uploads/ 에 있어.

```



---



\## 🔑 사전 준비



Claude Code에서 작업하기 전에 필요한 것:



| 항목 | 얻는 방법 |

|------|-----------|

| \*\*Gemini API Key\*\* | \[Google AI Studio](https://aistudio.google.com/apikey)에서 무료 발급 |

| \*\*테스트 PDF\*\* | 청약홈에서 모집공고문 다운로드 |



---



\## 💡 추가 팁



Claude Code에서 작업할 때 이런 식으로 단계별로 요청하면 더 좋아:

```

1단계: "프로젝트 구조랑 requirements.txt 먼저 만들어줘"

2단계: "Pydantic 스키마부터 정의해줘"  

3단계: "Gemini API 연동 코드 작성해줘"

4단계: "테스트 PDF로 실행해서 결과 확인해줘"

5단계: "CLI 인터페이스 추가해줘"







구글 제미나이 API-KEY

AIzaSyDMKBbyKN5-Kg-eC3-rlBkYReQ76khP5\_o



API-KEY는 니가 사용하고 여기 문서에서는 삭제해서 보안유지해!!!

