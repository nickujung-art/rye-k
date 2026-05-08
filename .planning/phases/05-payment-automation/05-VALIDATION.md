---
phase: 5
slug: payment-automation
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-08
---

# Phase 5 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> **Note:** 이 프로젝트는 테스트 러너 없음. 검증은 `npm run build` 통과 + 브라우저 직접 확인 (CLAUDE.md 기준).

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | 없음 — 수동 브라우저 검증 |
| **Config file** | — |
| **Quick run command** | `npm run build` |
| **Full suite command** | `npm run build && npm run preview` |
| **Estimated runtime** | ~30 seconds (build only) |

---

## Sampling Rate

- **After every task commit:** Run `npm run build` (빌드 실패 = 블로커)
- **After every plan wave:** Run `npm run build && npm run preview` + 브라우저 직접 확인
- **Before `/gsd-verify-work`:** Full build green + 모든 요건 수동 확인
- **Max feedback latency:** 30 seconds (build)

---

## Per-Task Verification Map

| Req ID | Behavior | Wave | Verification Method | Automated Command | Status |
|--------|----------|------|---------------------|-------------------|--------|
| PAY-01 | 수강료 셀 클릭 → 인라인 편집 → Tab/Enter 이동 → updateStudentDoc() 저장 | 1 | 브라우저 수납 화면, F12 Network 탭 확인 | `npm run build` | ⬜ pending |
| PAY-02 | Dashboard 홈탭 미납 현황 카드 → 클릭 시 PaymentsView 이동 | 1 | 브라우저 대시보드 직접 클릭 | `npm run build` | ⬜ pending |
| PAY-03 | 다음 달 선택 시 레코드 없는 학생 = 미납 표시, 새달 수납 쓰기 버튼 동작 | 1 | 브라우저 월 선택기 조작 | `npm run build` | ⬜ pending |
| PAY-04 | Webhook POST → 401 (wrong secret) / 200 (correct) / 400 (bad body) | 2 | `curl -X POST https://rye-k.pages.dev/api/payments/kakaobank-webhook` | — (Worker 배포 후 curl) | ⬜ pending |
| PAY-05 | 입금자명 fuzzy 매칭 → 자동 수납 처리 또는 미매칭 큐 분기 | 2 | Webhook 호출 후 Firestore console 확인 | — | ⬜ pending |
| PAY-06 | 미매칭 입금 탭 → 학생 선택 → 수납 완료 → 항목 사라짐 | 1/2 | 브라우저 탭 전환 + 수동 매칭 | `npm run build` | ⬜ pending |
| ALM-07 | 미납 학생 행 💬 버튼 → AlimtalkModal "Phase 4 연동 후 활성화" 안내 | 1 | 브라우저 클릭 확인 | `npm run build` | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

이 프로젝트는 테스트 러너가 없으므로 Wave 0 테스트 인프라 설치가 필요 없다.

> Existing infrastructure: `npm run build` covers all phase requirements as smoke test.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Webhook PAY-04 인증 검증 | PAY-04 | Cloudflare Worker는 로컬 실행 불가, 배포 후 테스트 필요 | `curl -X POST https://rye-k.pages.dev/api/payments/kakaobank-webhook -H "X-RYE-Secret: wrong" → 401` |
| Fuzzy 매칭 자동 수납 처리 | PAY-05 | Firestore 실데이터와 Worker 연결 필요 | Webhook POST 후 Firestore console에서 rye-payments 업데이트 확인 |
| Tasker 설정 및 자동 파싱 | PAY-04/05 | Android 기기 + Tasker 설치 필요 | docs/operations/kakaobank-webhook-setup.md 참조 |
| 수강료 인라인 편집 Tab/Enter 이동 | PAY-01 | 포커스 동작은 브라우저에서만 검증 가능 | 수납 화면에서 수강료 셀 클릭 → Tab 키로 다음 행 이동 확인 |

---

## Security Verification

| Threat | Verification | Status |
|--------|-------------|--------|
| X-RYE-Secret 타이밍 공격 | `timingSafeEqual` 사용 확인 (코드 리뷰) | ⬜ |
| Webhook replay attack | timestamp ±5분 검증 코드 존재 확인 | ⬜ |
| wrangler.toml에 secret 미노출 | `grep RYE_WEBHOOK_SECRET wrangler.toml` → 없어야 함 | ⬜ |
| Rate limit 동작 | RATE_LIMIT_KV 바인딩 webhook에 적용 확인 | ⬜ |

---

## Validation Sign-Off

- [ ] 모든 requirements에 acceptance_criteria 존재
- [ ] Build green: `npm run build` 통과
- [ ] PAY-01~03, PAY-06, ALM-07: 브라우저 직접 확인 완료
- [ ] PAY-04/05: curl + Cloudflare Worker 배포 후 엔드포인트 테스트 완료
- [ ] Security: wrangler.toml에 secret 없음 확인
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
