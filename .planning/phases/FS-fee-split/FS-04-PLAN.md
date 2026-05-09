---
phase: FS-fee-split
plan: 04
type: execute
wave: 3
depends_on:
  - FS-02
  - FS-03
files_modified:
  - src/components/admin/AdminTools.jsx
  - src/App.jsx
autonomous: false
requirements:
  - FS-FEE-06

must_haves:
  truths:
    - "AdminTools CategoriesView에 '기존 학생 수강료 마이그레이션' 버튼이 존재한다"
    - "버튼 클릭 시 인라인 확인 UI(window.confirm 아님)가 표시된다"
    - "실행하면 모든 active/paused 학생의 lessons[]에 fee 필드가 설정된다"
    - "fee 설정 우선순위: 기존 lesson.fee > feePresets[instrument] > monthlyFee 균등분배"
    - "마이그레이션은 batchStudentDocs로 실행된다 (saveStudents 금지)"
    - "완료 후 몇 명이 업데이트되었는지 결과가 표시된다"
  artifacts:
    - path: "src/components/admin/AdminTools.jsx"
      provides: "마이그레이션 버튼 UI + 인라인 확인 + 진행 상태"
      contains: "마이그레이션"
  key_links:
    - from: "AdminTools CategoriesView 마이그레이션 버튼"
      to: "App.jsx batchStudentDocs"
      via: "onMigrateFeeSplit prop 콜백"
      pattern: "onMigrateFeeSplit"
---

<objective>
CategoriesView(AdminTools)에 기존 학생 데이터 일괄 마이그레이션 버튼을 추가하고, App.jsx에서 batchStudentDocs 기반 마이그레이션 로직을 연결한다.

Purpose: 이미 DB에 있는 학생 데이터(lesson.fee 없음)에 대해 feePresets 기반으로 fee를 채워주는 일회성 운영 작업을 안전하게 수행한다. Admin 전용, 인라인 확인 UI, batchStudentDocs 사용.

Output: AdminTools.jsx CategoriesView에 마이그레이션 UI 추가, App.jsx에 onMigrateFeeSplit 핸들러 연결
</objective>

<execution_context>
@C:\Users\GIGABYTE\.claude\get-shit-done\workflows\execute-plan.md
@C:\Users\GIGABYTE\.claude\get-shit-done\templates\summary.md
</execution_context>

<context>
@C:\Users\GIGABYTE\Coding\rye-k\src\components\admin\AdminTools.jsx
@C:\Users\GIGABYTE\Coding\rye-k\src\App.jsx
@C:\Users\GIGABYTE\Coding\rye-k\src\utils.js
@C:\Users\GIGABYTE\Coding\rye-k\CLAUDE.md

<interfaces>
<!-- CategoriesView 현재 시그니처 (AdminTools.jsx line 251) -->
export function CategoriesView({ categories, onSave, feePresets, onSaveFees })

<!-- App.jsx CategoriesView 렌더 (line 971) -->
{view === "categories" && user.role === "admin" && <CategoriesView
  categories={categories}
  onSave={async c => { await saveCategories(c); addLog("과목 카테고리 수정"); showToast("저장되었습니다."); }}
  feePresets={feePresets}
  onSaveFees={async f => { setFeePresets(f); try { await sSet("rye-fee-presets", f); showToast("저장되었습니다."); } catch { showToast("저장에 실패했습니다. 네트워크를 확인해주세요.", true); } }}
/>}

<!-- App.jsx batchStudentDocs (lines 465-477) -->
const batchStudentDocs = async (updates) => {
  // updates: Student[] (업데이트할 학생만 포함, id 필수)
  // Firestore runTransaction 기반
}

<!-- calcLessonFeeWithFallback (FS-01 추가) -->
// src/utils.js
export function calcLessonFeeWithFallback(lesson, feePresets, fallbackPerLesson = 0): number

<!-- 마이그레이션 로직 설명 -->
// 대상: students.filter(s => !s.isInstitution && (s.status === "active" || s.status === "paused"))
// 각 학생에 대해:
//   const lessons = s.lessons || []
//   if (lessons.length === 0) skip
//   const legacyPerLesson = Math.round((s.monthlyFee || 0) / lessons.length)
//   const updatedLessons = lessons.map(l => ({
//     ...l,
//     fee: l.fee != null && l.fee > 0 ? l.fee : (feePresets[l.instrument] || legacyPerLesson)
//   }))
//   if lessons changed → include in batch
// batchStudentDocs(changedStudents)
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: CategoriesView에 마이그레이션 버튼 UI 추가 + App.jsx 연결</name>
  <read_first>
    - src/components/admin/AdminTools.jsx (CategoriesView 함수 전체, lines 251~끝까지)
    - src/App.jsx (line 971 CategoriesView 렌더, lines 465-477 batchStudentDocs, line 4 import calcLessonFeeWithFallback 여부 확인)
    - src/utils.js (calcLessonFeeWithFallback export 확인)
  </read_first>
  <files>
    src/components/admin/AdminTools.jsx
    src/App.jsx
  </files>
  <action>
**AdminTools.jsx CategoriesView 수정:**

1. **CategoriesView props에 onMigrateFeeSplit 추가:**
```jsx
export function CategoriesView({ categories, onSave, feePresets, onSaveFees, onMigrateFeeSplit })
```

2. **CategoriesView 내부에 마이그레이션 state 추가 (기존 state 선언들 아래에):**
```js
const [migrateConfirm, setMigrateConfirm] = useState(false);
const [migrating, setMigrating] = useState(false);
const [migrateResult, setMigrateResult] = useState(null); // null | { updated: number, skipped: number }
```

3. **CategoriesView JSX 반환 블록 상단(또는 수강료 프리셋 섹션 아래)에 마이그레이션 카드 추가:**

```jsx
{/* ── 수강료 마이그레이션 (Admin 전용) ── */}
{onMigrateFeeSplit && (
  <div style={{ marginTop: 24, padding: "14px 16px", background: "var(--gold-lt)", border: "1.5px solid rgba(245,168,0,.3)", borderRadius: 12 }}>
    <div style={{ fontWeight: 700, fontSize: 13, color: "var(--gold-dk)", marginBottom: 4 }}>레슨별 수강료 마이그레이션</div>
    <div style={{ fontSize: 12, color: "var(--ink-60)", marginBottom: 10, lineHeight: 1.6 }}>
      기존 학생의 <code>monthlyFee</code>를 각 레슨의 <code>fee</code>로 분리합니다.
      feePresets에 등록된 악기는 해당 금액, 없으면 monthlyFee를 레슨 수로 균등 분배합니다.
      이미 fee가 설정된 레슨은 건너뜁니다.
    </div>
    {migrateResult && (
      <div style={{ fontSize: 12, color: "var(--green)", fontWeight: 600, marginBottom: 8 }}>
        완료: {migrateResult.updated}명 업데이트, {migrateResult.skipped}명 건너뜀
      </div>
    )}
    {!migrateConfirm ? (
      <button
        className="btn btn-secondary btn-sm"
        onClick={() => { setMigrateConfirm(true); setMigrateResult(null); }}
        disabled={migrating}
      >
        수강료 마이그레이션 실행
      </button>
    ) : (
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <span style={{ fontSize: 12, color: "var(--red)", fontWeight: 600 }}>
          재원·휴원 학생 전체에 적용됩니다. 계속하시겠습니까?
        </span>
        <button
          className="btn btn-sm"
          style={{ background: "var(--green)", color: "#fff", border: "none" }}
          onClick={async () => {
            setMigrating(true);
            try {
              const result = await onMigrateFeeSplit();
              setMigrateResult(result);
            } catch (e) {
              setMigrateResult({ updated: 0, skipped: 0, error: e.message });
            } finally {
              setMigrating(false);
              setMigrateConfirm(false);
            }
          }}
          disabled={migrating}
        >
          {migrating ? "실행 중…" : "확인 — 실행"}
        </button>
        <button
          className="btn btn-secondary btn-sm"
          onClick={() => setMigrateConfirm(false)}
          disabled={migrating}
        >
          취소
        </button>
      </div>
    )}
  </div>
)}
```

**App.jsx 수정 2곳:**

1. **import에 calcLessonFeeWithFallback 추가 (line 4):**
```js
import { calcAge, isMinor, getCat, fmtDate, fmtDateShort, fmtDateTime, uid, fmtPhone, fmtMoney, allLessonInsts, allLessonDays, canManageAll, monthLabel, generateStudentCode, getBirthPassword, getPhoneInitialPassword, instTypeLabel, expandInstitutionsToMembers, getContractDaysLeft, formatLessonNoteSummary, calcLessonFeeWithFallback } from "./utils.js";
```

2. **CategoriesView 렌더 줄에 onMigrateFeeSplit prop 추가:**

기존 CategoriesView 렌더 코드에 onMigrateFeeSplit 추가:
```jsx
{view === "categories" && user.role === "admin" && <CategoriesView
  categories={categories}
  onSave={async c => { await saveCategories(c); addLog("과목 카테고리 수정"); showToast("저장되었습니다."); }}
  feePresets={feePresets}
  onSaveFees={async f => { setFeePresets(f); try { await sSet("rye-fee-presets", f); showToast("저장되었습니다."); } catch { showToast("저장에 실패했습니다. 네트워크를 확인해주세요.", true); } }}
  onMigrateFeeSplit={async () => {
    const targets = students.filter(s =>
      !s.isInstitution &&
      (s.status === "active" || s.status === "paused") &&
      (s.lessons || []).length > 0
    );
    const toUpdate = [];
    let skipped = 0;
    for (const s of targets) {
      const lessons = s.lessons || [];
      const legacyPerLesson = Math.round((s.monthlyFee || 0) / lessons.length);
      const updatedLessons = lessons.map(l => ({
        ...l,
        fee: l.fee != null && l.fee > 0
          ? l.fee
          : calcLessonFeeWithFallback(l, feePresets, legacyPerLesson),
      }));
      const changed = updatedLessons.some((ul, i) => ul.fee !== (lessons[i].fee ?? 0));
      if (changed) {
        toUpdate.push({ ...s, lessons: updatedLessons });
      } else {
        skipped++;
      }
    }
    if (toUpdate.length > 0) {
      await batchStudentDocs(toUpdate);
      addLog(`수강료 마이그레이션 완료 — ${toUpdate.length}명 업데이트`);
      showToast(`${toUpdate.length}명 수강료 마이그레이션 완료`);
    }
    return { updated: toUpdate.length, skipped };
  }}
/>}
```

**주의사항:**
- `saveStudents` 절대 사용 금지 — `batchStudentDocs`만 사용
- `window.confirm` / `window.alert` 절대 사용 금지 — 인라인 확인 UI 사용
- `batchStudentDocs`는 App.jsx 내부 함수이므로 클로저로 직접 사용 가능
- 기존 CategoriesView의 카테고리/프리셋 수정 기능 건드리지 않음
  </action>
  <verify>
    <automated>cd /c/Users/GIGABYTE/Coding/rye-k && grep -n "onMigrateFeeSplit\|migrateConfirm\|migrating" src/components/admin/AdminTools.jsx | head -10 && grep -n "onMigrateFeeSplit\|calcLessonFeeWithFallback" src/App.jsx | head -10</automated>
  </verify>
  <acceptance_criteria>
    - AdminTools.jsx CategoriesView에 `onMigrateFeeSplit` prop 추가됨
    - AdminTools.jsx에 `migrateConfirm`, `migrating`, `migrateResult` state 존재
    - 마이그레이션 카드 JSX가 `onMigrateFeeSplit &&` 조건으로 렌더됨
    - 인라인 확인 UI 존재 (window.confirm 미사용)
    - App.jsx CategoriesView 렌더에 `onMigrateFeeSplit={async () => {...}}` prop 존재
    - App.jsx 마이그레이션 핸들러가 `batchStudentDocs` 사용
    - App.jsx 마이그레이션 핸들러에 `saveStudents` 호출 없음
    - App.jsx import에 `calcLessonFeeWithFallback` 포함
    - `window.confirm`/`window.alert` 미사용
    - npm run build 통과
  </acceptance_criteria>
  <done>관리자 → 카테고리 관리 화면에서 마이그레이션 버튼이 보이고 실행 시 batchStudentDocs로 안전하게 업데이트됨</done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <what-built>
    레슨별 수강료 분리 기능 전체 (FS-01~04):
    - utils.js: calcTotalFee, calcLessonFeeWithFallback 함수
    - LessonEditor: 과목별 fee 입력 UI
    - StudentFormModal: 합계 breakdown 표시, 저장 시 monthlyFee 파생 계산
    - PaymentsView: calcTotalFee 기반 autoFee, 상세 모달 breakdown, 인라인 fee 편집 제거
    - Dashboard: calcTotalFee 기반 미납 금액
    - CategoriesView: 마이그레이션 버튼 (인라인 확인 UI)
  </what-built>
  <how-to-verify>
    1. npm run dev 실행
    2. 관리자로 로그인
    3. 회원 관리 → 회원 등록:
       - 과목 선택 시 LessonEditor에 "수강료 (월)" 입력 필드가 과목별로 표시되는지 확인
       - feePresets에 등록된 악기 선택 시 수강료가 자동 입력되는지 확인
       - "월 수강료" 섹션이 과목별 breakdown + 합계로 표시되는지 확인
    4. 수납 관리 → 회원 클릭 → 상세 모달:
       - lessons[].fee 있는 회원의 경우 "과목별 수강료" breakdown이 표시되는지 확인
       - 수납 금액이 lessons[].fee 합산으로 계산되는지 확인
    5. 카테고리 관리 (관리자):
       - "레슨별 수강료 마이그레이션" 카드가 하단에 표시되는지 확인
       - "수강료 마이그레이션 실행" 버튼 클릭 → 인라인 확인 UI 표시 확인 (alert 팝업 없음)
       - "확인 — 실행" 클릭 후 완료 메시지 (N명 업데이트) 확인
    6. 마이그레이션 후 회원 수정 → 레슨 수강료 필드에 값이 채워졌는지 확인
    7. npm run build 통과 확인
  </how-to-verify>
  <resume-signal>문제 없으면 "approved" 입력. 이슈 발견 시 구체적인 증상 설명.</resume-signal>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| AdminTools 마이그레이션 버튼 → batchStudentDocs | 다수 학생 데이터 일괄 수정 |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-FS-04-01 | Tampering | 마이그레이션 일괄 수정 | mitigate | user.role === "admin" 조건으로 CategoriesView 접근 제한 (App.jsx line 971). batchStudentDocs는 runTransaction 기반으로 원자적 실행 |
| T-FS-04-02 | Elevation of Privilege | onMigrateFeeSplit prop | accept | App.jsx에서 admin role 체크 후 CategoriesView 렌더. 콜백 자체에 추가 role 체크는 중복이나 런타임 안전 |
</threat_model>

<verification>
npm run build 통과

수동 확인 (checkpoint:human-verify에서 진행):
- 마이그레이션 버튼 표시 및 인라인 확인 UI 동작
- 마이그레이션 실행 후 학생 lessons[].fee 값 설정 확인
- saveStudents 호출 없음 (console.error 미발생)
</verification>

<success_criteria>
- CategoriesView에 마이그레이션 카드 표시 (admin role 조건)
- 인라인 확인 UI (window.confirm 사용 안함)
- 마이그레이션 실행 시 batchStudentDocs 사용
- 완료 결과(업데이트 수, 건너뜀 수) 표시
- npm run build 통과
- 사람이 마이그레이션 결과를 브라우저에서 확인
</success_criteria>

<output>
완료 후 `.planning/phases/FS-fee-split/FS-04-SUMMARY.md` 생성
</output>
