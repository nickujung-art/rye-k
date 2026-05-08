# KakaoBank Webhook 설정 가이드 (Tasker + Cloudflare)

카카오뱅크 입금 알림을 Android Tasker에서 자동으로 감지하여 RYE-K 수납 시스템으로 전송하는 설정 가이드입니다.

---

## 목차

1. [사전 조건](#1-사전-조건)
2. [Cloudflare Secret 등록](#2-cloudflare-secret-등록)
3. [Tasker Profile 설정](#3-tasker-profile-설정)
4. [Tasker Task JavaScript 코드](#4-tasker-task-javascript-코드)
5. [테스트 방법 (curl)](#5-테스트-방법-curl)

---

## 1. 사전 조건

### 업무폰 (Android)

| 항목 | 내용 |
|------|------|
| 운영체제 | Android 8.0 이상 |
| 앱 | **Tasker** (Play 스토어, 유료 앱 ~4,000원) |
| 플러그인 | **AutoNotification** (Play 스토어, Tasker와 동일 개발사 joaomgcd) |
| 카카오뱅크 앱 | 입금 알림 푸시 알림 활성화 필수 |

> 중요: 업무폰은 Tasker 백그라운드 실행 허용 + 배터리 최적화 예외 설정이 필요합니다.
> Android 설정 → 배터리 → Tasker → 최적화 안 함 으로 설정하세요.

### 서버 측

- Cloudflare Pages에 배포된 `rye-k` 프로젝트
- `RYE_WEBHOOK_SECRET` Cloudflare Pages secret 등록 (아래 2번 참조)

---

## 2. Cloudflare Secret 등록

`RYE_WEBHOOK_SECRET`은 **절대 wrangler.toml에 기록하지 않습니다.** 반드시 아래 두 방법 중 하나로만 등록하세요.

### 방법 A: wrangler CLI (권장)

```bash
# 1. 강력한 랜덤 시크릿 생성 (예시)
openssl rand -hex 32
# 출력 예: a3f8e2d1c9b7...  (이 값을 복사해서 사용)

# 2. Cloudflare Pages secret 등록
wrangler pages secret put RYE_WEBHOOK_SECRET
# 프롬프트에 위에서 생성한 시크릿 값을 붙여넣기
```

### 방법 B: Cloudflare 대시보드

1. [Cloudflare 대시보드](https://dash.cloudflare.com) 접속
2. **Pages** → **rye-k** 프로젝트 선택
3. **Settings** 탭 → **Environment variables** 섹션
4. **Production** 아래 **+ Add** 클릭
5. Variable name: `RYE_WEBHOOK_SECRET`
6. Value: 생성한 랜덤 시크릿 값 입력
7. **Encrypt** 옵션 선택 (암호화 저장)
8. **Save** 클릭
9. 새 배포 필요: **Deployments** 탭 → 최신 배포 → **Retry deployment**

> Tasker JavaScript 코드의 `YOUR_SECRET_HERE` 자리에 동일한 시크릿 값을 사용합니다.

---

## 3. Tasker Profile 설정

### Profile 생성

1. Tasker 앱 실행 → **PROFILES** 탭
2. **+** 버튼 → **Event** 선택
3. **Plugin** → **AutoNotification** → **Intercept** 선택
4. AutoNotification 설정:
   - **Application**: `카카오뱅크` (앱 목록에서 선택)
   - **Contains**: `입금`
   - **Cancel Notification**: OFF (알림 유지)
5. **Done** 클릭
6. Task 선택 화면에서 **New Task** → 이름: `KakaoBank입금처리`

### Profile 조건 요약

| 설정 항목 | 값 |
|-----------|-----|
| 트리거 | AutoNotification Intercept |
| 앱 필터 | 카카오뱅크 |
| 텍스트 조건 | "입금" 포함 |

---

## 4. Tasker Task JavaScript 코드

위에서 생성한 Task에 다음 Action을 추가합니다:

1. Task 편집 화면 → **+** 버튼
2. **Script** → **JavaScript** 선택
3. 아래 코드를 붙여넣기
4. `YOUR_SECRET_HERE` 를 Cloudflare에 등록한 `RYE_WEBHOOK_SECRET` 값으로 교체

```javascript
var text = "%antext";
var patterns = [
  /(\S+)\s+([\d,]+)원\s+입금/,
  /\[카카오뱅크\]\s+(\S+)\s+([\d,]+)원/
];
var name = "", amount = 0;
for (var i = 0; i < patterns.length; i++) {
  var m = text.match(patterns[i]);
  if (m) { name = m[1]; amount = parseInt(m[2].replace(/,/g, "")); break; }
}
if (!name) { flash("파싱 실패: " + text); return; }

var xhr = new XMLHttpRequest();
xhr.open("POST", "https://rye-k.pages.dev/api/payments/kakaobank-webhook", false);
xhr.setRequestHeader("Content-Type", "application/json");
xhr.setRequestHeader("X-RYE-Secret", "YOUR_SECRET_HERE");
xhr.send(JSON.stringify({
  name: name,
  amount: amount,
  rawText: text,
  timestamp: Date.now()
}));
flash("Webhook 전송: " + name + " " + amount + "원");
```

### 코드 설명

| 변수 | 설명 |
|------|------|
| `%antext` | AutoNotification이 제공하는 알림 텍스트 변수 |
| `patterns` | 카카오뱅크 알림 문자열 파싱 정규식 (2가지 형태 지원) |
| `X-RYE-Secret` | Cloudflare에 등록한 시크릿 (동일 값) |
| `timestamp: Date.now()` | 재전송 공격(replay) 방지용 타임스탬프 (±5분 유효) |

### 알림 텍스트 예시

Worker는 아래 두 형태 모두 파싱합니다:

```
홍길동 150,000원 입금
[카카오뱅크] 홍길동 150,000원 입금
```

---

## 5. 테스트 방법 (curl)

배포 후 아래 curl 명령으로 동작을 확인하세요.

### 테스트 1: 잘못된 시크릿 → 401

```bash
curl -X POST https://rye-k.pages.dev/api/payments/kakaobank-webhook \
  -H "Content-Type: application/json" \
  -H "X-RYE-Secret: wrong_secret" \
  -d '{"name":"테스트","amount":100000,"timestamp":1000}'
# 예상 응답: {"error":"Unauthorized"} (HTTP 401)
```

### 테스트 2: 오래된 timestamp → 400 (replay 방지)

```bash
curl -X POST https://rye-k.pages.dev/api/payments/kakaobank-webhook \
  -H "Content-Type: application/json" \
  -H "X-RYE-Secret: YOUR_SECRET_HERE" \
  -d '{"name":"테스트","amount":100000,"timestamp":1000}'
# 예상 응답: {"error":"Request expired or timestamp missing"} (HTTP 400)
```

### 테스트 3: 유효한 요청 → 200

```bash
curl -X POST https://rye-k.pages.dev/api/payments/kakaobank-webhook \
  -H "Content-Type: application/json" \
  -H "X-RYE-Secret: YOUR_SECRET_HERE" \
  -d "{\"name\":\"홍길동\",\"amount\":150000,\"timestamp\":$(date +%s)000}"
# 예상 응답: {"ok":true,"matched":false,"confidence":"no_match"} 또는
#            {"ok":true,"matched":true,"studentId":"...","confidence":"exact"}
```

> `$(date +%s)000` 는 현재 시각(ms)을 자동으로 입력합니다. Windows PowerShell에서는:
> `[DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()` 를 사용하거나 직접 ms 타임스탬프를 입력하세요.

### 테스트 4: 인증 없이 GET → 401

```bash
curl -X GET https://rye-k.pages.dev/api/payments/kakaobank-webhook
# 예상 응답: {"error":"Unauthorized"} (HTTP 401)
```

### 테스트 5: teacher 역할로 GET → 403

```bash
curl -X GET https://rye-k.pages.dev/api/payments/kakaobank-webhook \
  -H "Authorization: Bearer {teacher_id_token}"
# 예상 응답: {"error":"Forbidden"} (HTTP 403)
```

---

## 문제 해결

| 증상 | 원인 | 해결 방법 |
|------|------|-----------|
| Tasker가 알림을 인식하지 못함 | AutoNotification 배터리 최적화 | 배터리 최적화 예외 설정 |
| 파싱 실패 flash 표시 | 카카오뱅크 알림 형식 변경 | patterns 정규식 업데이트 |
| 401 오류 | X-RYE-Secret 불일치 | Cloudflare secret 값과 Tasker 코드 값 일치 확인 |
| 400 오류 (timestamp) | 폰 시계 오차 | 폰 자동 시간 설정 확인 (NTP 동기화) |
| 429 오류 | 동일 IP 분당 10회 초과 | 테스트 속도 줄이기 (정상 동작) |
