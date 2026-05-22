---
phase: BACKUP-01-auto-backup
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - .github/workflows/weekly-backup.yml
autonomous: true
requirements:
  - BACKUP-1

must_haves:
  truths:
    - "매주 월요일 09:00 KST에 Firestore 백업이 자동 실행된다"
    - "백업 파일이 Git 히스토리에 커밋으로 남아 추적 가능하다"
    - "수동으로도 workflow_dispatch 로 즉시 실행할 수 있다"
    - "백업 실패 시 GitHub Actions가 실패 상태로 표시된다"
  artifacts:
    - path: ".github/workflows/weekly-backup.yml"
      provides: "주간 자동 백업 GitHub Actions 워크플로우"
      contains: "cron: '0 0 * * 1'"
  key_links:
    - from: ".github/workflows/weekly-backup.yml"
      to: "scripts/backup-firestore.js"
      via: "npm run db:backup"
      pattern: "db:backup"
    - from: ".github/workflows/weekly-backup.yml"
      to: "backups/"
      via: "EndBug/add-and-commit@v9"
      pattern: "add-and-commit"
---

<objective>
GitHub Actions 워크플로우를 생성하여 매주 월요일 09:00 KST(00:00 UTC)에 Firestore 전체 백업을 자동 실행하고, 백업 파일을 Git에 커밋한다.

Purpose: 77명 학생 삭제, 레슨노트 전체 삭제 사고처럼 수동 백업이 6일 이상 공백이 생기는 상황을 방지한다. GitHub Actions가 자동으로 주간 스냅샷을 유지한다.

Output: `.github/workflows/weekly-backup.yml` — 스케줄 기반 자동 백업 워크플로우
</objective>

<execution_context>
@C:/Users/GIGABYTE/.claude/get-shit-done/workflows/execute-plan.md
@C:/Users/GIGABYTE/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/phases/BACKUP-01-auto-backup/BACKUP-01-02-PLAN.md

<!-- 백업 스크립트 핵심 사항 (executor가 별도 파일 탐색 없이 이해 가능하도록) -->
<interfaces>
<!-- scripts/backup-firestore.js 에서 추출한 핵심 동작 -->

인증 방식: Firebase Client SDK + signInAnonymously()
- Admin SDK / 서비스 계정 JSON 불필요
- firebaseConfig (apiKey 등) 이 스크립트에 하드코딩되어 있어 GitHub Actions에서 환경변수 없이도 실행 가능
- Firestore 보안 규칙: isAuthenticated() = 익명 포함 모든 Auth 사용자 허용

실행 명령: node scripts/backup-firestore.js (ESM, "type": "module")
npm 스크립트: "db:backup": "node scripts/backup-firestore.js"
출력 경로: backups/backup-YYYY-MM-DDTHH-mm-ss.json

의존성: firebase ^10.13.0 (package.json에 이미 존재)
Node.js 버전 요구사항: Node 18+ (ESM + Firebase v10)
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: GitHub Actions 주간 백업 워크플로우 생성</name>
  <files>.github/workflows/weekly-backup.yml</files>
  <action>
`.github/workflows/` 디렉토리를 생성하고 아래 내용으로 `weekly-backup.yml`을 작성한다.

**인증 방식 결정 근거:**
- `scripts/backup-firestore.js`는 Firebase Client SDK를 사용하고 `signInAnonymously()`로 인증한다
- `firebaseConfig`(apiKey, projectId 등)가 스크립트에 하드코딩되어 있다
- 따라서 GitHub Secrets에 별도 서비스 계정을 등록할 필요 없이 `npm run db:backup`을 그대로 실행할 수 있다
- `FIREBASE_SERVICE_ACCOUNT` 시크릿은 불필요 — 이 점을 주석으로 명기한다

**워크플로우 내용:**

```yaml
name: Weekly Firestore Backup

on:
  schedule:
    # 매주 월요일 00:00 UTC = 09:00 KST
    - cron: '0 0 * * 1'
  workflow_dispatch:
    # 수동 실행 허용 (GitHub Actions UI에서 "Run workflow" 클릭)

jobs:
  backup:
    name: Firestore Full Backup
    runs-on: ubuntu-latest

    permissions:
      contents: write   # backups/ 커밋을 위해 필요

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4
        with:
          token: ${{ secrets.GITHUB_TOKEN }}

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run Firestore backup
        # 인증: scripts/backup-firestore.js 는 Firebase Client SDK + signInAnonymously() 사용
        # 서비스 계정 JSON 불필요 — firebaseConfig 가 스크립트에 embed 되어 있음
        run: npm run db:backup

      - name: Validate backup file
        run: |
          BACKUP_FILE=$(ls -t backups/backup-*.json | head -1)
          if [ -z "$BACKUP_FILE" ]; then
            echo "ERROR: No backup file found"
            exit 1
          fi
          FILE_SIZE=$(wc -c < "$BACKUP_FILE")
          echo "Backup file: $BACKUP_FILE"
          echo "File size: $FILE_SIZE bytes"
          if [ "$FILE_SIZE" -lt 1000 ]; then
            echo "ERROR: Backup file too small (< 1KB), likely empty or failed"
            exit 1
          fi
          # 컬렉션 수 확인 (appData 키 개수)
          COLLECTION_COUNT=$(node -e "
            const fs = require('fs');
            const data = JSON.parse(fs.readFileSync('$BACKUP_FILE', 'utf8'));
            const keys = Object.keys(data.appData || {});
            console.log(keys.length);
          ")
          echo "Collections backed up: $COLLECTION_COUNT"
          if [ "$COLLECTION_COUNT" -lt 5 ]; then
            echo "ERROR: Too few collections ($COLLECTION_COUNT), backup may be incomplete"
            exit 1
          fi
          echo "Backup validation passed"

      - name: Commit backup to repository
        uses: EndBug/add-and-commit@v9
        with:
          add: 'backups/'
          message: 'chore(backup): weekly Firestore backup ${{ github.run_id }}'
          default_author: github_actions
          push: true
```

**주의사항:**
- `permissions: contents: write` 는 `GITHUB_TOKEN`으로 커밋하기 위해 필수. 없으면 403 에러 발생.
- Node.js 20 사용 (Firebase v10 + ESM 지원)
- `npm ci` 사용 (재현 가능한 빌드, `package-lock.json` 기준)
- validate 단계에서 파일 크기 < 1KB면 실패 처리 (빈 백업 방지)
- 컬렉션 수 < 5이면 실패 처리 (부분 백업 방지)
  </action>
  <verify>
    <automated>
      # 파일 존재 확인
      Test-Path ".github/workflows/weekly-backup.yml"
      
      # cron 스케줄 확인
      Select-String -Path ".github/workflows/weekly-backup.yml" -Pattern "cron: '0 0 \* \* 1'"
      
      # workflow_dispatch 확인
      Select-String -Path ".github/workflows/weekly-backup.yml" -Pattern "workflow_dispatch"
      
      # npm run db:backup 호출 확인
      Select-String -Path ".github/workflows/weekly-backup.yml" -Pattern "db:backup"
      
      # add-and-commit 확인
      Select-String -Path ".github/workflows/weekly-backup.yml" -Pattern "add-and-commit"
      
      # contents: write 권한 확인
      Select-String -Path ".github/workflows/weekly-backup.yml" -Pattern "contents: write"
    </automated>
  </verify>
  <done>
    - `.github/workflows/weekly-backup.yml` 파일이 존재한다
    - `cron: '0 0 * * 1'` 스케줄이 포함되어 있다 (매주 월요일 00:00 UTC)
    - `workflow_dispatch` 트리거가 포함되어 있다
    - `npm run db:backup` 실행 단계가 포함되어 있다
    - `EndBug/add-and-commit@v9` 으로 backups/ 를 커밋하는 단계가 포함되어 있다
    - `permissions: contents: write` 가 선언되어 있다
    - 백업 파일 유효성 검증 단계(크기, 컬렉션 수)가 포함되어 있다
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| GitHub Actions runner → Firebase | 익명 인증으로 Firestore 읽기 접근 |
| GitHub Actions → Git repository | GITHUB_TOKEN으로 backups/ 에 커밋 |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-BACKUP-01 | Information Disclosure | firebaseConfig in script | accept | Firebase Client SDK config는 공개 설계 (apiKey는 시크릿이 아님). Firestore 보안 규칙이 실제 접근 제어를 담당. |
| T-BACKUP-02 | Tampering | backups/ in git | accept | backups/는 append-only. 기존 백업 덮어쓰기 없이 날짜별 새 파일 생성. |
| T-BACKUP-03 | Denial of Service | workflow_dispatch 남용 | accept | 저장소는 private, 트리거 권한은 repository collaborator로 제한됨. |
| T-BACKUP-04 | Elevation of Privilege | GITHUB_TOKEN scope | mitigate | `permissions: contents: write` 만 선언하여 최소 권한 원칙 적용. |
</threat_model>

<verification>
워크플로우 파일 구조 검증:

```powershell
# 파일 존재
Test-Path "C:\Users\GIGABYTE\Coding\rye-k\.github\workflows\weekly-backup.yml"

# 필수 패턴 모두 존재
$content = Get-Content ".github/workflows/weekly-backup.yml" -Raw
$checks = @(
  "cron: '0 0 \* \* 1'",
  "workflow_dispatch",
  "db:backup",
  "add-and-commit",
  "contents: write",
  "node-version: '20'"
)
foreach ($check in $checks) {
  if ($content -match $check) { Write-Host "PASS: $check" }
  else { Write-Host "FAIL: $check" }
}
```

GitHub Actions UI 수동 검증 (Push 후):
1. GitHub 저장소 → Actions 탭
2. "Weekly Firestore Backup" 워크플로우 확인
3. "Run workflow" 버튼으로 수동 실행 테스트
4. 실행 완료 후 `backups/` 에 새 파일 커밋 확인
</verification>

<success_criteria>
- `.github/workflows/weekly-backup.yml` 파일이 저장소에 존재한다
- GitHub Actions UI에서 "Weekly Firestore Backup" 워크플로우가 인식된다
- `workflow_dispatch` 로 수동 실행 시 `backups/` 에 새 백업 파일이 커밋된다
- 스케줄: 매주 월요일 00:00 UTC(09:00 KST) 자동 실행
- 백업 파일이 비거나 너무 작으면 워크플로우가 실패 상태로 표시된다
</success_criteria>

<output>
완료 후 `.planning/phases/BACKUP-01-auto-backup/BACKUP-01-01-SUMMARY.md` 를 생성한다.

포함 내용:
- 생성된 파일 경로
- 인증 방식 결정 근거 (Client SDK + signInAnonymously, 서비스 계정 불필요 이유)
- 워크플로우 트리거 스펙 (cron 표현식, KST 변환)
- 유효성 검증 로직 요약
</output>
