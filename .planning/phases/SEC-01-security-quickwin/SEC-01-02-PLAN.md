---
phase: SEC-01-security-quickwin
plan: 02
type: execute
wave: 1
depends_on: []
files_modified:
  - firestore.rules
autonomous: true
requirements:
  - SEC-2
  - SEC-3
  - SEC-4

must_haves:
  truths:
    - "rye-students 읽기가 이메일 인증 사용자(isEmailUser)로 제한된다"
    - "rye-teachers 읽기가 이메일 인증 사용자(isEmailUser)로 제한된다"
    - "rye-attendance 쓰기가 이메일 인증 사용자(isEmailUser)로만 허용된다"
    - "rye-pending write는 portal 등록 필드(value·updatedAt 키 필수 + value 배열 크기 1000 이하)만 허용"
    - "rye-student-notices write는 value 배열 크기 1000 이하만 허용"
    - "익명 사용자는 rye-students / rye-teachers 읽기가 차단된다"
  artifacts:
    - path: "firestore.rules"
      provides: "강화된 Firestore 접근 제어"
      contains: "isEmailUser()"
  key_links:
    - from: "firestore.rules rye-students"
      to: "isEmailUser()"
      via: "allow read 조건 변경"
      pattern: "rye-students.*isEmailUser"
    - from: "firestore.rules rye-teachers"
      to: "isEmailUser()"
      via: "allow read 조건 변경"
      pattern: "rye-teachers.*isEmailUser"
    - from: "firestore.rules rye-attendance"
      to: "isEmailUser()"
      via: "allow write 조건 간소화 (익명 쓰기 경로 제거)"
      pattern: "rye-attendance.*isEmailUser"
    - from: "firestore.rules rye-pending"
      to: "request.resource.data.value.size() <= 1000"
      via: "페이로드 크기 제한 조건"
      pattern: "rye-pending.*value.size"
    - from: "firestore.rules rye-student-notices"
      to: "request.resource.data.value.size() <= 1000"
      via: "페이로드 크기 제한 조건"
      pattern: "rye-student-notices.*value.size"
---

<objective>
Firestore 보안 규칙 강화 — 익명 사용자의 PII 읽기 및 DB 플러딩 차단 (SEC-2, SEC-3, SEC-4).

Purpose:
- SEC-2: 포털 익명 방문자가 강사·학생 PII 전체를 읽을 수 있는 CRITICAL 취약점 차단
- SEC-3: 익명 사용자가 rye-pending / rye-student-notices에 무한 쓰기하는 DB 플러딩 위험을 필드 제한으로 완화
- SEC-4: rye-attendance에 익명 사용자가 컨텐츠 주입 가능한 취약한 size() 체크 제거

Output: firestore.rules 수정 (rye-students, rye-teachers, rye-pending, rye-student-notices, rye-attendance 규칙 변경)
</objective>

<execution_context>
@C:/Users/GIGABYTE/.claude/get-shit-done/workflows/execute-plan.md
@C:/Users/GIGABYTE/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md

<interfaces>
<!-- firestore.rules 현재 상태 (수정 대상 5개 규칙) -->

isEmailUser() 함수 — 이미 존재함 (line 8-11):
```
function isEmailUser() {
  return request.auth != null &&
    request.auth.token.firebase.sign_in_provider == 'password';
}
```

수정 대상 1 — rye-students (line 34-37):
현재: allow read: if isAuthenticated();
변경: allow read: if isEmailUser();

수정 대상 2 — rye-teachers (line 40-43):
현재: allow read: if isAuthenticated();
변경: allow read: if isEmailUser();

수정 대상 3 — rye-pending (line 61-64):
현재: allow write: if isAuthenticated();
변경: isAuthenticated() 유지 + 페이로드 제한 조건 추가

수정 대상 4 — rye-student-notices (line 67-70):
현재: allow write: if isAuthenticated();
변경: isAuthenticated() 유지 + 페이로드 크기 제한 조건 추가

수정 대상 5 — rye-attendance (line 52-58):
현재:
  allow write: if isEmailUser()
               || (isAuthenticated()
                   && request.resource.data.keys().hasAll(['value', 'updatedAt'])
                   && request.resource.data.value.size() >= resource.data.value.size());
변경:
  allow write: if isEmailUser();

포털 쓰기 패턴 (PublicPortal.jsx에서 확인):
- rye-pending: tx.set(pendingRef, { value: [...existing, reg], updatedAt: Date.now() })
  → 최상위 키: value (array), updatedAt (number)
  → 배열 내부 항목 필드는 rules에서 직접 접근 불가 (Firestore 규칙 한계)
  → 페이로드 제한 가능 범위: keys() 체크 + value.size() 상한

- rye-student-notices: setDoc(doc, { value: updated, updatedAt: Date.now() })
  → 동일 구조: value (array), updatedAt (number)
  → 공지 읽음 처리 배열; 실사용 최대 수백 건 → 1000 상한이 적절
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: rye-students / rye-teachers 읽기 권한을 이메일 사용자로 제한 (SEC-2)</name>
  <files>firestore.rules</files>
  <action>
firestore.rules에서 다음 두 규칙의 `allow read` 조건을 `isAuthenticated()`에서 `isEmailUser()`로 변경한다.

수정 1 — rye-students (라인 34-37):
```
// 수정 전
match /appData/rye-students {
  allow read:  if isAuthenticated();
  allow write: if isManagerOrAbove();
}

// 수정 후
// 학생 PII — 이메일 인증 사용자(스태프)만 읽기, 관리자 이상만 쓰기
// 익명(포털) 사용자는 앱 레벨에서 필터링되므로 직접 읽기 불필요
match /appData/rye-students {
  allow read:  if isEmailUser();
  allow write: if isManagerOrAbove();
}
```

수정 2 — rye-teachers (라인 40-43):
```
// 수정 전
match /appData/rye-teachers {
  allow read:  if isAuthenticated();
  allow write: if isManagerOrAbove();
}

// 수정 후
// 강사 PII — 이메일 인증 사용자(스태프)만 읽기, 관리자 이상만 쓰기
// 익명(포털) 사용자에게 강사 비밀번호 해시·연락처 노출 차단
match /appData/rye-teachers {
  allow read:  if isEmailUser();
  allow write: if isManagerOrAbove();
}
```

주의사항:
- 다른 컬렉션 규칙은 절대 건드리지 않는다
- rye-pending, rye-student-notices는 이 Task에서 수정하지 않는다 (Task 3에서 처리)
  </action>
  <verify>
    <automated>cd C:/Users/GIGABYTE/Coding/rye-k && grep -A3 "rye-students" firestore.rules | head -10</automated>
  </verify>
  <done>
- rye-students의 allow read가 `if isEmailUser()` 임
- rye-teachers의 allow read가 `if isEmailUser()` 임
- rye-students의 allow write는 여전히 `if isManagerOrAbove()` 임 (변경 없음)
  </done>
</task>

<task type="auto">
  <name>Task 2: rye-attendance 익명 쓰기 경로 제거 (SEC-4)</name>
  <files>firestore.rules</files>
  <action>
firestore.rules에서 rye-attendance의 `allow write` 규칙을 단순화한다.
익명 사용자의 size() 체크 기반 쓰기 경로를 제거하고 이메일 사용자만 허용.

수정 — rye-attendance (라인 52-58):
```
// 수정 전
match /appData/rye-attendance {
  allow read:  if isAuthenticated();
  allow write: if isEmailUser()
               || (isAuthenticated()
                   && request.resource.data.keys().hasAll(['value', 'updatedAt'])
                   && request.resource.data.value.size() >= resource.data.value.size());
}

// 수정 후
// 출석 기록 — 스태프(이메일 인증 사용자)만 읽기·쓰기
// 익명(포털) 사용자의 출석 쓰기 유스케이스 없음 — size() 체크 기반 쓰기 경로 제거
match /appData/rye-attendance {
  allow read:  if isAuthenticated();
  allow write: if isEmailUser();
}
```

주의사항:
- allow read는 isAuthenticated() 유지 (포털에서 강사가 본인 출석 조회 가능해야 함)
- allow write만 isEmailUser()로 단순화
- 기존 size() 체크 조건 전체 제거 (안전: 포털에서 출석 직접 쓰기 경로 없음)
  </action>
  <verify>
    <automated>cd C:/Users/GIGABYTE/Coding/rye-k && grep -A6 "rye-attendance" firestore.rules</automated>
  </verify>
  <done>
- rye-attendance의 allow write가 `if isEmailUser()` 단독임
- `size()` 체크 조건이 존재하지 않음
- allow read는 `if isAuthenticated()` 유지됨
  </done>
</task>

<task type="auto">
  <name>Task 3: rye-pending / rye-student-notices 페이로드 제한 추가 (SEC-3)</name>
  <files>firestore.rules</files>
  <action>
rye-pending과 rye-student-notices의 write 규칙에 페이로드 제한 조건을 추가한다.
포털 정상 경로는 통과하고, 과도한 페이로드 플러딩은 차단한다.

쓰기 데이터 구조 (PublicPortal.jsx에서 확인된 실제 패턴):
- rye-pending: { value: [...배열], updatedAt: number }
- rye-student-notices: { value: [...배열], updatedAt: number }
두 컬렉션 모두 동일한 최상위 구조이므로 동일한 패턴으로 제한한다.

수정 1 — rye-pending (라인 60-64):
```
// 수정 전
// 수강 등록 대기 — 인증된 모든 사용자 읽기·쓰기 (/register 폼)
match /appData/rye-pending {
  allow read:  if isAuthenticated();
  allow write: if isAuthenticated();
}

// 수정 후
// 수강 등록 대기 — 포털(익명) 수강 신청 허용, 페이로드 제한으로 플러딩 차단
// NOTE: 익명 쓰기 허용은 의도적 — PublicRegisterForm 수강 신청 경로
// SEC-3: 페이로드 제한 (필수 키 + 배열 크기 1000 이하)으로 DB 플러딩 차단
match /appData/rye-pending {
  allow read:  if isAuthenticated();
  allow write: if isAuthenticated() &&
    request.resource.data.keys().hasAll(['value', 'updatedAt']) &&
    request.resource.data.value.size() <= 1000;
}
```

수정 2 — rye-student-notices (라인 67-70):
```
// 수정 전
// 회원 공지 — 인증된 모든 사용자 읽기·쓰기 (포털 읽음 처리)
match /appData/rye-student-notices {
  allow read:  if isAuthenticated();
  allow write: if isAuthenticated();
}

// 수정 후
// 회원 공지 — 포털 공지 읽음 처리(updatedAt 갱신) 허용, 크기 제한으로 플러딩 차단
// NOTE: 익명 쓰기 허용은 의도적 — 포털에서 공지 읽음 처리 경로
// SEC-3: 배열 크기 1000 이하 제한으로 과도한 주입 차단
match /appData/rye-student-notices {
  allow read:  if isAuthenticated();
  allow write: if isAuthenticated() &&
    request.resource.data.keys().hasAll(['value', 'updatedAt']) &&
    request.resource.data.value.size() <= 1000;
}
```

검증 근거:
- 포털 정상 수강 신청: value 배열에 1건 추가 → 통과 (크기 << 1000)
- 포털 읽음 처리: 공지 목록 배열 갱신 → 통과 (공지 수 << 1000)
- 플러딩 공격: value.size() > 1000 → 차단

---

작업 완료 후 다음 안내를 SUMMARY에 포함한다:
"firestore.rules 수정 완료. 적용을 위해 Nick이 다음 명령 실행 필요:
`firebase deploy --only firestore:rules`
Cloudflare Pages 배포와 별개로 Firebase Console에서 직접 반영됨."
  </action>
  <verify>
    <automated>cd C:/Users/GIGABYTE/Coding/rye-k && grep -A7 "rye-pending" firestore.rules | head -10</automated>
  </verify>
  <done>
- rye-pending allow write에 `value.size() <= 1000` 조건 존재
- rye-pending allow write에 `keys().hasAll(['value', 'updatedAt'])` 조건 존재
- rye-student-notices allow write에 `value.size() <= 1000` 조건 존재
- 두 규칙 모두 `isAuthenticated()` 기반으로 포털 접근 유지됨
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| 익명 Firebase 사용자 → Firestore rye-students/rye-teachers | 포털 방문자가 인증 없이 PII 전체 읽기 가능했던 경로 |
| 익명 Firebase 사용자 → Firestore rye-attendance | size() 체크만으로 컨텐츠 무제한 주입 가능했던 경로 |
| 익명 Firebase 사용자 → Firestore rye-pending | 포털 등록 허용 경로 — 페이로드 제한으로 플러딩 완화 |
| 익명 Firebase 사용자 → Firestore rye-student-notices | 읽음 처리 허용 경로 — 페이로드 제한으로 플러딩 완화 |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-SEC01-03 | Information Disclosure | rye-students 익명 read | mitigate | allow read를 isEmailUser()로 변경 — 이 플랜에서 완료 |
| T-SEC01-04 | Information Disclosure | rye-teachers 익명 read | mitigate | allow read를 isEmailUser()로 변경 — 이 플랜에서 완료 |
| T-SEC01-05 | Tampering | rye-attendance 익명 write (size() 우회) | mitigate | allow write를 isEmailUser() 단독으로 단순화 — 이 플랜에서 완료 |
| T-SEC01-06 | Denial of Service | rye-pending 익명 무한 write | mitigate | 포털 등록 경로 허용 유지 + keys().hasAll() + value.size() <= 1000 제한으로 과도한 페이로드 차단 |
| T-SEC01-07 | Denial of Service | rye-student-notices 익명 무한 write | mitigate | 읽음 처리 경로 허용 유지 + keys().hasAll() + value.size() <= 1000 제한으로 과도한 페이로드 차단 |
</threat_model>

<verification>
```bash
# SEC-2: rye-students/rye-teachers read 권한 확인
grep -A3 "rye-students" firestore.rules
# 기대값: allow read: if isEmailUser();

grep -A3 "rye-teachers" firestore.rules
# 기대값: allow read: if isEmailUser();

# SEC-4: rye-attendance write 단순화 확인
grep -A5 "rye-attendance" firestore.rules
# 기대값: allow write: if isEmailUser(); (size() 조건 없음)

# SEC-3: rye-pending / rye-student-notices 페이로드 제한 확인
grep -A7 "rye-pending" firestore.rules
# 기대값: value.size() <= 1000 조건 포함

grep -A7 "rye-student-notices" firestore.rules
# 기대값: value.size() <= 1000 조건 포함

# isEmailUser() 함수 존재 확인
grep -n "isEmailUser" firestore.rules
# 기대값: 함수 정의 1건 + 사용 3건 이상

# firebase deploy (Nick이 직접 실행)
firebase deploy --only firestore:rules
```
</verification>

<success_criteria>
- rye-students allow read: `if isEmailUser()` (익명 차단)
- rye-teachers allow read: `if isEmailUser()` (익명 차단)
- rye-attendance allow write: `if isEmailUser()` 단독 (size() 체크 제거)
- rye-pending allow write: `isAuthenticated() && keys().hasAll(['value','updatedAt']) && value.size() <= 1000` (포털 경로 유지 + 페이로드 제한)
- rye-student-notices allow write: `isAuthenticated() && keys().hasAll(['value','updatedAt']) && value.size() <= 1000` (읽음 처리 유지 + 페이로드 제한)
- `npm run build` 통과 (firestore.rules는 클라이언트 번들에 포함되지 않으므로 빌드에 영향 없음)
- SUMMARY에 `firebase deploy --only firestore:rules` 실행 안내 포함
</success_criteria>

<output>
완료 후 `.planning/phases/SEC-01-security-quickwin/SEC-01-02-SUMMARY.md` 생성.
포함 내용:
- 변경된 규칙 목록 (SEC-2: rye-students/rye-teachers, SEC-3: rye-pending/rye-student-notices, SEC-4: rye-attendance)
- Nick 필수 액션: `firebase deploy --only firestore:rules` 실행 요청
</output>
