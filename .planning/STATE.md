# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-05-05)

**Core value:** 강사와 학생이 레슨에 집중할 수 있도록, 행정 업무(수납·출결·소통)를 자동화하고 모든 역할이 하나의 앱에서 필요한 정보를 얻을 수 있게 한다
**Current focus:** Phase 1 — 보안 기반 (Security Foundation)

## Current Position

Phase: 0 of 6 (Pre-start — roadmap created, no phases begun)
Plan: 0 of TBD in current phase
Status: Ready to plan
Last activity: 2026-05-05 — Roadmap and STATE initialized

Progress: [░░░░░░░░░░] 0%

## Performance Metrics

**Velocity:**
- Total plans completed: 0
- Average duration: -
- Total execution time: 0 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| - | - | - | - |

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- saveStudents() 영구 비활성화, per-op 트랜잭션 전환 (완료)
- 외부 결제 미연동, 은행 알림 자동화만 채택
- 카카오 알림톡 우선, FCM 나중 (AlimtalkModal UI 이미 존재)
- Gemini 2.5 Flash 사용 (anthropic.js 이름 정리 필요 — Phase 3)

### Pending Todos

None yet.

### Blockers/Concerns

- **Phase 4 blocker**: 카카오 비즈니스 채널 개설 + Solapi 계정 등록 + 알림톡 템플릿 심사 — Nick 선행 작업 필요 (심사 최대 7영업일 소요)
- **Phase 5 blocker**: `monthlyFee` 전체 0원 — 수납 자동화 전 Nick이 데이터 직접 입력 필요
- **Phase 5 blocker**: Firebase 서비스 계정 생성 + Cloudflare secret 등록 — Toss Payments 가상계좌 Webhook Worker에 필요
- **Phase 1 risk**: Custom Claims Worker 배포 후 Firestore 규칙 순차 적용 필수 — 순서 역전 시 강사 전원 로그아웃됨
- **Ongoing**: App.jsx 840+ 줄 god-file — Phase 5-6에서 리스너 추가 시 `useAppData()` 훅 분리 고려

## Deferred Items

| Category | Item | Status | Deferred At |
|----------|------|--------|-------------|
| SaaS | 멀티테넌트 아키텍처 | Out of scope | v1.0 |
| Commerce | 한복·악기 판매 마켓플레이스 | Out of scope | v1.0 |
| Commerce | 공연·이벤트 티켓 시스템 | Out of scope | v1.0 |
| Tech | TypeScript 마이그레이션 | Out of scope | v1.0 |
| Notifications | FCM 푸시 알림 | Out of scope | v1.0 |
| Data | Firestore 서브컬렉션 마이그레이션 | Out of scope (단 ANL-04 아카이빙으로 부분 대응) | v1.0 |

## Session Continuity

Last session: 2026-05-05
Stopped at: Roadmap and STATE.md initialized. No phases planned or executed yet.
Resume file: None
