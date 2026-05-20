---
phase: QA-02-bugfix-critical
plan: "01"
type: execute
wave: 1
depends_on: []
files_modified:
  - firestore.rules
autonomous: false
db_risk: NONE
data_writes: false
requirements:
  - C2-attendance-anon-write
  - C3-instant-charges-anon-update

must_haves:
  truths:
    - "익명 사용자가 rye-attendance 전체를 빈 배열로 덮어쓸 수 없다"
    - "익명 사용자가 rye-instant-charges의 approved/amount 필드를 변경할 수 없다"
    - "포털 사용자(익명)는 여전히 rye-attendance에 댓글 추가(배열 증가)는 가능하다"
    - "강사/관리자(이메일 유저)는 기존과 동일하게 rye-attendance 전체 수정 가능"
    - "firestore.rules 배포 후 기존 데이터 변경 없음"
  artifacts:
    - path: "firestore.rules"
      provides: "익명 쓰기 제한 강화"
      contains: "request.resource.data.value.size() >= resource.data.value.size()"
  key_links:
    - from: "rye-attendance write rule"
      to: "isEmailUser() || (isAuthenticated() && size check)"
      via: "CEL expression: 익명은 배열 크기 유지(삭제 불가)만 허용"
      pattern: "size guard"
    - from: "rye-instant-charges update rule"
      to: "isEmailUser()"
      via: "isAuthenticated() → isEmailUser()"
      pattern: "privilege reduction"
---

<objective>
## Wave 1: Firestore 보안 규칙 수정

⚠️ DB 데이터 변경 없음. 규칙 파일만 수정 후 `firebase deploy --only firestore:rules` 배포.

### 수정할 2가지

**C2: rye-attendance 익명 전체덮어쓰기 차단**

현재: `allow write: if isAuthenticated();` → 익명 사용자가 `setDoc(ref, {value:[]})` 한 방에 전체 삭제 가능

수정: 이메일 유저는 기존대로, 익명 유저는 배열 크기가 줄어드는 쓰기만 차단.
- 포털 부모가 댓글 추가하는 경우: 배열 크기 유지 or 증가 → 허용
- 악의적 빈 배열 덮어쓰기: 배열 크기 감소 → 차단

**C3: rye-instant-charges update 익명 차단**

현재: `allow update: if isAuthenticated();` → 익명 사용자가 `approved:true`로 변경 가능

수정: `allow update: if isEmailUser();` (강사/관리자만)
단, `allow create: if isAuthenticated();` 유지 (강사가 즉시청구 생성 필요)
</objective>

<tasks>

<task type="human-execute">
  <name>Task 1: firestore.rules 수정</name>
  <read_first>
    - firestore.rules (전체)
  </read_first>
  <files>
    firestore.rules
  </files>
  <action>
**firestore.rules에서 아래 2개 블록 수정:**

**[수정 1] rye-attendance** (line 51-55 근처)

현재:
```
match /appData/rye-attendance {
  allow read:  if isAuthenticated();
  allow write: if isAuthenticated();
}
```

변경 후:
```
// 출석 기록 — 스태프 전체 쓰기, 익명(포털)은 배열 크기 유지·증가만 허용 (삭제 차단)
match /appData/rye-attendance {
  allow read:  if isAuthenticated();
  allow write: if isEmailUser()
               || (isAuthenticated()
                   && request.resource.data.keys().hasAll(['value', 'updatedAt'])
                   && request.resource.data.value.size() >= resource.data.value.size());
}
```

**[수정 2] rye-instant-charges** (line 144-152 근처)

현재:
```
match /rye-instant-charges/{docId} {
  allow read:   if isAuthenticated();
  allow create: if isAuthenticated();
  allow update: if isAuthenticated();
  allow delete: if isAdmin();
}
```

변경 후:
```
// 즉시 청구 — 생성은 스태프(강사 포함), 수정·삭제는 이메일 유저만
match /rye-instant-charges/{docId} {
  allow read:   if isAuthenticated();
  allow create: if isEmailUser();
  allow update: if isEmailUser();
  allow delete: if isAdmin();
}
```
  </action>
  <verify>
    <automated>grep -n "value.size\|isEmailUser" firestore.rules</automated>
  </verify>
  <acceptance_criteria>
    - firestore.rules에 `request.resource.data.value.size() >= resource.data.value.size()` 포함
    - rye-instant-charges update가 `isEmailUser()` 사용
    - rye-instant-charges create가 `isEmailUser()` 사용
  </acceptance_criteria>
</task>

<task type="human-execute">
  <name>Task 2: Firebase 규칙 배포</name>
  <action>
터미널에서 실행:
```bash
firebase deploy --only firestore:rules
```

⚠️ `npm run build`는 불필요. 규칙만 배포.
배포 완료 메시지 확인 후 다음 wave 진행.
  </action>
  <verify>
    Firebase Console → Firestore → Rules 탭에서 배포된 규칙 확인
  </verify>
  <acceptance_criteria>
    - Firebase Console에 수정된 규칙이 반영됨
    - 기존 Firestore 데이터 변경 없음 (규칙 변경은 데이터에 영향 없음)
  </acceptance_criteria>
</task>

</tasks>

<verification>
npm run build 불필요 (firestore.rules만 수정)
Firebase Console에서 규칙 배포 확인
포털에서 댓글 기능 동작 확인 (배열 크기 증가 쓰기이므로 허용)
</verification>

<success_criteria>
- rye-attendance: 익명 사용자의 배열 크기 감소 쓰기 차단
- rye-instant-charges: 익명 사용자의 update 차단
- 기존 강사·관리자·포털 기능 정상 동작
</success_criteria>
