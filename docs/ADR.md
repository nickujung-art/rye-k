# Architecture Decision Records: RYE-K K-Culture Center

## 철학
MVP 속도와 운영 안정성 최우선. 외부 의존성 최소화. 이미 동작하는 최소 구현을 선택하고 검증 후 확장.

---

### ADR-001: Firebase Firestore 단일 컬렉션 패턴

**결정**: 모든 데이터를 단일 컬렉션 `appData`에 저장하고, 문서 ID를 키(`rye-students`, `rye-attendance` 등)로 사용한다. 문서 1개 = 배열 전체.

**이유**: 쿼리 복잡도를 없애고 `onSnapshot` 한 번으로 전체 데이터 실시간 동기화 가능. MVP 단계에서 데이터 규모(회원 ~100명, 강사 ~15명)가 문서 크기 제한(1MB)을 초과하지 않음.

**트레이드오프**: 문서 크기 증가 시 쿼리 불가. 단건 업데이트가 어렵고 전체 문서를 재작성해야 하는 구조적 한계 → ADR-005로 해결.

---

### ADR-002: CSS-in-JS (상수 파일 CSS 문자열)

**결정**: 모든 스타일을 `src/constants.jsx`의 `CSS` 상수 문자열에 집중하고, `main.jsx`에서 `<style>` 태그로 주입.

**이유**: Tailwind/CSS Module 설정 없이 즉시 시작 가능. CSS 변수 기반 테마 시스템과 다크모드를 단일 파일에서 관리. 외부 의존성 0.

**트레이드오프**: 파일이 커질수록 CSS 검색·관리가 어려움. CSS 클래스 타입 안전성 없음. 현재 `constants.jsx`가 600줄 이상 CSS를 보유 중.

---

### ADR-003: B2B 기관 — Option C 가상회원 매핑 아키텍처

**결정**: 기관의 수업/반을 런타임에 가상 student 객체로 변환(`expandInstitutionsToMembers`)하여 기존 컴포넌트에 주입. 기존 컴포넌트 코드 수정 없음.

**이유**: 기관 전용 출석/수납/스케줄 컴포넌트를 새로 만들면 ~2,000줄 중복. 가상회원 변환 헬퍼 1개로 기존 코드를 재활용하면 개발·유지보수 비용 최소화.

**트레이드오프**: 기관과 일반 회원이 같은 컴포넌트를 공유하므로 `isInstitution` 플래그 분기가 곳곳에 생김. StudentsView/Dashboard에서 가상회원 오염 방지를 위한 필터링 항상 필요.

---

### ADR-004: 인증 — Firebase Auth + 로컬 credentials 혼용

**결정**: Firebase Auth(익명/이메일)로 Firestore 접근 권한만 부여. 실제 신원 검증은 Firestore의 `rye-teachers` 레코드와 `ADMIN` 상수를 클라이언트에서 직접 비교.

**이유**: Firebase Auth custom claim 관리 불필요. 강사 계정 생성/삭제가 Firestore 문서 수정만으로 완결. 서버 함수(Cloud Functions) 배포 없이 운영 가능.

**트레이드오프**: 클라이언트 측 권한 검증 → 보안 강도가 낮음(신뢰할 수 있는 소규모 내부 사용자 전제). Firebase Auth와 로컬 비밀번호가 동기화 깨진 상태로 로컬 fallback 동작 중.

---

### ADR-005: 학생 CRUD — per-op 트랜잭션 (saveStudents 하드락)

**결정**: `saveStudents([...])` 함수를 즉시 throw하도록 교체. 모든 학생 CRUD를 `runTransaction` 기반 per-op 함수로만 허용:
- `addStudentDoc`, `updateStudentDoc`, `deleteStudentDoc`, `batchStudentDocs`

**이유**: 필터된 뷰(teacher 역할, 2명 visible)에서 `saveStudents(visible)`를 호출하면 전체 77명이 2명으로 덮어써지는 데이터 유실 사고가 실제 발생. 아키텍처 레벨에서 재발 차단.

**트레이드오프**: 코드베이스 전체에서 `saveStudents` 호출부를 모두 per-op 호출로 교체해야 함. 트랜잭션 기반이므로 동시 수정 충돌 안전하나 네트워크 비용 증가.

---

### ADR-006: 이미지 저장 — Canvas 압축 후 Firestore Base64

**결정**: Firebase Storage 미사용. 이미지를 Canvas API로 360px JPEG 75%로 압축 후 Base64로 Firestore 문서에 직접 저장.

**이유**: Storage 요금 발생 없음. 별도 파일 URL 관리 불필요. 현재 회원 수(~100명)에서 Base64 사진 크기는 문서 크기 제한(1MB)에 문제없음.

**트레이드오프**: 대용량 이미지 또는 회원 수 급증 시 Firestore 문서 크기 초과 위험. 사진 CDN 캐싱 불가.

---

### ADR-007: React Router 미사용

**결정**: React Router 없이 `window.location.pathname` / `URLSearchParams` 직접 파싱으로 라우팅.

**이유**: 진입점이 3개(메인 앱 / 회원 포털 / 등록 폼)로 단순. Cloudflare Pages `_redirects`로 SPA fallback 처리. 라우터 설정·번들 크기 오버헤드 없음.

**트레이드오프**: 앱 내 뷰 전환은 `setView` state 기반 (URL에 현재 뷰 반영 안 됨). 뒤로가기 브라우저 버튼 미지원.

---

### ADR-008: 댓글 Soft Delete

**결정**: 댓글 삭제 시 DB에서 제거하지 않고 `deletedAt`, `deletedBy` 필드를 추가. 관리자/매니저는 삭제된 원문 열람 가능, 강사/회원은 플레이스홀더 표시.

**이유**: 소통 기록 감사 추적 가능. 삭제된 댓글 자리를 유지해 스레드 맥락 보존. 회원 분쟁 시 관리자가 원문 확인 가능.

**트레이드오프**: DB에 삭제 데이터 누적. 신규 댓글 배지 카운트 시 `deletedAt` 있는 댓글 필터링 로직 필요.
