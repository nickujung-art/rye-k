# KakaoBank Webhook 설정 가이드 (MacroDroid + Cloudflare)

카카오뱅크 입금 알림을 Android **MacroDroid** (무료)에서 자동으로 감지하여
RYE-K 수납 시스템으로 전송하는 설정 가이드입니다.

---

## 목차

1. [사전 조건](#1-사전-조건)
2. [Cloudflare Secret 등록](#2-cloudflare-secret-등록)
3. [MacroDroid 알림 접근 권한](#3-macrodroid-알림-접근-권한)
4. [MacroDroid 매크로 생성](#4-macrodroid-매크로-생성)
5. [테스트 방법](#5-테스트-방법)

---

## 1. 사전 조건

### 업무폰 (Android)

| 항목 | 내용 |
|------|------|
| 운영체제 | Android 8.0 이상 |
| 앱 | **MacroDroid** (Play 스토어, 무료) |
| 카카오뱅크 앱 | 입금 알림 푸시 알림 활성화 필수 |

> **중요**: MacroDroid 배터리 최적화 예외 설정 필요.
> Android 설정 → 배터리 → MacroDroid → 최적화 안 함

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

## 3. MacroDroid 알림 접근 권한

MacroDroid가 KakaoTalk 알림 내용을 읽으려면 **알림 접근 권한**이 필요합니다.

1. Android **설정** → **앱** → **특별한 앱 접근** (또는 검색: "알림 접근")
2. **알림 접근 허용** 목록에서 **MacroDroid** 찾기
3. 토글 **ON** → 확인 팝업에서 허용

---

## 4. MacroDroid 매크로 생성

### 4-1. 새 매크로 시작

1. MacroDroid 앱 실행 → 하단 **+ 매크로 추가**
2. 매크로 이름 입력: `카카오뱅크 입금 처리`

---

### 4-2. 트리거 설정

**트리거 추가** → **알림** → **알림 수신됨**

| 설정 항목 | 값 |
|-----------|-----|
| 앱 | KakaoTalk |
| 알림 텍스트 필터 | `입금` 포함 (Contains) |
| 취소 알림 | OFF |

> 카카오뱅크 입금 알림은 KakaoTalk 채널을 통해 옵니다.

---

### 4-3. 액션 설정 (총 5개)

액션을 순서대로 추가합니다.

---

**액션 1 — 발신자 이름 추출**

**액션 추가** → **변수** → **변수 설정**

| 항목 | 값 |
|------|-----|
| 변수 유형 | 문자열 (로컬) |
| 변수 이름 | `sender_name` |
| 값 | **정규식 추출** 선택 |
| 입력 텍스트 | `[알림 텍스트]` (트리거 변수 선택) |
| 정규식 패턴 | `(\S+)\s+[\d,]+원\s+입금` |
| 그룹 | `1` |

---

**액션 2 — 금액 문자열 추출**

**액션 추가** → **변수** → **변수 설정**

| 항목 | 값 |
|------|-----|
| 변수 유형 | 문자열 (로컬) |
| 변수 이름 | `amount_raw` |
| 값 | **정규식 추출** 선택 |
| 입력 텍스트 | `[알림 텍스트]` |
| 정규식 패턴 | `\S+\s+([\d,]+)원\s+입금` |
| 그룹 | `1` |

---

**액션 3 — 쉼표 제거 (숫자 정리)**

**액션 추가** → **변수** → **변수 설정**

| 항목 | 값 |
|------|-----|
| 변수 유형 | 정수 (로컬) |
| 변수 이름 | `amount_int` |
| 값 | `[amount_raw]` (쉼표 자동 제거됨 — 정수 파싱) |

---

**액션 4 — HTTP POST (핵심)**

**액션 추가** → **연결** → **HTTP 요청**

| 항목 | 값 |
|------|-----|
| URL | `https://rye-k.pages.dev/api/payments/kakaobank-webhook` |
| HTTP Method | `POST` |

**헤더 추가** (+ 버튼 두 번):

| 헤더 이름 | 값 |
|-----------|-----|
| `Content-Type` | `application/json` |
| `X-RYE-Secret` | `(Cloudflare에 등록한 시크릿 값)` |

**Body / Content** (JSON 선택):

```json
{"name":"[sender_name]","amount":[amount_int],"rawText":"[알림 텍스트]","timestamp":[unix_time]000}
```

> `[unix_time]` 은 MacroDroid 시스템 변수 (초 단위). 뒤에 `000`을 붙여 밀리초로 변환.
> `[알림 텍스트]` 는 트리거에서 제공되는 알림 본문 변수 (MacroDroid UI에서 선택).

---

**액션 5 — 결과 알림 (선택)**

**액션 추가** → **알림 / 메시지** → **Toast 메시지**

| 항목 | 값 |
|------|-----|
| 메시지 | `입금 처리: [sender_name] [amount_int]원` |

---

### 4-4. 매크로 저장 및 활성화

1. **확인** → 매크로 저장
2. 매크로 목록에서 토글 **ON** (활성화)
3. MacroDroid 배터리 최적화 예외 설정 확인 (3번 항목)

---

### 지원되는 알림 형식

Worker는 아래 두 형태를 모두 파싱합니다:

```
홍길동 150,000원 입금
[카카오뱅크] 홍길동 150,000원 입금
```

---

## 5. 테스트 방법

### 5-1. MacroDroid 로컬 테스트

매크로 저장 후 MacroDroid에서 **수동 실행**:

1. 매크로 목록 → `카카오뱅크 입금 처리` 길게 누르기
2. **실행** 선택
3. 알림 텍스트 변수가 비어 있으므로 파싱은 실패하지만 HTTP 요청 로그 확인 가능

### 5-2. 엔드포인트 테스트 (curl)

**잘못된 시크릿 → 401**

```bash
curl -X POST https://rye-k.pages.dev/api/payments/kakaobank-webhook \
  -H "Content-Type: application/json" \
  -H "X-RYE-Secret: wrong_secret" \
  -d '{"name":"테스트","amount":100000,"timestamp":1000}'
# 예상: {"error":"Unauthorized"}
```

**오래된 timestamp → 400**

```bash
curl -X POST https://rye-k.pages.dev/api/payments/kakaobank-webhook \
  -H "Content-Type: application/json" \
  -H "X-RYE-Secret: YOUR_SECRET_HERE" \
  -d '{"name":"테스트","amount":100000,"timestamp":1000}'
# 예상: {"error":"Request expired or timestamp missing"}
```

**유효한 요청 → 200** (PowerShell)

```powershell
$ts = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
Invoke-RestMethod -Method POST `
  -Uri "https://rye-k.pages.dev/api/payments/kakaobank-webhook" `
  -Headers @{ "Content-Type" = "application/json"; "X-RYE-Secret" = "YOUR_SECRET_HERE" } `
  -Body "{`"name`":`"홍길동`",`"amount`":150000,`"timestamp`":$ts}"
# 예상: { ok: true, matched: false/true, confidence: "..." }
```

**인증 없이 GET → 401**

```bash
curl -X GET https://rye-k.pages.dev/api/payments/kakaobank-webhook
# 예상: {"error":"Unauthorized"}
```

### 5-3. 실제 입금 테스트

1. 업무폰에서 카카오뱅크 소액 (예: 100원) 입금 발생
2. KakaoTalk 알림 수신 확인
3. MacroDroid Toast 알림 확인: `입금 처리: {이름} {금액}원`
4. RYE-K 앱 수납 화면 진입 → 자동 처리 또는 미매칭 탭 확인

---

## 문제 해결

| 증상 | 원인 | 해결 방법 |
|------|------|-----------|
| MacroDroid가 알림을 인식 못함 | 알림 접근 권한 미부여 | 3번 단계 재확인 |
| MacroDroid가 알림을 인식 못함 | 배터리 최적화 | 설정 → 배터리 → MacroDroid → 최적화 안 함 |
| `sender_name` 이 비어 있음 | 알림 형식 불일치 | MacroDroid 로그에서 실제 알림 텍스트 확인 후 정규식 수정 |
| 401 오류 | X-RYE-Secret 불일치 | Cloudflare secret 값과 액션 4 헤더 값 일치 확인 |
| 400 오류 (timestamp) | 폰 시계 오차 | 설정 → 일반 → 날짜 및 시간 → 자동 설정 ON |
| 429 오류 | IP당 분당 10회 초과 | 테스트 속도 줄이기 (정상 동작) |
