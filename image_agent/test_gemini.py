"""Gemini API 테스트 스크립트"""
import os
os.environ["GOOGLE_API_KEY"] = "AIzaSyDMKBbyKN5-Kg-eC3-rlBkYReQ76khP5_o"

try:
    from google import genai
    print("[OK] google-genai 패키지 로드 성공")

    client = genai.Client(api_key=os.environ["GOOGLE_API_KEY"])

    response = client.models.generate_content(
        model="gemini-2.0-flash",
        contents="안녕하세요! 간단히 '테스트 성공'이라고 답해주세요."
    )
    print(f"[OK] Gemini API 응답: {response.text}")

except ImportError as e:
    print(f"[ERROR] 패키지 설치 필요: {e}")
    print("  pip install google-genai")
except Exception as e:
    print(f"[ERROR] 오류: {e}")
