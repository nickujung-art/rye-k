---
phase: 05-payment-automation
plan: "05"
subsystem: payment
tags: [kv-cache, worker, gap-closure, auth, pay-04, pay-05]
dependency_graph:
  requires: ["05-01", "05-04"]
  provides: ["students_cache KV 갱신 경로", "sync-students Worker 엔드포인트"]
  affects: ["functions/api/payments/kakaobank-webhook.js (students_cache 읽기)"]
tech_stack:
  added: []
  patterns: ["Cloudflare Workers Pages Function", "Firebase JWT Bearer auth", "KV TTL 캐시"]
key_files:
  created:
    - functions/api/payments/sync-students.js
  modified:
    - src/App.jsx
decisions:
  - "역할 체크는 body.role로 클라이언트가 전달 (verifyToken에 role 클레임 없음)"
  - "KV TTL 86400s (24h) — kakaobank-webhook.js pending 레코드 TTL과 동일"
  - "isInstitution + status 필터 서버사이드 적용 — 가상회원 오캐시 방지"
  - "PII 최소화: id/name/status 3개 필드만 KV 저장"
metrics:
  duration: "~10분"
  completed: "2026-05-09"
  tasks_completed: 2
  files_changed: 2
---

# Phase 05 Plan 05: sync-students Gap Closure Summary

students_cache KV 갭 해소 — POST /api/payments/sync-students Worker 엔드포인트 신규 구현 + App.jsx drainPending body에 role 필드 추가.

## What Was Built

### Task 1: functions/api/payments/sync-students.js (신규 생성)

POST `/api/payments/sync-students` 엔드포인트:
- Firebase JWT Bearer 인증 (`verifyToken`) — anonymous 포함 null 반환 시 401
- `body.role` 기반 역할 체크 — admin/manager만 허용, teacher 403 Forbidden
- `isInstitution` 필터 + `status === "active"` 필터 — 가상회원/비활성 학생 차단
- KV `students_cache` 저장 TTL 86400s (24h)
- PII 최소화: `{ id, name, status }` 3개 필드만 저장 (phone, birthDate 제외)

### Task 2: src/App.jsx drainPending 수정

기존 sync-students fetch body에 `role: user.role` 필드 추가:
- Worker의 역할 체크에 필요한 role 정보 전달
- 코멘트 명확화 (PAY-04/05 gap 명시)
- 기존 drain GET 로직 무변경

## students_cache Gap 해소 확인

| 상태 | 이전 | 이후 |
|------|------|------|
| students_cache KV | 항상 빈 배열 `[]` | PaymentsView 진입 시 실제 활성 학생 목록으로 갱신 |
| kakaobank-webhook fuzzy match | 모든 입금 unmatched | 학생 이름 매칭 가능 (exact/fuzzy_1) |
| teacher 역할 접근 | 미검증 | 403 Forbidden 차단 |

## 빌드 통과 여부

`npm run build` 통과 확인 (chunk size 경고는 기존 이슈, 이 플랜과 무관).

## Deviations from Plan

### 기존 파일 상태 차이

**발견:** 실행 전 `functions/api/payments/sync-students.js`와 `src/App.jsx`에 이미 부분 구현이 존재했음.

| 항목 | 기존 상태 | 플랜 스펙 | 처리 |
|------|-----------|-----------|------|
| sync-students.js | role 체크 없음, isInstitution 필터 없음, TTL 7200s | role 체크 필수, isInstitution 필터, TTL 86400s | Rule 1 — 플랜 스펙으로 전면 재작성 |
| App.jsx body | role 필드 없음 | `role: user.role` 포함 | Rule 1 — role 필드 추가 |

기존 sync-students.js는 역할 체크가 없어 teacher도 KV를 갱신할 수 있었음 (T-05-05-03 위협 미완화). 플랜 스펙으로 교체.

## Threat Model Compliance

| Threat ID | 처리 결과 |
|-----------|-----------|
| T-05-05-01 Spoofing | verifyToken → 401 구현 완료 |
| T-05-05-02 Tampering | isInstitution + status + id/name 타입 검증 완료 |
| T-05-05-03 EoP (teacher) | body.role 체크 → 403 완료 |
| T-05-05-04 PII Disclosure | { id, name, status } 3필드만 저장 완료 |
| T-05-05-05 DoS | accept (운영 학생 수 수백명 수준) |

## Self-Check: PASSED

- [x] functions/api/payments/sync-students.js 존재
- [x] students_cache grep 매칭 >= 1
- [x] expirationTtl: 86400 존재
- [x] Forbidden 존재 (teacher 403)
- [x] isInstitution 필터 존재
- [x] App.jsx sync-students 참조 존재 (drainPending 내부)
- [x] App.jsx students_cache 직접 참조 0개
- [x] 커밋 61aefba (sync-students.js), fedfb82 (App.jsx) 존재
- [x] npm run build 통과
