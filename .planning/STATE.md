# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-05-05)

**Core value:** 강사와 학생이 레슨에 집중할 수 있도록, 행정 업무(수납·출결·소통)를 자동화하고 모든 역할이 하나의 앱에서 필요한 정보를 얻을 수 있게 한다
**Current focus:** Phase 3 완료 → Phase 5 — 수납 자동화 (Phase 4 AlimTalk API 미수령, 나중에 처리)

## Current Position

Phase: FS-fee-split (레슨별 수강료 분리)
Plan: 1 of 4 in current phase
Status: **IN PROGRESS** — FS-01 (utils 헬퍼 추가) 완료. FS-02~04 대기.
Last activity: 2026-05-09 — FS-01 calcLessonFeeWithFallback + calcTotalFee 함수 추가 완료

Progress: [██░░░░░░░░] 25% (FS-01/4 완료)

## Performance Metrics

**Velocity:**
- Total plans completed: 4 (Phase 2)
- Total execution time: ~1 session (2026-05-05)

**By Phase:**

| Phase | Plans | Status |
|-------|-------|--------|
| Phase 1 — 보안 강화 | 4 | ✓ 완료 |
| Phase 2 — 포털 완성 | 4 | ✓ 완료 |
| Phase 3 — AI 기능 연동 | 3 | ✓ 완료 (human UAT 대기) |

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- saveStudents() 영구 비활성화, per-op 트랜잭션 전환 (완료)
- 외부 결제 미연동, 은행 알림 자동화만 채택
- 카카오 알림톡 우선, FCM 나중 (AlimtalkModal UI 이미 존재)
- Gemini 2.5 Flash 사용 (anthropic.js 이름 정리 필요 — Phase 3)
- [FS-01] lesson.fee 양수 체크 (0="미설정" 구분), monthlyFee/lessonCount 균등 분배 폴백 채택
- [FS-01] isInstitution 가상회원 별도 분기 없이 기존 폴백으로 처리 (lessons[0].fee 없으면 monthlyFee 반환)

### Pending Todos

None yet.

### Blockers/Concerns

- **Phase 4 blocker**: 카카오 비즈니스 채널 개설 + Solapi 계정 등록 + 알림톡 템플릿 심사 — Nick 선행 작업 필요 (심사 최대 7영업일 소요) — Phase 5 이후 처리
- **Phase 5 action (Nick)**: `monthlyFee` 전체 0원 — PAY-01 스프레드시트 UI 완성 후 Nick이 직접 입력
- **Phase 5 action (Nick)**: Cloudflare secret `RYE_WEBHOOK_SECRET` 등록 — 카카오뱅크 Webhook Worker 배포 후
- **Phase 5 action (Nick)**: Tasker + AutoNotification 플러그인 설치 + Profile 설정 — 업무폰 Android에서
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

Last session: 2026-05-09
Stopped at: FS-fee-split FS-01 완료 (utils.js calcLessonFeeWithFallback + calcTotalFee 추가, 빌드 통과, 커밋 b047d93). FS-02~04 실행 대기.
Resume file: None

## Plans Completed This Phase (FS-fee-split)

| Plan | Wave | Requirements | Files |
|------|------|-------------|-------|
| FS-01 | 1 | FS-FEE-01, FS-FEE-02 | src/utils.js |
