---
phase: BACKUP-01-auto-backup
plan: 02
type: execute
wave: 1
depends_on: []
files_modified:
  - .planning/phases/BACKUP-01-auto-backup/BACKUP-01-CHECKLIST.md
autonomous: true
requirements:
  - BACKUP-2

must_haves:
  truths:
    - "Nick이 Firebase Console에서 PITR 활성화 여부를 확인할 수 있다"
    - "Nick이 Firebase Console에서 자동 백업 설정을 확인할 수 있다"
    - "GitHub Secrets 등록 방법이 문서화되어 있다 (향후 인증 방식 변경 시 참조용)"
    - "현재 백업 체계의 한계와 권장 보완 조치가 명확히 기술되어 있다"
  artifacts:
    - path: ".planning/phases/BACKUP-01-auto-backup/BACKUP-01-CHECKLIST.md"
      provides: "Firebase PITR/자동백업 확인 체크리스트 + GitHub Secrets 설정 가이드"
      contains: "Point-in-time recovery"
  key_links:
    - from: ".planning/phases/BACKUP-01-auto-backup/BACKUP-01-CHECKLIST.md"
      to: "Firebase Console"
      via: "체크리스트 링크"
      pattern: "console.firebase.google.com"
---

<objective>
Nick이 Firebase Console에서 직접 확인해야 하는 항목들(PITR, 자동 백업)을 체크리스트 문서로 작성한다. 또한 GitHub Actions 워크플로우의 현재 인증 방식과 향후 보안 강화 방법을 안내한다.

Purpose: CLAUDE.md에 "Firebase PITR: 7일" "Firebase 자동 백업: 매일 14일" 이라고 명시되어 있지만 실제 활성화 여부가 미확인 상태다. 이 문서는 Nick이 Firebase Console에서 1회성으로 확인/활성화할 수 있도록 정확한 경로와 체크리스트를 제공한다.

Output: `.planning/phases/BACKUP-01-auto-backup/BACKUP-01-CHECKLIST.md`
</objective>

<execution_context>
@C:/Users/GIGABYTE/.claude/get-shit-done/workflows/execute-plan.md
@C:/Users/GIGABYTE/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
<!-- 이 플랜은 외부 확인이 필요한 문서 생성이므로 코드베이스 참조 최소화 -->
<!-- Firebase 프로젝트 ID: rye-k-center (scripts/backup-firestore.js 에서 확인) -->
</context>

<tasks>

<task type="auto">
  <name>Task 1: Firebase PITR/자동백업 확인 체크리스트 문서 작성</name>
  <files>.planning/phases/BACKUP-01-auto-backup/BACKUP-01-CHECKLIST.md</files>
  <action>
아래 내용으로 체크리스트 문서를 작성한다. Nick이 실제로 클릭해서 확인할 수 있도록 Firebase Console 정확한 경로를 명시한다.

**문서 내용:**

```markdown
# BACKUP-01 체크리스트 — Firebase 백업 설정 확인

> 작성일: 2026-05-22
> 대상: Nick (관리자)
> 프로젝트: rye-k-center

이 체크리스트는 GitHub Actions 자동 백업(BACKUP-01-01) 외에
Firebase 플랫폼 수준의 백업 기능이 실제로 활성화되어 있는지
Nick이 직접 확인하기 위한 문서입니다.

---

## 1. Firebase PITR (Point-in-time Recovery) 확인

PITR이 활성화되면 지난 7일간의 데이터를 **1분 단위**로 복원할 수 있습니다.
77명 삭제 사고처럼 특정 시점으로 정확히 되돌리는 데 가장 강력한 도구입니다.

### 확인 경로

1. [Firebase Console](https://console.firebase.google.com/project/rye-k-center/firestore) 접속
2. 왼쪽 메뉴 → **Firestore Database**
3. 상단 탭 → **Backups** (또는 **Data** 탭 내 하위 메뉴)
4. **Point-in-time recovery** 섹션 확인

### 체크 항목

- [ ] PITR 상태: **Enabled** 인지 확인
  - Disabled 이면: "Enable" 버튼 클릭 → 활성화 (유료 플랜 필요)
- [ ] 보존 기간: **7일** 인지 확인
- [ ] 적용 대상 데이터베이스: `(default)` 인지 확인

### 비용 참고

- PITR은 Firebase Blaze(종량제) 플랜에서만 사용 가능
- Spark(무료) 플랜이면 Blaze로 업그레이드 필요
- 비용: 저장 데이터 GB당 소액 (rye-k 규모에서는 월 수백 원 수준)

---

## 2. Firebase 자동 백업 (Scheduled Backup) 확인

자동 백업은 PITR과 달리 전체 스냅샷을 Cloud Storage에 저장합니다.
더 긴 보존 기간과 외부 저장소 장점이 있습니다.

### 확인 경로

1. [Firebase Console](https://console.firebase.google.com/project/rye-k-center/firestore) 접속
2. **Firestore Database** → **Backups** 탭
3. **Scheduled backups** 섹션 확인

### 체크 항목

- [ ] 일별 백업 스케줄: **활성화** 여부 확인
  - 목표: 매일 실행, 14일 보존
- [ ] 주별 백업 스케줄: **활성화** 여부 확인
  - 목표: 매주 일요일, 30일 보존
- [ ] 백업 대상 Storage 버킷 확인 (gs://rye-k-center.appspot.com 등)
- [ ] 가장 최근 백업 완료 시각 확인 (정상 동작 검증)

### 활성화 방법 (미설정 시)

Firebase Console → Firestore → Backups → **Add schedule** 클릭:
- Frequency: Daily / Weekly 선택
- Retention: 14일 / 30일 입력
- Storage location: 기본값 사용

---

## 3. GitHub Actions 워크플로우 인증 방식 안내

### 현재 방식: Firebase Client SDK + 익명 인증

`scripts/backup-firestore.js` 는 Firebase **Client SDK** + `signInAnonymously()` 를 사용합니다.

- `firebaseConfig` (apiKey, projectId 등)이 스크립트에 포함되어 있음
- GitHub Secrets에 별도 서비스 계정 등록 **불필요**
- Firestore 보안 규칙에서 `isAuthenticated()` = 익명 포함 허용이기 때문에 읽기 가능

**따라서 현재 GitHub Actions 워크플로우는 추가 Secrets 없이 동작합니다.**

### (선택) 향후 Admin SDK로 전환 시

더 강력한 인증(Admin SDK + 서비스 계정)을 원한다면:

1. [Firebase Console → 프로젝트 설정 → 서비스 계정](https://console.firebase.google.com/project/rye-k-center/settings/serviceaccounts/adminsdk)
2. **새 비공개 키 생성** → JSON 다운로드
3. [GitHub → 저장소 Settings → Secrets → Actions](https://github.com/nickujung-art/rye-k/settings/secrets/actions)
4. **New repository secret** → Name: `FIREBASE_SERVICE_ACCOUNT`, Value: JSON 내용 전체 붙여넣기
5. `scripts/backup-firestore.js`를 Admin SDK 방식으로 재작성 필요

---

## 4. 현재 백업 체계 요약

| 구분 | 방식 | 주기 | 보존 | 상태 |
|------|------|------|------|------|
| GitHub Actions (신규) | Git 커밋 | 매주 월요일 | Git 히스토리 영구 | 활성 (이번 플랜) |
| 로컬 수동 백업 | npm run db:backup | 수동 | 로컬 파일 | 운영 중 |
| Firebase PITR | 플랫폼 내장 | 1분 단위 | 7일 | **확인 필요** |
| Firebase 자동 백업 | Cloud Storage | 매일/매주 | 14일/30일 | **확인 필요** |

---

## 5. 확인 완료 시 CLAUDE.md 업데이트

위 항목 확인 후 CLAUDE.md의 "DB 백업 체계" 섹션을 실제 활성화 상태로 업데이트하세요:

```
- **Firebase PITR**: [활성/비활성] — [활성 시] 7일 분 1분 단위 복원 가능
- **Firebase 자동 백업**: [활성/비활성] — [활성 시] 매일 14일 + 매주 일요일 30일 보관
- **GitHub Actions 자동 백업**: 매주 월요일 09:00 KST, backups/ 에 Git 커밋
```
```

**작성 완료 조건:**
- 파일이 존재한다
- "Point-in-time recovery" 텍스트가 포함되어 있다
- "console.firebase.google.com" URL이 포함되어 있다
- "GitHub" 및 "Secrets" 관련 안내가 포함되어 있다
  </action>
  <verify>
    <automated>
      # 파일 존재 확인
      Test-Path ".planning/phases/BACKUP-01-auto-backup/BACKUP-01-CHECKLIST.md"
      
      # Point-in-time recovery 텍스트 확인
      Select-String -Path ".planning/phases/BACKUP-01-auto-backup/BACKUP-01-CHECKLIST.md" -Pattern "Point-in-time recovery"
      
      # Firebase Console URL 확인
      Select-String -Path ".planning/phases/BACKUP-01-auto-backup/BACKUP-01-CHECKLIST.md" -Pattern "console.firebase.google.com"
      
      # Secrets 안내 확인
      Select-String -Path ".planning/phases/BACKUP-01-auto-backup/BACKUP-01-CHECKLIST.md" -Pattern "Secrets"
      
      # 체크박스 항목 존재 확인
      Select-String -Path ".planning/phases/BACKUP-01-auto-backup/BACKUP-01-CHECKLIST.md" -Pattern "\[ \]"
    </automated>
  </verify>
  <done>
    - `.planning/phases/BACKUP-01-auto-backup/BACKUP-01-CHECKLIST.md` 파일이 존재한다
    - Firebase PITR 확인 경로와 체크 항목이 포함되어 있다
    - Firebase 자동 백업 확인 경로와 체크 항목이 포함되어 있다
    - GitHub Secrets 등록 방법(선택 사항)이 포함되어 있다
    - 현재 백업 체계 요약 테이블이 포함되어 있다
    - Nick이 클릭 가능한 Firebase Console 직접 링크가 포함되어 있다
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| 문서 내 링크 → Firebase Console | 외부 서비스, Nick만 접근 가능 |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-BACKUP-05 | Information Disclosure | CHECKLIST.md의 프로젝트 ID | accept | `rye-k-center` 프로젝트 ID는 이미 소스코드에 공개되어 있음. 추가 노출 없음. |
| T-BACKUP-06 | Information Disclosure | 서비스 계정 JSON (향후 선택) | mitigate | 체크리스트에서 서비스 계정 JSON을 GitHub Secrets에만 저장하고 파일에 기록하지 말도록 명시함. |
</threat_model>

<verification>
문서 파일 구조 검증:

```powershell
# 파일 존재
Test-Path "C:\Users\GIGABYTE\Coding\rye-k\.planning\phases\BACKUP-01-auto-backup\BACKUP-01-CHECKLIST.md"

# 핵심 섹션 존재 확인
$content = Get-Content ".planning/phases/BACKUP-01-auto-backup/BACKUP-01-CHECKLIST.md" -Raw
$checks = @(
  "Point-in-time recovery",
  "console.firebase.google.com",
  "Secrets",
  "Scheduled"
)
foreach ($check in $checks) {
  if ($content -match $check) { Write-Host "PASS: $check" }
  else { Write-Host "FAIL: $check" }
}
```
</verification>

<success_criteria>
- BACKUP-01-CHECKLIST.md 파일이 존재한다
- Firebase PITR 확인 단계가 Firebase Console 정확한 경로와 함께 포함되어 있다
- Firebase 자동 백업 확인 단계가 포함되어 있다
- GitHub Secrets 등록 방법 안내가 포함되어 있다
- 현재 백업 체계 전체를 보여주는 요약 테이블이 포함되어 있다
- Nick이 확인 완료 후 CLAUDE.md를 업데이트할 수 있는 템플릿이 포함되어 있다
</success_criteria>

<output>
완료 후 `.planning/phases/BACKUP-01-auto-backup/BACKUP-01-02-SUMMARY.md` 를 생성한다.

포함 내용:
- 생성된 파일 경로
- 문서에 포함된 확인 항목 목록
- Nick이 취해야 할 다음 액션 (Firebase Console 확인)
</output>
