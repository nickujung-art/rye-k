# ADR: RYE-K K-Culture Center

### ADR-001: Firebase Firestore 단일 컬렉션
`appData` 단일 컬렉션, 문서 ID = 데이터 키. onSnapshot 1회로 전체 실시간 동기화.  
트레이드오프: 단건 쿼리 불가, 문서 크기 증가 시 구조적 한계 → ADR-005로 보완.

### ADR-002: CSS-in-JS
`src/constants.jsx` CSS 문자열 → `<style>` 태그 주입. 외부 의존성 0, 테마 단일 파일 관리.  
트레이드오프: 파일 커질수록 CSS 관리 어려움 (현재 600줄+).

### ADR-003: B2B 기관 — 가상회원 (Option C)
기관 수업을 런타임에 `expandInstitutionsToMembers()`로 가상 student 객체 변환 → 기존 컴포넌트에 주입. 기존 코드 0 수정.  
트레이드오프: `isInstitution` 플래그 분기 필요, StudentsView/Dashboard 오염 방지 필터링 항상 필요.

### ADR-004: 인증 — Firebase Auth + 로컬 검증 혼용
Firebase Auth = Firestore 접근권한만. 신원검증은 `rye-teachers` + `ADMIN` 상수 클라이언트 직접 비교. Cloud Functions 불필요.  
트레이드오프: 클라이언트 권한검증(소규모 내부 사용자 전제). 현재 Auth ↔ 로컬 비번 동기화 깨진 상태.

### ADR-005: 학생 CRUD — per-op 트랜잭션 (saveStudents 하드락)
`saveStudents([...])` throw화. 모든 CRUD를 `runTransaction` 기반으로만 허용.  
이유: 필터 뷰에서 `saveStudents` 호출 시 77명 데이터 손실 사고 발생.

### ADR-006: 이미지 — Canvas 압축 후 Firestore Base64
Firebase Storage 미사용. Canvas API로 360px JPEG 75% → Base64 → Firestore 직접 저장.  
트레이드오프: 회원 수 급증 시 문서 크기 초과 위험, CDN 캐싱 불가.

### ADR-007: React Router 미사용
`window.location.pathname` / `URLSearchParams` 직접 파싱. Cloudflare Pages `_redirects` SPA fallback.  
트레이드오프: URL에 현재 뷰 미반영, 뒤로가기 미지원.

### ADR-008: 댓글 Soft Delete
삭제 시 `deletedAt` / `deletedBy` 필드 추가. 관리자/매니저는 원문 열람, 강사/회원은 플레이스홀더.  
트레이드오프: DB 누적, 배지 카운트 시 deletedAt 필터링 필요.
