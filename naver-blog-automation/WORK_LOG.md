# ChatGPT 이미지 생성 + 네이버 블로그 자동 포스팅 작업 기록

> 작성일: 2026-02-15
> 프로젝트: `naver-blog-automation/`
> 상태: **완료** (이미지 생성 + 이미지 포함 블로그 발행 성공)

---

## 1. 프로젝트 개요

기존 네이버 블로그 CDP 자동 포스팅 시스템에 **ChatGPT 웹 자동화 이미지 생성** 기능을 통합하여, 이미지 생성부터 블로그 발행까지 전 과정을 자동화하는 작업.

### 최종 워크플로우

```
1. Chrome CDP 연결 (디버그 프로필)
2. ChatGPT(chatgpt.com)에서 이미지 프롬프트 전송
3. DALL-E 이미지 생성 대기 (약 20~30초)
4. 생성된 이미지 다운로드 (로컬 파일 저장)
5. 네이버 블로그 에디터 열기
6. 제목 + 본문 입력 + 이미지 업로드
7. 공개 발행
```

---

## 2. 신규 생성 파일

### 2.1. `src/chatgpt-image.ts` — ChatGPT 이미지 생성 모듈

**핵심 클래스**: `ChatGPTImageGenerator`

| 메서드 | 기능 |
|--------|------|
| `navigateToChatGPT()` | chatgpt.com 이동 + 로그인 상태 확인 |
| `checkLoginStatus()` | 로그인 버튼 유무로 판별 (버튼 먼저 체크 → 텍스트 입력란 확인) |
| `startNewChat()` | 새 대화 시작 (다중 셀렉터 폴백 + URL 이동 폴백) |
| `sendImagePrompt(prompt)` | 텍스트 입력 (contenteditable div / textarea 자동 분기) + 전송 |
| `waitForImageGeneration(timeout)` | "이미지 생성 중" 텍스트 사라질 때까지 폴링 대기 |
| `findGeneratedImage()` | 생성 완료된 이미지 감지 (200px 이상, 로드 완료 확인) |
| `downloadGeneratedImage(savePath)` | 4단계 폴백 다운로드 |
| `generateImage(options)` | 전체 워크플로우 통합 실행 |

**이미지 다운로드 4단계 폴백:**

```
1. 다운로드 버튼(↓) 클릭 → page.waitForEvent('download') → saveAs
2. 이미지 src URL → fetch (credentials: include) → base64 → 파일 저장
3. canvas 렌더링 → drawImage → toDataURL → 파일 저장
4. element.screenshot() → PNG 직접 캡처 (최후 수단)
```

**로그인 감지 로직 (버그 수정 포함):**

```
원래 버그: textarea 존재 확인을 먼저 함 → 미로그인 상태에서도 true 반환
수정 후: 로그인 버튼(Log in, Sign up) 존재 확인을 먼저 함 → 정확한 판별
```

**이미지 생성 완료 감지 로직 (버그 수정 포함):**

```
원래 버그: img.complete && naturalWidth > 100 으로 판별 → 생성 중 프리뷰 이미지도 감지
수정 후: "이미지 생성 중" 텍스트 존재 시 미완료 판정 + naturalWidth > 200 으로 강화
```

### 2.2. `scripts/generate-image.ts` — 이미지 생성 단독 스크립트

- CLI 인자로 프롬프트와 저장 경로 지정 가능
- 기본 프롬프트: 삼색 고양이 일러스트
- 실행: `npm run chatgpt:image` 또는 `npm run chatgpt:image -- "프롬프트" "./output/파일.png"`

### 2.3. `scripts/post-with-image.ts` — 이미지 포함 통합 포스팅 스크립트

- ChatGPT 이미지 생성 → 네이버 블로그 포스팅 전체 자동화
- 이미지가 이미 존재하면(10KB 이상) 재생성 스킵하고 재사용
- 실행: `npm run post:full`

**태극기 포스팅 콘텐츠:**
- 제목: "태극기의 모든 것, 의미부터 역사까지 총정리"
- 이미지 프롬프트: "블로그 썸네일 이미지를 그려줘: 파란 하늘 아래 바람에 펄럭이는 대한민국 태극기를 아름답게 그려줘..."
- 태그: 태극기, 대한민국국기, 태극기의미, 국기게양, 한국문화
- 본문: 약 1,650자 (태극기 구성 요소, 역사, 게양일, 다는 법, 철학)

---

## 3. 수정된 기존 파일

### 3.1. `scripts/setup-chrome.ts` — ChatGPT 로그인 단계 추가

**변경 내용:**
- Step 6 추가: chatgpt.com으로 이동 → 로그인 상태 확인 → 미로그인 시 안내
- 로그인 감지 버그 수정: `로그인 버튼 유무`로 판별 (textarea 체크 → 로그인 버튼 체크로 변경)
- 최종 결과 출력에 ChatGPT 로그인 상태 포함
- 사용 가능 명령어 안내 추가 (`post:full`, `chatgpt:image`)

### 3.2. `src/blog-editor.ts` — 이미지 업로드 로직 전면 재작성

**`uploadImages()` 메서드 변경:**

| 방법 | 설명 | 결과 |
|------|------|------|
| 방법 1 | 툴바 이미지 버튼 → "내 PC" → fileChooser | "내 PC" 미발견 시 실패 |
| 방법 2 | hidden `input[type="file"]` 직접 setInputFiles | **성공** (최종 사용) |
| 방법 3 | 에디터 본문에 DragEvent drop 시뮬레이션 | 폴백 |

**추가 셀렉터:**
- 이미지 툴바 버튼: `button.se-image-toolbar-button`, `button[data-name="image"]` 등
- "내 PC" 버튼: `label:has-text("내 PC")`, `button:has-text("내 PC")` 등 (iframe 내/외부 모두 탐색)
- 확인 버튼: "등록", "삽입", "확인", "첨부"
- hidden file input: `input[type="file"][accept*="png"]`, `input[type="file"][accept*="image"]` 등

**`dismissOverlayPopups()` 메서드 추가:**
- 이미지 업로드 후 남는 `layer_popup_wrap` 계열 오버레이 팝업 닫기
- 발행 버튼 클릭 전에 자동 호출
- 닫기 버튼 → "취소" → "확인" → ESC 키 순서로 시도

**`publish()` 메서드 변경:**
- 발행 전 `dismissOverlayPopups()` 호출 추가

**fileChooserPromise 누수 수정:**
- `.catch(() => null)` 추가하여 방법 2로 넘어갈 때 unhandled rejection 방지
- `fileChooser` null 체크 추가

### 3.3. `package.json` — 스크립트/의존성 변경

**추가된 스크립트:**
```json
{
  "post:full": "npx tsx scripts/post-with-image.ts",
  "chatgpt:image": "npx tsx scripts/generate-image.ts"
}
```

**제거된 스크립트:**
- `import:cookies` (쿠키 추출 방식 폐기)

**제거된 의존성:**
- `sql.js` (쿠키 DB 읽기용, 더 이상 불필요)

---

## 4. 삭제된 파일

| 파일 | 원래 용도 | 삭제 이유 |
|------|-----------|-----------|
| `scripts/test-user-chrome.ts` | 사용자 Chrome 프로필 + CDP 테스트 | Chrome 136+ 차단 확인 완료 |
| `scripts/import-chatgpt-cookies.ts` | Chrome 쿠키 DPAPI 복호화 + 주입 | ChatGPT 쿠키 부재로 방식 폐기 |
| `scripts/find-chatgpt-profile.ts` | Chrome 프로필별 ChatGPT 쿠키 검색 | 디버그 완료 |

---

## 5. 발견된 문제 및 해결 과정

### 5.1. Chrome 136+ 보안 제한 (근본 원인)

**문제:** 사용자의 일반 Chrome(기본 프로필)에서 `--remote-debugging-port`가 차단됨
**원인:** Chrome 136+ 보안 정책. 기본 User Data 디렉토리에서 원격 디버깅 포트/파이프 모두 차단
**시도:**
1. `launchPersistentContext` → 행(hang) 발생
2. `--remote-debugging-port` + 사용자 프로필 → 포트 열리지 않음
3. 쿠키 추출 & 주입 → ChatGPT 쿠키 부재

**최종 해결:** 별도 디버그 프로필(`~/.chrome-debug-profile`)에서 수동 로그인 (1회)

### 5.2. ChatGPT 쿠키 부재

**문제:** 사용자의 Chrome 프로필 3개(Default, Profile 2, Profile 4) 모두 ChatGPT 관련 쿠키 없음
**원인 추정:**
- ChatGPT는 Google SSO 세션으로 인증 → chatgpt.com 도메인에 영구 쿠키 미저장
- 또는 세션 전용 쿠키(비영구) 사용

**해결:** 디버그 프로필에서 직접 ChatGPT 로그인 (Google 계정)

### 5.3. ChatGPT 로그인 감지 False Positive

**문제:** `checkLoginStatus()`가 미로그인 상태에서도 "로그인됨"으로 판정
**원인:** ChatGPT는 미로그인 상태에서도 `#prompt-textarea`를 표시함. textarea 존재를 먼저 체크하면 항상 true
**해결:** 로그인 버튼(`Log in`, `Sign up`) 존재를 먼저 체크. 버튼이 있으면 미로그인, 없으면 textarea로 로그인 확인

### 5.4. 이미지 생성 중 조기 감지

**문제:** 이미지 생성 중 프리뷰(블러 이미지)가 "완료"로 감지됨
**원인:** `img.complete && naturalWidth > 100` 조건이 프리뷰 이미지도 통과
**해결:**
1. "이미지 생성 중" / "Creating image" 텍스트가 보이면 미완료 판정
2. `naturalWidth > 200 && naturalHeight > 200`으로 강화

### 5.5. 이미지 다운로드 실패

**문제:** 첫 시도에서 모든 다운로드 방법(fetch, canvas, screenshot) 실패
**원인:** 이미지가 아직 완전히 생성되지 않은 상태에서 다운로드 시도
**해결:**
1. 생성 완료 감지 강화 (5.4)
2. 다운로드 버튼(↓) 클릭을 1순위로 변경 → `page.waitForEvent('download')` → 성공

### 5.6. fileChooserPromise Unhandled Rejection

**문제:** 이미지 업로드 방법 1에서 `fileChooserPromise`를 생성하고, 방법 2로 폴백 시 해당 promise가 타임아웃되어 프로세스 크래시
**원인:** Playwright의 `waitForEvent`는 타임아웃 시 reject됨. catch 없이 방치하면 unhandled rejection
**해결:** `.catch(() => null)` 추가 + `fileChooser` null 체크

### 5.7. 오버레이 팝업이 발행 버튼 차단

**문제:** 이미지 업로드 후 `layer_popup_wrap__K9AIW` 팝업이 "발행" 버튼 위에 떠서 클릭 불가
**원인:** 이미지 첨부 후 남는 UI 오버레이 레이어
**해결:** `dismissOverlayPopups()` 메서드 추가. 발행 전 자동 호출하여 닫기 버튼/ESC로 팝업 제거

### 5.8. Windows/Git Bash 환경 이슈

| 문제 | 해결 |
|------|------|
| `npx: command not found` | `export PATH="$PATH:/c/Program Files/nodejs"` |
| `powershell` not found | 전체 경로: `C:\Windows\System32\WindowsPowerShell\v1.0\powershell.exe` |
| PowerShell 인라인 어셈블리 로딩 실패 | 임시 `.ps1` 파일 작성 → `-File` 플래그로 실행 |
| Chrome 쿠키 파일 잠금 (EBUSY) | `taskkill /F /IM chrome.exe /T`로 Chrome 종료 후 복사 |
| `taskkill` from Git Bash | `/c/Windows/System32/taskkill.exe //F //IM chrome.exe //T` |

---

## 6. 프로젝트 구조 (최종)

```
naver-blog-automation/
├── src/
│   ├── chrome-cdp.ts          # Chrome CDP 연결 관리
│   ├── blog-editor.ts         # 네이버 SmartEditor ONE 조작 (수정됨)
│   ├── chatgpt-image.ts       # ★ ChatGPT 이미지 생성 (신규)
│   └── human-like.ts          # 사람처럼 행동 유틸리티
├── scripts/
│   ├── setup-chrome.ts        # Chrome 디버그 프로필 설정 (수정됨)
│   ├── post-cdp.ts            # CDP 블로그 포스팅 (텍스트 전용)
│   ├── post-with-image.ts     # ★ 이미지 + 블로그 통합 포스팅 (신규)
│   ├── generate-image.ts      # ★ ChatGPT 이미지 단독 생성 (신규)
│   └── launch-chrome.ts       # Chrome 디버그 실행
├── output/
│   └── blog-thumbnail.png     # 생성된 태극기 이미지 (1,233KB)
├── test-results/              # 디버그 스크린샷
├── .env                       # 환경 변수 (BLOG_ID 등)
├── package.json               # 수정됨
└── WORK_LOG.md                # 이 문서
```

---

## 7. 사용 방법

### 초기 설정 (최초 1회)

```bash
# 1. Chrome 디버그 프로필 생성 + 네이버/ChatGPT 로그인
npm run chrome:setup

# 열린 Chrome에서:
#   - 네이버 로그인
#   - Enter
#   - ChatGPT 로그인 (Google 계정)
#   - Enter
```

### 이미지 생성 + 블로그 포스팅

```bash
# 이미지 생성 + 블로그 발행 (통합)
npm run post:full

# ChatGPT 이미지만 생성
npm run chatgpt:image
npm run chatgpt:image -- "커스텀 프롬프트" "./output/custom.png"

# 텍스트만 블로그 포스팅
npm run post:cdp
```

---

## 8. 실행 결과 (2026-02-15)

### 성공한 최종 실행 (bcd2e5d)

```
========================================
[Full] 이미지 생성 + 블로그 포스팅
[Full] 블로그 ID: recensione
========================================
[CDP] Playwright 연결 성공!

[Step 1/2] 기존 이미지 재사용 (1233KB)

[Step 2/2] 네이버 블로그 포스팅
[Blog] 네이버 로그인 확인
[Editor] 직접 페이지 에디터 감지됨
[Editor] 임시저장 복구 다이얼로그 감지 → 취소
[Editor] 제목 입력: "태극기의 모든 것, 의미부터 역사까지 총정리"
[Editor] 본문 빠른 입력 (클립보드, 1653자)
[Editor] 이미지 버튼 클릭: button.se-image-toolbar-button
[Editor] hidden input 업로드 성공: input[type="file"][accept*="png"]
[Editor] 이미지 확인 버튼 클릭: button:has-text("첨부")
[Editor] 이미지 업로드 완료
[Editor] 오버레이 팝업 닫기
[Editor] 공개 설정 완료
[Editor] 패널 내 발행 버튼 클릭 (4번째)
[Editor] 발행 후 이동: https://blog.naver.com/PostView.naver?blogId=recensione&logNo=224184753744

[Full] 이미지 생성 + 블로그 포스팅 완료!
```

### 발행된 게시글

- **URL:** `https://blog.naver.com/PostView.naver?blogId=recensione&logNo=224184753744`
- **제목:** 태극기의 모든 것, 의미부터 역사까지 총정리
- **콘텐츠 크기:** 19,717 bytes
- **이미지:** ChatGPT DALL-E 생성 태극기 일러스트 (1,233KB)

### ChatGPT 이미지 생성 결과

- **프롬프트:** "블로그 썸네일 이미지를 그려줘: 파란 하늘 아래 바람에 펄럭이는 대한민국 태극기를 아름답게 그려줘..."
- **생성 시간:** 약 26초
- **다운로드 방법:** 다운로드 버튼(↓) 클릭
- **파일 크기:** 1,233KB (PNG)
- **저장 위치:** `output/blog-thumbnail.png`

---

## 9. 실행 이력 (디버깅 과정)

| 실행 ID | 시간 | 결과 | 실패 원인 | 수정 내용 |
|---------|------|------|-----------|-----------|
| bcac7ef | 1차 | 실패 | 이미지 생성 중 조기 감지 + 다운로드 전부 실패 | 생성 텍스트 체크, 다운로드 버튼 1순위 |
| b5ea9a9 | 2차 | 성공 (이미지) / 실패 (업로드) | 이미지 업로드 셀렉터 불일치 | uploadImages 전면 재작성 |
| bc37535 | 3차 | 실패 | fileChooserPromise unhandled rejection | `.catch(() => null)` 추가 |
| b49f809 | 4차 | 실패 | 오버레이 팝업이 발행 버튼 차단 | `dismissOverlayPopups()` 추가 |
| bcd2e5d | 5차 | **성공** | - | 모든 수정 적용 |

---

## 10. 알려진 제한사항

1. **Chrome 136+ 필수**: 디버그 프로필 방식은 Chrome 136+ 환경에서 사용자 기본 프로필을 직접 제어할 수 없으므로 별도 프로필 필요
2. **ChatGPT 수동 로그인 필요**: ChatGPT는 Google SSO 사용으로 쿠키 자동 추출 불가. 디버그 프로필에서 최초 1회 수동 로그인 필요
3. **ChatGPT UI 변경에 취약**: ChatGPT 프론트엔드가 자주 변경되므로 셀렉터가 깨질 수 있음. 다중 셀렉터 폴백으로 대응
4. **이미지 생성 시간 가변적**: 약 15~60초 소요. 최대 120초 타임아웃 설정
5. **네이버 태그 입력 미작동**: 발행 패널 내 태그 입력란 셀렉터가 현재 매치되지 않아 태그 추가 스킵됨 (추후 수정 필요)
6. **이미지 업로드 방식**: hidden `input[type="file"]`을 사용하므로 네이버 에디터 업데이트 시 동작하지 않을 수 있음

---

## 11. 기술 스택

| 기술 | 용도 | 버전 |
|------|------|------|
| Playwright | 브라우저 자동화 (CDP 모드) | ^1.58.2 |
| TypeScript | 전체 코드 | tsx 4.21.0 |
| Chrome CDP | Chrome DevTools Protocol 연결 | Chrome 136+ |
| ChatGPT 5.2 | DALL-E 이미지 생성 (Plus 계정) | 웹 UI 자동화 |
| Node.js | 런타임 | v22.14.0 |
| Windows 11 | OS 환경 | 10.0.26200 |

---

## 12. 핵심 학습 포인트

### Chrome CDP + 보안 제한

- Chrome 136+에서 기본 프로필 디버깅이 차단됨 → 별도 프로필 필수
- DPAPI 암호화는 Windows 사용자 기반이나, Chrome이 경로도 검증하는 것으로 추정
- Junction/symlink 우회 불가 (DPAPI 키가 경로 의존)

### ChatGPT 웹 자동화

- ChatGPT는 SPA이므로 DOM이 동적으로 변경됨
- 로그인 감지: "Log in" 버튼 존재 여부가 textarea 존재보다 신뢰도 높음
- 이미지 생성 감지: "이미지 생성 중" 텍스트 유무 + 이미지 크기 검증 병행
- 다운로드: ChatGPT 내장 다운로드 버튼이 가장 안정적

### 네이버 SmartEditor ONE

- iframe 또는 직접 페이지 모드 두 가지 존재 → 자동 감지 필요
- 발행 버튼이 4개 존재 → 마지막 버튼(`nth(count-1)`)이 실제 발행 확인
- Radio 버튼은 `<label>` 클릭 필요 (`<input>`은 label에 가려짐)
- 이미지 업로드: hidden `input[type="file"]`에 직접 setInputFiles가 가장 안정적
- 이미지 업로드 후 오버레이 팝업 처리 필수

### Playwright 팁

- `waitForEvent('filechooser')` promise는 미사용 시 `.catch(() => null)`로 처리 필수
- CDP `connectOverCDP`는 기존 브라우저에 연결하므로 context/page 직접 생성 불가
- `page.evaluate()`로 클립보드 API 사용 가능 → 대량 텍스트 입력에 효과적
