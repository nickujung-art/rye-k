이 프로젝트는 **GSD 프레임워크**로 Phase 작업을 진행한다.

---

## 작업 규모별 워크플로우

| 규모 | 방법 |
|---|---|
| Phase급 (신규 기능·대규모 변경) | 아래 GSD 흐름 사용 |
| 소규모 버그·핫픽스·문서 수정 | 대화형 직접 수정 후 main 커밋 |

---

## Phase 작업 흐름 (GSD)

### A. 탐색

`/docs/` 하위 문서(PRD, ARCHITECTURE, ADR 등)와 `CLAUDE.md`를 읽고 프로젝트의 기획·아키텍처·설계 의도를 파악한다. 필요시 Explore 에이전트를 병렬로 사용한다.

### B. 논의

`/gsd-discuss-phase` — 구현을 위해 구체화하거나 기술적으로 결정해야 할 사항을 사용자와 논의한다.

### C. 계획

`/gsd-plan-phase` — `.planning/phases/{phase-name}/` 아래 PLAN.md를 생성한다.

PLAN.md 설계 원칙:

1. **Scope 최소화** — 하나의 plan에서 하나의 레이어 또는 모듈만 다룬다.
2. **자기완결성** — 각 PLAN.md는 독립된 세션에서 실행된다. 필요한 정보는 전부 파일 안에 적는다.
3. **사전 준비 강제** — 읽어야 할 문서 경로와 이전 plan에서 생성/수정된 파일 경로를 명시한다.
4. **시그니처 수준 지시** — 함수/클래스 인터페이스만 제시하고 구현은 에이전트 재량에 맡긴다. 단, 멱등성·보안·데이터 무결성 핵심 규칙은 반드시 명시한다.
5. **AC는 실행 가능한 커맨드** — `npm run build` 같은 실제 실행 가능한 검증 커맨드를 포함한다.
6. **주의사항은 구체적으로** — "조심해라" 대신 "X를 하지 마라. 이유: Y" 형식으로 적는다.

### D. 실행

`/gsd-execute-phase` — PLAN.md를 wave 단위로 병렬 실행한다.

### E. 검증

`/gsd-verify-work` 또는 `/gsd-code-review` — 완료 후 아키텍처·보안·데이터 무결성을 검증한다.

---

## Phase 산출물 위치

```
.planning/
└── phases/
    └── {phase-name}/
        ├── {phase}-{N}-PLAN.md     ← /gsd-plan-phase 생성
        ├── {phase}-{N}-SUMMARY.md  ← /gsd-execute-phase 완료 후 생성
        ├── {phase}-CONTEXT.md
        ├── {phase}-VERIFICATION.md
        └── {phase}-REVIEW.md
```

---

## CRITICAL 규칙 (항상 적용)

- `saveStudents([...])` 절대 금지 — per-op 트랜잭션만 사용
- `generateSeedData()`는 rye-attendance / rye-payments 절대 금지
- `window.confirm` / `window.alert` 절대 금지
- `git push`는 Nick 명시 요청 시만
- `releases.js` 변경은 Nick 승인 후 파일 반영
