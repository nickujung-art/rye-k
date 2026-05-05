# Feature Landscape

**Domain:** Korean music academy (국악 학원) management PWA — student/parent portal, analytics, AI
**Researched:** 2026-05-05
**Confidence:** MEDIUM-HIGH (codebase analysis: HIGH; Korean edu-app market patterns: MEDIUM based on domain knowledge)

---

## Current State Audit

Before mapping the target feature landscape, this is what already exists in the codebase:

| Feature | File | Completeness |
|---------|------|-------------|
| Student portal login (code + birthdate 2-step) | PublicPortal.jsx | ~80% — works, but session doesn't survive refresh reliably |
| Attendance calendar (monthly view, heatmap) | PublicPortal.jsx | ~85% — calendar is solid, 26-week heatmap exists |
| Lesson notes visible in portal | PublicPortal.jsx | ~70% — shows notes, but no practice guide delivery |
| Notice/announcement portal | PublicPortal.jsx | ~75% — bottom sheet, read tracking works |
| Sibling/multi-child portal switching | PublicPortal.jsx | ~80% — modal exists |
| Payment status in portal | PublicPortal.jsx | ~50% — monthlyFee=0 across all students kills this |
| Admin analytics view | AnalyticsView.jsx | ~75% — bar charts, referral, age distribution, revenue trends |
| Churn risk widget | ChurnWidget.jsx | ~70% — scoring exists, widget on dashboard |
| AI monthly report generation | functions/api/ai/monthly-report.js | ~90% — server-side complete, UI delivery to parents missing |
| AI churn analysis (comment generation) | functions/api/ai/churn.js | ~80% — generates advice, not wired to send action |
| AI natural language query | functions/api/ai/query.js | ~80% — 10 function schemas, UI is basic |
| AI practice guide | functions/api/ai/practice-guide.js | ~90% — server complete, portal display missing |
| KakaoTalk notification | AlimtalkModal (referenced) | ~20% — modal skeleton, no real API wired |
| Payment automation (bank matching) | Not started | 0% |
| Firestore security rules | Not started | 0% |

---

## Table Stakes

Features where absence causes users to abandon or distrust the product. For this milestone's three pillars (portal, analytics, AI), these are the must-haves.

### Portal — Table Stakes

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Session persistence across browser close | Korean parents share phones/tablets with children; losing session on every close is unusable | Low | Fix localStorage sessionStorage logic; no new architecture |
| Timetable / 시간표 view | Every Korean hagwon app shows the student's weekly schedule. Parents check "what day, what time" constantly | Medium | Needs to read lessons[].schedule from student data; already fetched |
| Monthly attendance summary with percentage | Parents expect a single number: "이번 달 출석률 83%". The calendar exists; the summary header is partially built | Low | Already animated in portal, but needs to survive all edge cases |
| Payment status for current month | "수납 완료/미납" — parents check this obsessively in Korean hagwon apps | Medium | Blocked by monthlyFee=0 data debt. Needs fee data entry first OR show status without amount |
| Lesson note delivery to portal | Parents pay for progress visibility. A note written by the teacher that never reaches the parent is wasted | Low | AI monthly report Worker exists. Direct per-lesson note visibility in portal needs wiring |
| KakaoTalk notification for absence | In Korea, KakaoTalk has ~95%+ smartphone penetration. Parents expect absence notification via KakaoTalk, not email or push | High | AlimtalkModal exists. Real biztalk API needs wiring + business channel approval |
| Practice guide per lesson note | Students/parents need "what to practice at home" after each lesson. The Worker exists; it needs to be surfaced | Low | practice-guide.js Worker is complete. Portal just needs a display panel |

### Analytics — Table Stakes

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Monthly revenue total (원장용) | Academy owner's single most important number each month | Low | Already computed in AnalyticsView; monthlyFee=0 data debt is the blocker |
| Unpaid student list with count | "미납 {N}명" at a glance — owner checks this weekly | Low | Logic exists in AnalyticsView; needs promotion to a dedicated "urgent" widget |
| Attendance rate by teacher | Teachers want to know their own students' attendance trends | Low | Already in AnalyticsView (teacher att rows) |
| Attendance rate by student (individual trend) | Teachers want to spot declining attendance early, not just churn risk | Medium | Per-student 4-week trend exists in churn scoring logic; needs teacher-facing surface |
| Monthly parent report (학부모 월간 리포트) | Premium Korean tutoring apps (클래스팅, 아이캔두) always send a monthly report. Parents of music students especially expect progress documentation | High | monthly-report.js Worker is complete. The gap is the delivery UI: generate → preview → send (KakaoTalk or portal notification) |

### AI — Table Stakes

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| AI lesson note quality: Korean traditional music terminology | The existing prompts already handle 가야금/해금/대금/산조/농현 terminology. This must stay correct and not regress | Low | Already implemented well in lesson-note.js and monthly-report.js |
| AI query: natural language for admin must return structured data, not free text | Admin users expect "이번달 미납 회원 누구야?" to return a list, not a paragraph | Low | query.js + queryFunctions.js architecture is correct; coverage of 10 function types needs expansion |
| Churn alert must be actionable (message draft) | Knowing someone is at risk is only valuable if there is an immediate "send care message" action | Medium | churn.js generates advice JSON. Gap: the "draft message → send KakaoTalk" flow is not connected |

---

## Differentiators

Features that make RYE-K's portal meaningfully better than generic Korean hagwon apps (학원나우, 클래스팅 basic).

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| AI-generated monthly report with 국악 domain vocabulary | Generic apps send attendance reports. RYE-K sends a substantive learning narrative using 산조, 농현, 진양조 — parents feel their child's progress is truly documented | High | Worker complete. UI delivery is the remaining work. This is RYE-K's strongest differentiator. |
| Practice guide pushed to portal per lesson | Most academy apps stop at "today's lesson summary." RYE-K can push "what to practice this week" directly to the student. This extends the teacher's value beyond the classroom | Medium | practice-guide.js Worker is complete. Portal needs a 練習 (練習 guide) panel wired to it |
| Churn prediction + care message draft in one click | Academy management apps offer attendance graphs. RYE-K can say "this student shows 3 consecutive absences — here's a warm KakaoTalk message to send them." This is genuinely novel | High | Requires churn scoring (done) + message draft AI (done) + KakaoTalk send (not done) |
| KakaoTalk as the notification layer (not email/push) | Korean parents do not check email for school notifications. They check KakaoTalk. Apps that use KakaoTalk feel "native" to Korean parents in a way that email never will | High | Requires KakaoTalk Biz channel setup (admin prep) + API integration |
| Multi-child household portal | One phone, multiple siblings at the academy. Portal already has sibling switching. This is rare in generic hagwon apps | Low | Already ~80% done; just needs UX polish and reliable session |
| Adult learner vs. parent distinction in monthly report | The existing monthly report AI already distinguishes adult_self vs. parent audience, adjusting honorifics and tone. No competitor does this in Korean music education | Low | Already implemented in monthly-report.js; just needs the portal delivery UI |
| 26-week attendance heatmap | GitHub-style contribution graph for attendance. Visually striking, rare in Korean hagwon apps. Shows parents the big picture, not just this month | Low | Already implemented in portal; keep it |
| B2B institution class attendance report | Schools and community centers that contract with RYE-K can see their class attendance without accessing the full admin panel | High | Institutions exist in data model; a stripped portal view for B2B contacts is feasible but out of current milestone scope |

---

## Anti-Features

Things to deliberately NOT build in this milestone, with rationale.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| In-app payment (PG 결제) | Requires business registration, PG contract (Toss/Kakao Pay), legal compliance. Time cost is enormous relative to benefit for a single-academy app | Bank transfer notification matching (already planned) + manual confirmation in admin |
| FCM push notifications | Requires Google Firebase Cloud Messaging project setup, iOS/Android app review, platform-specific permission flows. Adds weeks of work | Use KakaoTalk AlimTalk as the notification layer — 95%+ Korean parent reach with no device permissions needed |
| Student-initiated schedule change request | Self-service reschedule is a UX rabbit hole: conflict detection, teacher approval, replacement slot allocation. Endless edge cases | Admin-side schedule override (already exists) is sufficient; verbal/KakaoTalk reschedule is the Korean norm |
| In-portal messaging thread (학원 쪽지) | Chat features require moderation, storage, real-time infra. Lesson note comments already provide teacher-parent communication | KakaoTalk direct message is how Korean parents communicate with teachers; do not replicate it in-app |
| Video lesson recording storage | Requires CDN, storage costs, upload UI, privacy compliance. Completely outside current scope | Out of scope entirely |
| TypeScript migration in this milestone | Migration would touch every file; risk of breakage on a live production system with 77 students is not justified | Complete feature work first; TypeScript is a future milestone decision |
| "Star student" gamification (badges, ranks) | Gamification in Korean music education is culturally incongruous for traditional/classical music context (국악 is serious/formal) | Monthly narrative report (AI-generated) is the appropriate recognition channel |
| Firestore subcollection migration | Current single-document-per-collection pattern will only hit 1MB limit at ~5,000+ attendance records. RYE-K has ~77 students; this is not urgent | Monitor document sizes; migrate only when documents approach 800KB |
| SaaS / multi-tenant architecture | Premature generalization. RYE-K single-academy completion is the prerequisite | Milestone beyond this one |
| OpenAI as fallback AI provider | Gemini 2.5 Flash is cost-effective and has sufficient Korean language quality. Adding provider fallback adds complexity for no current benefit | Stick with Gemini; add provider abstraction only if quality problems emerge |

---

## Feature Dependencies

```
monthlyFee data entry / correction
  └── payment status in portal (shows "0원" otherwise)
  └── revenue analytics accuracy
  └── unpaid reminder KakaoTalk message (amount would be wrong)

KakaoTalk BizChannel account setup (admin, not code)
  └── absence auto-notification
  └── payment reminder auto-notification
  └── schedule change notification
  └── care message send from churn alert
  └── monthly report delivery via KakaoTalk

monthly-report.js Worker (already complete)
  └── portal: monthly report tab / panel
  └── teacher UI: generate → preview → confirm → deliver

session persistence fix
  └── portal usability on mobile (parents give up on login loops)
  └── reliable auto-login on returning visit

churn scoring (already complete in ChurnWidget)
  └── churn AI comment generation (already complete in churn.js)
  └── care message draft UI (missing)
  └── KakaoTalk send action (blocked on KakaoTalk setup)

payment data entry (monthlyFee per student)
  └── everything payment-related
```

---

## MVP Recommendation for This Milestone

Given the dependencies above and the fact that KakaoTalk business channel setup is an admin task (not code), the milestone should sequence work in this order:

**Phase A — Portal completeness (unblocked)**
1. Session persistence fix (low effort, high pain removal)
2. Timetable view in portal (low effort, table stakes)
3. Practice guide panel in portal (Worker is done; just wire UI)
4. Monthly report delivery panel in portal (Worker is done; just wire UI)

**Phase B — Analytics completeness (unblocked)**
1. Unpaid student list as urgent widget in admin dashboard
2. Revenue dashboard upgrade (monthly trend already exists; make it the hero element)
3. Teacher view: per-student 4-week attendance trend
4. AI query expansion: add 3-5 more natural language patterns

**Phase C — Payment data and KakaoTalk (admin-dependency)**
1. Bulk monthlyFee entry UI (prerequisite for all payment features)
2. KakaoTalk API wiring (prerequisite for all notification features)
3. Absence auto-notification via KakaoTalk
4. Unpaid reminder message
5. Churn care message → KakaoTalk flow

**Defer from this milestone:**
- B2B institution portal: no current demand signal from Nick
- Real-time teacher performance ranking: sensitive; discuss with Nick before building
- Student-side self-enrollment changes: approval workflow complexity

---

## Korean Education App Context Notes

Based on domain knowledge of Korean hagwon app ecosystem:

**KakaoTalk is the notification standard.** Apps like 클래스팅, 아이캔두, 학원나우 all integrate KakaoTalk AlimTalk. Parents routinely ignore email and app push; KakaoTalk messages are opened within minutes. For RYE-K, this is not optional if the notification features are to have real-world impact.

**Parents expect monthly paper-equivalent reports.** Korean education culture places high value on documented progress. Private music lesson parents — especially for 국악 which is perceived as culturally serious — expect a written summary of what their child learned. The AI monthly report feature directly addresses this expectation.

**Mobile-first is non-negotiable for the portal.** The admin panel can be tablet/desktop-tolerant. The parent/student portal will be accessed almost exclusively from a smartphone in Korea. Every portal interaction must work on a 375px viewport one-handed.

**Attendance percentage is the currency of parent communication.** "출석률 몇 %예요?" is the first thing Korean parents ask. The animated rate already in the portal is the right instinct; make it prominent.

**Payment confirmation by parents is expected.** Korean hagwon parents expect to be able to confirm their monthly fee payment from the portal. The current monthlyFee=0 data state blocks this; it is the single biggest data debt blocking portal quality.

**AI features require explicit consent disclosure.** The registration form already has an AI consent checkbox. This is correct and should be preserved. Do not silently use student names/lesson content in AI calls without that consent flag being checked.

---

## Confidence Assessment

| Area | Confidence | Reason |
|------|------------|--------|
| Portal features | HIGH | Direct codebase analysis; gaps clearly visible |
| Analytics features | HIGH | AnalyticsView.jsx fully read; gaps identified |
| AI feature gaps | HIGH | All 7 Worker files analyzed; server-side vs. UI gaps clear |
| KakaoTalk patterns | MEDIUM | Korean market domain knowledge; no direct API docs verified |
| Korean parent expectations | MEDIUM | Domain knowledge of 한국 학원 앱 ecosystem; not verified against specific app benchmarks (WebSearch unavailable) |
| Feature complexity estimates | MEDIUM-HIGH | Based on codebase familiarity; individual phase research may revise |

---

## Sources

- Codebase analysis: `src/components/portal/PublicPortal.jsx`, `src/components/analytics/AnalyticsView.jsx`, `src/components/ai/AiAssistant.jsx`
- AI Workers: `functions/api/ai/monthly-report.js`, `functions/api/ai/churn.js`, `functions/api/ai/query.js`, `functions/api/ai/practice-guide.js`
- Project requirements: `.planning/PROJECT.md` (Active requirements section)
- Korean education app patterns: domain knowledge (MEDIUM confidence — WebSearch unavailable in this environment)
