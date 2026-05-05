# RYE-K K-Culture Center 통합 관리 플랫폼

## What This Is

국악 교육기관을 위한 올인원 관리 PWA. 강사·회원 관리, 출결, 수납, AI 레슨 지원, 회원 포털까지 갖추고 있으며, 관리자·매니저·강사·학생·학부모 5가지 역할이 모두 사용하는 서비스다. 현재는 단일 학원(RYE-K) 운영 전용이며, 향후 K-Culture 플랫폼(한복·악기 판매, 공연·이벤트, SaaS)으로 확장할 기반을 쌓는 중이다.

## Core Value

강사와 학생이 레슨에 집중할 수 있도록, 행정 업무(수납·출결·소통)를 자동화하고 모든 역할이 하나의 앱에서 필요한 정보를 얻을 수 있게 한다.

## Requirements

### Validated

*이미 운영 중인 기능 — 코드베이스 v16.0.0 기준*

- ✓ 회원(학생) CRUD — per-op Firestore 트랜잭션 기반 (saveStudents 금지 적용)
- ✓ 강사 관리 — 계정, 역할, 담당 악기, 담당 회원
- ✓ 출결 기록 및 조회 — 상태(출석/결석/지각/결강), 레슨노트, 댓글
- ✓ 수납 기록 및 조회 — 수동 입력 기반
- ✓ 공지사항 관리 — 전체/개인 공지
- ✓ 기관(B2B) 관리 — 학교·센터 계약, 가상회원 확장
- ✓ 스케줄 뷰 — 요일별 수업, 임시 일정 변경
- ✓ 회원 포털 (기초) — 학생 코드 기반 접근, 기본 출석 확인
- ✓ 레슨 노트 AI 생성 — 음성 입력 + 자동 구두점 + Gemini
- ✓ AI 어시스턴트 패널 — admin/manager 전용 플로팅 채팅
- ✓ 이탈 위험도 위젯 (ChurnWidget) — 대시보드 분석
- ✓ Firebase Auth — 이메일/익명 혼용, 역할 기반 접근
- ✓ Cloudflare Pages + Workers 배포 파이프라인

### Active

*이번 로드맵에서 완성할 것들*

**포털 고도화**
- [ ] 학생 포털 앱 수준 화면 — 시간표, 출석 내역, 레슨노트, 수납 내역 (모바일 최적화)
- [ ] 학부모 포털 — 자녀 출석·레슨노트·수납 현황 확인
- [ ] 셀프 수강 신청 — 학생/학부모가 포털에서 수강 신청 후 관리자 승인 흐름
- [ ] 포털 자동 로그인 개선 — 세션 유지 및 재인증 흐름

**AI 완성**
- [ ] 월별 리포트 자동 생성 + 강사→학부모 발송 흐름
- [ ] 이탈 위험도 → 자동 케어 메시지 초안 생성 및 발송 연동
- [ ] AI 자연어 쿼리 완성 — 학생·출결 데이터 자연어 조회
- [ ] AI 어시스턴트 응답 품질 고도화

**수납 자동화**
- [ ] 은행 입금 알림 연동 → 학생 자동 매칭 → 수납 확인 처리
- [ ] 월별 수납 미납 안내 메시지 자동 발송
- [ ] 수납 현황 대시보드 — 미납 현황, 월별 수납률

**카카오 알림톡 통합**
- [ ] 알림톡 API 연동 완성 (기존 AlimtalkModal 확장)
- [ ] 출결 알림 — 결석 시 학부모 자동 알림톡
- [ ] 수납 알림 — 월초 수납 안내 + 미납 리마인더
- [ ] 일정 변경 알림 — 보강/휴강 시 관련 학생 일괄 알림톡

**분석 대시보드**
- [ ] 관리자용 매출·수납 현황 대시보드 (월별 추이, 악기별 분포)
- [ ] 강사용 담당 학생 출석률·진도 요약 뷰
- [ ] 학부모용 자녀 월별 수업 리포트 (출석률, 레슨노트 요약)

**보안 강화**
- [ ] Firestore 보안 규칙 — 역할 기반 read/write 제한 (익명 전체 읽기 차단)
- [ ] Auth 세션 만료 및 강사 로컬↔Firebase 동기화 수리
- [ ] 운영 콘솔 로그 제거 (UID 유출 방지)

### Out of Scope

- **실제 결제 PG 연동 (토스/카카오페이)** — 외부에서 처리, 앱은 수납 확인만. PG 연동은 법인 계좌·사업자 등록 등 운영 준비가 선행되어야 함
- **SaaS / 멀티테넌트** — 향후 마일스톤. RYE-K 단일 학원 완성이 먼저
- **한복·악기 판매 마켓플레이스** — 향후 마일스톤. 레슨 관리 완성 후
- **공연·이벤트 티켓 시스템** — 향후 마일스톤
- **TypeScript 마이그레이션** — 현재 .js/.jsx 전체, 마이그레이션 비용 대비 효과 미검증
- **앱 푸시 알림 (FCM)** — 카카오 알림톡으로 충분. 푸시는 추가 플랫폼 계정 필요
- **Firestore 서브컬렉션 마이그레이션** — 스케일 이슈가 현실화되면 그때 결정

## Context

### 기술 환경
- **스택**: React 18 + Vite 5 (SPA), Firebase v10 (Firestore + Auth), Cloudflare Pages + Workers
- **CSS**: constants.jsx 인라인 CSS 문자열 → `<style>` 태그 주입. 외부 CSS 파일 없음
- **AI**: Cloudflare Workers에서 Gemini 2.5 Flash 호출 (`functions/api/ai/`)
- **배포**: GitHub push → Cloudflare Pages 자동 빌드

### 현재 알려진 이슈 (기술 부채)
- `monthlyFee` 전체 0 — 실제 수납 금액 미입력. 수납 자동화 전 데이터 정비 필요
- Firebase Auth ↔ localStorage 세션 동기화 깨짐 — 로컬 fallback 동작 중
- App.jsx 840+ 줄 god-file — 리스너·라우팅·시드 데이터 혼재
- Firestore 단일 문서 패턴 — 출결·수납 데이터 누적 시 1MB 한도 주의

### 운영 현황 (2026-05-05 기준)
- 강사: 14명 (해금, 대금, 가야금, 판소리, 타악)
- 학생: ~77명 이상 (2026-04-01 데이터 복구 완료)
- 기관(B2B): 운영 중

### 개발 제약
- `saveStudents([...])` 절대 금지 — per-op 트랜잭션만 허용
- `window.confirm` / `window.alert` 금지 — 커스텀 모달만
- `git push` 는 Nick 명시 요청 시에만
- 시스템 소식 / 릴리즈 노트 변경은 Nick 컨펌 후에만 파일 반영

## Constraints

- **Tech Stack**: React 18 + Vite 5 + Firebase v10 고정. 메이저 마이그레이션 없음
- **CSS Pattern**: constants.jsx 인라인 CSS 유지. 외부 CSS 도입 시 전체 리팩토링 필요
- **Data Safety**: 학생 데이터 per-op 트랜잭션 필수. 배열 전체 덮어쓰기 영구 금지
- **Deploy**: Nick 명시 승인 후에만 push. 라이브 = 실제 운영 환경
- **Budget**: Firebase Free/Spark 플랜 한도 고려 (Firestore 읽기 50K/일, 쓰기 20K/일)
- **Kakaotalk**: 알림톡 발송 = 비즈니스 채널 계정 + 심사 필요 (사전 준비 필요)

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| saveStudents 영구 비활성화, per-op 트랜잭션 전환 | 2025년 77명 데이터 유실 사고 재발 방지 | ✓ 적용 완료 |
| 외부 결제 미연동, 은행 알림 자동화만 | PG 연동 복잡도·법인 요건 회피, 수납 확인 자동화로 충분 | — Pending |
| SaaS 향후 마일스톤 분리 | RYE-K 단일 학원 완성 먼저, 멀티테넌트 설계 선행 투자 불필요 | — Pending |
| 카카오 알림톡 우선, FCM 나중 | AlimtalkModal 이미 존재, 카톡 도달률 높음, FCM은 추가 플랫폼 계정 필요 | — Pending |
| Gemini 2.5 Flash 사용 (Anthropic 대신) | 비용 효율, 한국어 성능 충분, anthropic.js 이름 유지 중 | — Pending |

## Evolution

이 문서는 페이즈 전환과 마일스톤 경계에서 진화한다.

**각 페이즈 전환 후 (`/gsd-transition`):**
1. 무효화된 요구사항 → Out of Scope로 이동 (이유 기재)
2. 검증된 요구사항 → Validated로 이동 (페이즈 참조)
3. 새로 생긴 요구사항 → Active에 추가
4. 결정 사항 → Key Decisions에 추가
5. "What This Is" 여전히 정확한가? → 달라졌으면 업데이트

**각 마일스톤 후 (`/gsd-complete-milestone`):**
1. 전체 섹션 리뷰
2. Core Value 점검 — 여전히 맞는 우선순위인가?
3. Out of Scope 감사 — 이유가 아직 유효한가?
4. Context 현황 업데이트

---
*Last updated: 2026-05-05 after initialization*
