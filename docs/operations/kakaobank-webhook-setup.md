# KakaoBank Webhook 설정 가이드 (Automate + Cloudflare)

카카오뱅크 입금 알림을 Android **Automate** (LlamaLab, 무료)에서 자동으로 감지하여
RYE-K 수납 시스템으로 전송하는 설정 가이드입니다.

---

## 목차

1. [사전 조건](#1-사전-조건)
2. [Cloudflare Secret 등록](#2-cloudflare-secret-등록)
3. [Automate 알림 접근 권한](#3-automate-알림-접근-권한)
4. [Automate 플로우 생성](#4-automate-플로우-생성)
5. [테스트 방법](#5-테스트-방법)

---

## 1. 사전 조건

### 업무폰 (Android)

| 항목 | 내용 |
|------|------|
| 운영체제 | Android 8.0 이상 |
| 앱 | **Automate** by LlamaLab (Play 스토어, 완전 무료 · 광고 없음) |
| 카카오뱅크 앱 | 입금 알림 푸시 알림 활성화 필수 |

> **중요**: Automate 배터리 최적화 예외 설정 필요.
> Android 설정 → 배터리 → Automate → 최적화 안 함

### 서버 측

- Cloudflare Pages에 배포된 `rye-k` 프로젝트 ✓ (완료)
- `RYE_WEBHOOK_SECRET` Cloudflare Pages secret 등록 ✓ (완료)

---

## 2. Cloudflare Secret 등록

> 이미 완료된 경우 이 단계를 건너뜁니다.

`RYE_WEBHOOK_SECRET`은 **절대 wrangler.toml에 기록하지 않습니다.**

### 방법 A: wrangler CLI

```bash
# 강력한 랜덤 시크릿 생성
openssl rand -hex 32
# 출력 예: a3f8e2d1c9b7...  (이 값을 복사)

# Cloudflare Pages secret 등록
wrangler pages secret put RYE_WEBHOOK_SECRET --project-name rye-k
# 프롬프트에 위 시크릿 값 붙여넣기
```

### 방법 B: Cloudflare 대시보드

1. [dash.cloudflare.com](https://dash.cloudflare.com) 접속
2. **Pages** → **rye-k** → **Settings** → **Environment variables**
3. **Production** 아래 **+ Add** → Variable name: `RYE_WEBHOOK_SECRET`
4. 시크릿 값 입력 → **Encrypt** 선택 → **Save**
5. **Deployments** → 최신 배포 → **Retry deployment**

---

## 3. Automate 알림 접근 권한

Automate가 KakaoTalk 알림 내용을 읽으려면 **알림 접근 권한**이 필요합니다.

1. Automate 앱 실행 → 상단 메뉴 → **권한 요청** 또는:
2. Android **설정** → **앱** → **특별한 앱 접근** → **알림 접근 허용**
3. 목록에서 **Automate** 찾아 토글 **ON** → 확인

---

## 4. Automate 플로우 생성

Automate는 블록을 연결하는 시각적 플로우 방식입니다.
아래 블록들을 순서대로 추가하고 화살표로 연결합니다.

### 전체 플로우 구조

```
[Flow beginning]
      ↓
[Notification posted] ← KakaoTalk + "입금" 필터
      ↓ (text 변수로 알림 텍스트 전달)
[String matches] ← 정규식으로 이름/금액 추출
      ↓ (match[1]=이름, match[2]=금액)
[Variable set] ← 금액 쉼표 제거
      ↓
[HTTP request] ← POST to Cloudflare Worker
      ↓
[Toast show] ← 처리 결과 확인
      ↓
[Flow beginning]으로 루프
```

---

### 블록 1: Flow beginning

- **+ 추가** → **Flow beginning** 선택
- 설정 없음 — 플로우의 시작점

---

### 블록 2: Notification posted

- **+ 추가** → **Notification** → **Notification posted**

| 설정 항목 | 값 |
|-----------|-----|
| Application | `KakaoTalk` (앱 목록에서 선택) |
| Text | `입금` (contains — 이 텍스트가 포함된 알림만 처리) |
| Output variable `text` | `notif_text` (알림 본문이 저장될 변수명) |

> 카카오뱅크 입금 알림은 KakaoTalk 채널을 통해 옵니다.

---

### 블록 3: String matches (이름/금액 추출)

- **+ 추가** → **Text** → **String matches**

| 설정 항목 | 값 |
|-----------|-----|
| String | `{notif_text}` |
| Pattern (정규식) | `(\S+)\s+([\d,]+)원\s+입금` |
| Output matches | `match` (배열로 저장) |

추출 결과:
- `{match[1]}` → 입금자 이름 (예: `홍길동`)
- `{match[2]}` → 금액 문자열 (예: `150,000`)

---

### 블록 4: Variable set (쉼표 제거)

- **+ 추가** → **Variables** → **Variable set**

| 설정 항목 | 값 |
|-----------|-----|
| Variable | `amount_int` |
| Value | `{match[2]}` 에서 쉼표(`,`) 제거 |

> Value 입력 후 **Replace** 기능 사용:
> Find: `,` / Replace with: (빈 칸) / Input: `{match[2]}`

---

### 블록 5: HTTP request (핵심)

- **+ 추가** → **Web services** → **HTTP request**

| 설정 항목 | 값 |
|-----------|-----|
| URL | `https://rye-k.pages.dev/api/payments/kakaobank-webhook` |
| Method | `POST` |
| Content type | `application/json` |

**Headers** (항목 추가):

| 이름 | 값 |
|------|-----|
| `X-RYE-Secret` | `(Cloudflare에 등록한 시크릿 값)` |

**Body**:

```json
{"name":"{match[1]}","amount":{amount_int},"rawText":"{notif_text}","timestamp":{time}}
```

> `{time}` 은 Automate 내장 변수 — 현재 시각(밀리초)을 자동으로 반환합니다.

**Output variable** `response body` → `webhook_result` (선택사항)

---

### 블록 6: Toast show (결과 확인)

- **+ 추가** → **Dialogs & alerts** → **Toast show**

| 설정 항목 | 값 |
|-----------|-----|
| Message | `입금 처리: {match[1]} {amount_int}원` |
| Duration | Short |

---

### 블록 7: 루프 연결

Toast show 블록의 출력 화살표를 **블록 2 (Notification posted)** 로 연결합니다.
(다음 입금 알림을 계속 기다리는 루프 완성)

---

### 플로우 저장 및 실행

1. 우상단 **저장** 버튼
2. 플로우 목록으로 돌아가서 **▶ 실행** 버튼
3. 실행 중 상태 확인 — 상태바에 Automate 아이콘이 표시됨

---

### 지원되는 알림 형식

Worker는 아래 두 형태를 모두 파싱합니다:

```
홍길동 150,000원 입금
[카카오뱅크] 홍길동 150,000원 입금
```

---

## 5. 테스트 방법

### 5-1. 엔드포인트 테스트 (PowerShell)

**유효한 요청 → 200**

```powershell
$ts = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
Invoke-RestMethod -Method POST `
  -Uri "https://rye-k.pages.dev/api/payments/kakaobank-webhook" `
  -Headers @{ "Content-Type" = "application/json"; "X-RYE-Secret" = "YOUR_SECRET_HERE" } `
  -Body "{`"name`":`"홍길동`",`"amount`":150000,`"timestamp`":$ts}"
# 예상: { ok: true, matched: false/true, confidence: "..." }
```

**잘못된 시크릿 → 401**

```powershell
$ts = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
Invoke-RestMethod -Method POST `
  -Uri "https://rye-k.pages.dev/api/payments/kakaobank-webhook" `
  -Headers @{ "Content-Type" = "application/json"; "X-RYE-Secret" = "wrong" } `
  -Body "{`"name`":`"테스트`",`"amount`":1000,`"timestamp`":$ts}"
# 예상: {"error":"Unauthorized"}
```

**인증 없이 GET → 401**

```powershell
Invoke-RestMethod -Uri "https://rye-k.pages.dev/api/payments/kakaobank-webhook"
# 예상: {"error":"Unauthorized"}
```

### 5-2. 실제 입금 테스트

1. 업무폰에서 카카오뱅크 소액 (예: 100원) 입금 발생
2. KakaoTalk 알림 수신 확인
3. Automate Toast 알림: `입금 처리: {이름} {금액}원` 확인
4. RYE-K 앱 수납 화면 진입 → 자동 처리 또는 미매칭 탭에서 확인

---

## 문제 해결

| 증상 | 원인 | 해결 방법 |
|------|------|-----------|
| Automate가 알림을 인식 못함 | 알림 접근 권한 미부여 | 3번 단계 재확인 |
| Automate가 알림을 인식 못함 | 배터리 최적화 | 설정 → 배터리 → Automate → 최적화 안 함 |
| `{match[1]}` 이 비어 있음 | 알림 형식 불일치 | Automate 로그에서 실제 `{notif_text}` 값 확인 후 정규식 수정 |
| 401 오류 | X-RYE-Secret 불일치 | Cloudflare secret 값과 블록 5 헤더 값 일치 확인 |
| 400 오류 (timestamp) | 폰 시계 오차 | 설정 → 일반 → 날짜 및 시간 → 자동 설정 ON |
| 429 오류 | IP당 분당 10회 초과 | 테스트 속도 줄이기 (정상 동작) |
| 자동화 중단됨 | 앱 강제 종료 | Automate 시작 플로우를 부팅 시 자동 실행으로 설정 |
