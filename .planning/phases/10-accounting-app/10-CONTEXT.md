# Phase 10: 회계 앱 (Accounting App) — Context

**Gathered:** 2026-06-16  
**Status:** Ready for planning  
**Source:** 세션 내 심층 리서치 + Nick 결정사항

---

<domain>
## Phase Boundary

이 Phase는 RYE-K와 완전히 **별도의 앱**을 신규 구축한다.

- **결과물**: `rye-k-accounting` 신규 Git 리포지토리 + Cloudflare Pages 배포
- **URL**: `accounting.ryekorea.com`
- **범위**: 복식부기 원장, RYE-K 수납 연동, 은행 CSV 대사, 강사 급여, B2B 계산서, 세무사 전송, 더블체크 대시보드
- **제외**: webhook 기반 은행 연동(불안정), 홈택스 API 직접 연동(Phase 2+), SaaS 멀티테넌트(추후)

</domain>

<decisions>
## Implementation Decisions

### D-01 — 기술 스택 (LOCKED)
- Frontend: React 18 + Vite 5 + TypeScript (RYE-K와 동일 패턴)
- DB/Auth: Supabase (PostgreSQL 15 + Supabase Auth)
- Hosting: Cloudflare Pages (별도 프로젝트)
- Auth: Supabase Auth 독립 사용 (이메일/비밀번호) — Firebase Auth와 별도
- RYE-K 연동: Supabase Edge Function 폴링 (5분 간격, webhook 미사용)

### D-02 — 별도 앱 구조 (LOCKED)
- RYE-K 코드베이스와 완전 분리된 새 리포지토리
- Phase 1 (지금): 내부 전용 (Nick만 사용)
- Phase 2 (추후): SaaS 확장 — 멀티테넌트 구조는 처음부터 설계에 반영

### D-03 — Supabase 스키마 (LOCKED)
멀티테넌트 대비 `tenant_id` 컬럼 포함. RLS로 격리.

핵심 테이블:
- `tenants` — 학원 단위 (Phase 1: RYE-K 1개)
- `tenant_members` — 사용자-테넌트 매핑 (role: owner/admin/accountant/viewer)
- `accounts` — 계정과목 마스터 (is_system 기본 26개 + 커스텀)
- `journal_entries` — 분개 헤더 (status: draft/posted/void, source_type/source_id 멱등성)
- `journal_lines` — 복식부기 라인 (debit/credit, amount BIGINT 원 단위)
- `bank_imports` — 은행 CSV 업로드 배치
- `bank_transactions` — 개별 은행 거래 (status: unmatched/matched/rule_applied/manual/ignored)
- `bank_rules` — 자동 분류 규칙 (conditions JSONB, priority)
- `payroll_records` — 강사 급여 명세 (business_income 3.3% / employment_income)
- `invoices` — B2B 계산서 이력 (hometax_issued 플래그)
- `recurring_templates` — 반복 전표 템플릿
- `ryek_sync_log` — RYE-K 폴링 이력
- `tax_exports` — 세무사 전송 이력

트리거: `journal_entries.status` draft→posted 전환 시 차대변 균형 검증

### D-04 — 계정과목 체계 (LOCKED)
학원 특화 사전 구성 (기본 26개, is_system=true):

```
1010 현금 / 1020 보통예금 / 1030 당좌예금
1100 미수수강료 (AR) / 1200 선급비용
2100 선수수강료 (Deferred Revenue) / 2200 미지급금 / 2300 미지급급여 / 2400 예수원천세
3000 자본금 / 3100 이익잉여금
4100 개인 수강료 수입 / 4200 그룹 수강료 수입 / 4300 기관수업료 수입 / 4400 교재 판매 수입 / 4900 기타 수입
5100 강사료(사업소득) / 5110 강사급여(근로소득) / 5120 원천세납부
5200 임차료 / 5300 교재비 / 5400 마케팅비 / 5500 보험료 / 5600 소모품비 / 5700 통신비 / 5800 수수료 / 5900 기타경비
```

### D-05 — RYE-K 수납 연동 방식 (LOCKED)
- **방식**: Supabase Edge Function 폴링 (5분 간격) — webhook 불안정 문제 없음
- **대상**: RYE-K Firebase `appData/rye-payments` 문서에서 status=confirmed 항목
- **멱등성**: `journal_entries(tenant_id, source_type='ryek_payment', source_id)` UNIQUE 제약
- **전표 타입**: 수납 → 차) 1020 보통예금 / 대) 4100~4300 수강료 수입 (자동 분류)
- **수동 확인**: 자동 생성은 draft, 사용자가 "확인" 후 posted

### D-06 — 은행 대사 방식 (LOCKED)
- **Phase 1**: CSV 업로드만 (안정성 최우선, 모든 은행 지원)
- **Phase 2**: 금융결제원 오픈뱅킹 API (2025년부터 법인 지원)
- 지원 은행 파서: 카카오뱅크, 신한, 국민, 우리, 기업은행 (CSV 컬럼 매핑)
- Bank Rules: conditions JSONB [{field: 'description', op: 'contains', value: '임대료'}]
- 3상태: unmatched → matched(기존전표매칭) / rule_applied(규칙자동) / manual(수동배정)

### D-07 — 강사 급여 & 원천세 (LOCKED)
- 사업소득: gross × 3.3% = 원천세, net = gross - 원천세
- 근로소득: 간이세액표 적용 (Phase 1은 수동 입력, 자동화 추후)
- 전표: 차) 5100 강사료 gross / 대) 1020 보통예금 net + 대) 2400 예수원천세 withholding
- 월별 원천세 집계 → 세무사 전송 포함

### D-08 — B2B 계산서 (LOCKED)
- **Phase 1 무료 방식**: 앱에서 계산서 내용 작성 → 홈택스 발행 링크 안내 → 발행 완료 후 앱에서 기록
- RYE-K `institutions` 데이터 연동하여 기관 정보 자동 입력
- `invoices.hometax_issued = true` + `hometax_issued_at` 기록
- **Phase 2**: 팝빌 API 200원/건 연동 (B2B 계약 건수 늘어날 때)

### D-09 — 세금 신고 범위 (LOCKED)
- **범위**: 데이터 정리 + 세무사 자동 전송만
- 자동 전송 내용: 월별 손익계산서 PDF + 강사 원천세 집계 + 지출 내역
- 전송 방법: 이메일 자동 발송 (매월 설정일) + 수동 발송 버튼
- 홈택스 신고 자동화: Phase 2+ (팝빌 API)

### D-10 — UI 원칙 (LOCKED)
- **Mobile First**: 375px 기준 설계 → 확장
- 네비게이션: 하단 탭바(모바일) / 좌측 사이드바(데스크탑)
- FAB(Floating Action Button): 전표 빠른 입력
- 색상: 수입=파란계열, 지출=회색, 미수금=주황, 대사완료=초록, 오류=빨강
- 금액 포맷: 한국식 천 단위 콤마, 원(₩) 단위
- 다크모드 지원 (RYE-K와 통일)

### D-11 — 더블체크 대시보드 (LOCKED)
- RYE-K 수납 집계(월별) vs 회계 원장 집계(월별) 나란히 표시
- 차이 발생 시 빨간 경고 + 드릴다운 링크
- 수납률 vs 실제 입금률 비교 차트

### Claude's Discretion
- 컴포넌트 내부 구조 및 파일 분할 방식
- 차트 라이브러리 선택 (recharts 권장, RYE-K 참고)
- Supabase 클라이언트 초기화 패턴 (singleton)
- CSS 방식 (RYE-K 스타일 CSS-in-JS 문자열 or Tailwind — 새 프로젝트이므로 Tailwind 고려)
- Edge Function 스케줄러 구현 방식 (pg_cron or Deno cron)
- PDF 생성 라이브러리 (jsPDF, react-pdf 등)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### RYE-K 현재 코드베이스 패턴 (참조용)
- `src/App.jsx` — Firebase 초기화 패턴, 상태 관리 구조
- `src/firebase.js` — Firebase 초기화 + runTransaction export 패턴
- `src/constants.jsx` — CSS 문자열 + 아이콘 패턴 (새 앱에서 참조)
- `src/components/payment/PaymentsView.jsx` — 수납 데이터 구조 참조

### Supabase 공식 문서 (planning 시 참조)
- Supabase Row Level Security: `supabase.com/docs/guides/database/postgres/row-level-security`
- Supabase Edge Functions: `supabase.com/docs/guides/functions`
- Supabase Auth (이메일): `supabase.com/docs/guides/auth/quickstarts/react`

### 기획 문서 (이 세션에서 확정)
- 전체 스키마: 이 CONTEXT.md D-03 참조
- 계정과목: 이 CONTEXT.md D-04 참조
- Phase 로드맵: `.planning/ROADMAP.md` Phase 10 섹션

</canonical_refs>

<specifics>
## Specific Ideas

### 프로젝트 폴더 구조 (확정)
```
rye-k-accounting/         ← 별도 Git 리포지토리
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── supabase.ts
│   ├── types/database.ts  ← Supabase CLI 자동 생성
│   ├── constants/
│   │   ├── accounts.ts    ← 기본 계정과목 데이터
│   │   └── banks.ts       ← CSV 파서 설정
│   ├── hooks/
│   │   ├── useAuth.ts / useTenant.ts / useJournals.ts
│   │   ├── useBankImport.ts / usePayroll.ts / useReports.ts
│   ├── lib/
│   │   ├── journalEngine.ts    ← 분개 생성 순수 함수
│   │   ├── bankRuleEngine.ts   ← Bank Rules 매칭
│   │   ├── bankCsvParser.ts    ← CSV 파싱 (은행별)
│   │   ├── payrollCalc.ts      ← 원천세 계산
│   │   └── reportEngine.ts     ← 손익/원장 집계
│   ├── components/
│   │   ├── layout/ (BottomNav, SideNav, Header)
│   │   └── shared/CommonUI.tsx
│   └── views/
│       ├── auth/LoginView.tsx
│       ├── DashboardView.tsx
│       ├── journal/ (JournalListView, QuickExpenseView)
│       ├── bank/ (BankImportView, BankReconcileView)
│       ├── payroll/PayrollView.tsx
│       ├── invoices/InvoiceView.tsx
│       └── reports/ (ProfitLossView, LedgerView)
├── supabase/
│   ├── migrations/20260616_001_initial_schema.sql
│   ├── functions/ryek-sync/ ← Edge Function 폴링
│   └── seed.sql
├── .env.local
├── package.json
└── vite.config.ts
```

### 핵심 SQL 트리거 (복식부기 균형 검증)
```sql
CREATE OR REPLACE FUNCTION validate_journal_balance()
RETURNS TRIGGER AS $$
DECLARE v_debit BIGINT; v_credit BIGINT;
BEGIN
  IF NEW.status = 'posted' AND (OLD.status IS NULL OR OLD.status = 'draft') THEN
    SELECT
      COALESCE(SUM(CASE WHEN side='debit' THEN amount ELSE 0 END),0),
      COALESCE(SUM(CASE WHEN side='credit' THEN amount ELSE 0 END),0)
    INTO v_debit, v_credit FROM journal_lines WHERE journal_entry_id=NEW.id;
    IF v_debit=0 AND v_credit=0 THEN RAISE EXCEPTION '전표 %에 라인 없음', NEW.id; END IF;
    IF v_debit!=v_credit THEN RAISE EXCEPTION '불균형: 차변=% 대변=%', v_debit, v_credit; END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER trg_journal_balance BEFORE UPDATE ON journal_entries FOR EACH ROW EXECUTE FUNCTION validate_journal_balance();
```

### RYE-K 수납 폴링 Edge Function 핵심 로직
```typescript
// supabase/functions/ryek-sync/index.ts
// 1. Firebase Admin SDK로 rye-payments 문서 조회
// 2. status='confirmed' 항목 필터
// 3. journal_entries에 INSERT ... ON CONFLICT (tenant_id, source_type, source_id) DO NOTHING
// 4. 성공 건수 ryek_sync_log에 기록
```

### 한국 학원 세금 특이사항 (플래너 참고)
- 학원 = 부가가치세 면세사업자 → VAT 없음
- 면세사업장 현황신고: 매년 2월 10일 (데이터 제공만, 신고는 세무사)
- 종합소득세: 매년 5월 31일
- 원천세: 강사 지급 익월 10일 신고·납부 (사업소득 3.3%)
- 현금영수증: 수강료 30만원 이상 의무 발급

</specifics>

<deferred>
## Deferred (명시적 제외)

- **오픈뱅킹 API 실시간 연동** → Phase 2 (금융결제원 법인 API)
- **팝빌 전자계산서 API** → Phase 2 (B2B 건수 증가 시, 건당 200원)
- **홈택스 세금 신고 자동화** → Phase 2+ (팝빌 API 연동)
- **SaaS 멀티테넌트 온보딩** → 별도 마일스톤 (테넌트 구조는 처음부터 설계에 포함)
- **네이티브 모바일 앱** → 추후 (웹 반응형으로 시작)
- **재무상태표(Balance Sheet)** → Phase 2 (손익계산서 먼저)
- **근로소득 간이세액표 자동화** → Phase 2 (Phase 1은 수동 입력)
- **현금흐름표** → Phase 2

</deferred>

---

*Phase: 10-accounting-app*  
*Context gathered: 2026-06-16 via deep research session*
