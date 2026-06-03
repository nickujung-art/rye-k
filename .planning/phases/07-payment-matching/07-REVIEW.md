---
phase: 07-payment-matching
reviewed: 2026-06-03T10:30:00Z
depth: standard
files_reviewed: 5
files_reviewed_list:
  - functions/api/payments/kakaobank-webhook.js
  - functions/api/payments/sync-students.js
  - src/App.jsx
  - src/components/payment/PaymentsView.jsx
  - src/components/student/StudentManagement.jsx
findings:
  critical: 3
  warning: 6
  info: 3
  total: 12
status: issues_found
---

# Phase 07: Code Review Report

**Reviewed:** 2026-06-03T10:30:00Z
**Depth:** standard
**Files Reviewed:** 5
**Status:** issues_found

## Summary

Phase 07 adds guardian-name matching to the kakaobank webhook fuzzy matcher, extends `students_cache` KV with `guardianName`/`monthlyFee` fields, adds an app-mount auto-sync, and wires rawText display + `suggestedStudentId` auto-select into the unmatched-payments UI.

The security posture of `sync-students.js` is correct (JWT role read from claim, not body). The `kakaobank-webhook.js` secret validation and rate limiting are sound. However, three blockers are present: a KV TTL mismatch that will cause silent cache expiry mid-day, a confidence return value on the unmatched path that is incorrect (stale `no_match` after `amount_match` is applied), and a real financial-data race condition in the drain flow where payments are saved with a stale snapshot.

---

## Critical Issues

### CR-01: TTL mismatch — `students_cache` expires 3 days after sync, webhook reads expect longer validity

**File:** `functions/api/payments/sync-students.js:59`

**Issue:** The comment on line 54 says _"TTL 24h (webhook이 같은 TTL 사용)"_, but the actual `expirationTtl` written is `259200` seconds = **72 hours (3 days)**. The webhook (`kakaobank-webhook.js:122`) reads the same key. If the browser app does not sync within 72 hours the cache silently disappears, and the webhook falls back to the unmatched queue with no cache present — no error, no log, just silent data loss for every auto-match attempt until the next browser visit to the payments tab.

The Phase 07-01 plan explicitly states a "TTL 72h" extension, so `259200` is intentional, but the comment directly contradicts it. More critically, the **app-mount sync guard** (`syncedOnMount` ref in `App.jsx:228`) is `useRef(false)` — it is **never reset when the user logs out and logs in as a different admin on the same page session**, meaning the second admin's student data never reaches KV if the first sync already fired in the same browser session.

**Fix:**
```js
// sync-students.js line 54 — align comment to actual value
// 5. KV 저장 — TTL 72h (3일, webhook이 같은 TTL 사용)
await env.RATE_LIMIT_KV.put(
  "students_cache",
  JSON.stringify(filtered),
  { expirationTtl: 259200 }   // 72h = 259200s
);
```

For the `syncedOnMount` re-trigger gap in `App.jsx`, tie the dependency to `user?.id` so a different login forces a re-sync:
```js
// App.jsx — change dependency array
}, [user?.id, students.length > 0]); // already has user?.role; add user?.id
```

---

### CR-02: Stale `confidence` value returned in POST response after `amount_match` path

**File:** `functions/api/payments/kakaobank-webhook.js:237`

**Issue:** When `amount_match` applies (lines 221–228), `record.confidence` is updated to `"amount_match"`, and `record.suggestedStudentId` is set. But the final `return json(...)` at line 237 returns `confidence` — which is still the **original value from `fuzzyMatchStudent`**, i.e. `"no_match"`, not `"amount_match"`:

```js
const { match, confidence } = fuzzyMatchStudent(name, students);  // "no_match"
// ...
record.confidence = "amount_match";  // only record is updated
// ...
return json({ ok: true, matched: false, confidence });  // returns "no_match" ← wrong
```

This is a logic bug: the caller (Tasker / any consumer of the POST response) receives the wrong confidence signal. The stored KV record is correct, but the HTTP response is misleading.

**Fix:**
```js
// Replace the final return in the else branch:
return json({ ok: true, matched: false, confidence: record.confidence });
```

---

### CR-03: Payment drain race condition — stale `payments` snapshot overwrites concurrent changes

**File:** `src/App.jsx:647–677`

**Issue:** The `drainPending` effect inside the `view === "payments"` useEffect reads from `payments` (React state) via closure at the time the effect fires, then calls `savePayments(merged)` which does a full Firestore overwrite via `sSet`. If any other tab, device, or the Firestore real-time listener updates `rye-payments` between when the effect started and when `savePayments` is called, those changes are silently discarded. This is a data-loss risk for the payments collection — the project CLAUDE.md explicitly calls out student CRUD as requiring runTransaction for this reason; the same concern applies here.

```js
// Line 647 — the merged array is built from stale React state:
const merged = [...payments];
// ...
await savePayments(merged);  // full overwrite, not transactional
```

The effect dependency array is `[view]` with `eslint-disable`, so it intentionally captures payments at mount time. On a multi-device admin session, a second admin confirming a payment between drain start and drain save will have their change silently erased.

**Fix:** Read the current payments inside a Firestore `runTransaction` before building `merged`, mirroring the existing pattern used by `batchStudentDocs`. Alternatively, use a transaction-safe upsert that only writes the matched records rather than the full array.

---

## Warnings

### WR-01: `duplicate_guardian` confidence is not handled in auto-match gate, but split-name paths guard it correctly

**File:** `functions/api/payments/kakaobank-webhook.js:161–162`

**Issue:** The split-space path (lines 161–162) includes `"guardian_exact"` and `"guardian_fuzzy"` in the `ok1`/`ok2` acceptance set, which is correct. However, the split-name (concatenated) path at lines 191–192 only checks `"exact"` and `"fuzzy_1"` — guardian matches are **excluded** from the concatenated split path. This is an inconsistency: a payment of `홍길동김부모` (concatenated parent names) will not be matched even though `홍길동(학생)` ↔ `guardianName` would have worked for the spaced version `홍길동 김부모`.

**Fix:** Add guardian confidence values to the concatenated split check:
```js
// Lines 191-192
const ok1 = m1.confidence === "exact" || m1.confidence === "fuzzy_1"
         || m1.confidence === "guardian_exact" || m1.confidence === "guardian_fuzzy";
const ok2 = m2.confidence === "exact" || m2.confidence === "fuzzy_1"
         || m2.confidence === "guardian_exact" || m2.confidence === "guardian_fuzzy";
```

---

### WR-02: `amount_match` suggestion auto-selected in UI before the confidence badge is checked

**File:** `src/components/payment/PaymentsView.jsx:1299–1309`

**Issue:** The `useEffect` in `UnmatchedPaymentsTab` auto-populates `selectedStudentId` for any unmatched record that has a `suggestedStudentId`, regardless of confidence level. The condition is:

```js
if (u.suggestedStudentId && !selectedStudentId[u.id]) {
  autoSelections[u.id] = u.suggestedStudentId;
}
```

This means a suggestion based solely on `amount_match` (fee amount equals exactly one active student) is **automatically pre-selected** in the dropdown. If the admin does not notice and clicks "수납 처리", the payment is committed to the wrong student. The badge on line 1419 shows the warning text, but it is easy to miss since the dropdown is already populated.

**Fix:** Remove auto-selection for `amount_match` confidence; only auto-select for exact/fuzzy name matches (which are never in the unmatched queue by definition). Alternatively, show the suggestion as a hint without pre-populating the `<select>` value:

```js
useEffect(() => {
  const autoSelections = {};
  pending.forEach(u => {
    // Only auto-select high-confidence name matches, not amount-only guesses
    if (u.suggestedStudentId && u.confidence !== "amount_match" && !selectedStudentId[u.id]) {
      autoSelections[u.id] = u.suggestedStudentId;
    }
  });
  // ...
}, [pending.length]);
```

---

### WR-03: `handleMatch` overwrites an already-paid payment record without checking `existing.paid`

**File:** `src/components/payment/PaymentsView.jsx:1337–1357`

**Issue:** In `handleMatch`, when a manual match is performed, the code finds the existing payment record and overwrites it unconditionally. If the student already has `paid: true` for that month (e.g. a previous auto-match succeeded), the manual match silently replaces it and marks it paid again with a different `senderName` note, potentially changing `paidAmount` to `unmatched.amount`. This can corrupt the payment record for a student who paid twice (the duplicate would end up in `autoUnmatched`, but if the first duplicate check didn't fire it reaches here).

**Fix:** Add a guard:
```js
if (existing?.paid) {
  onLog(`미매칭 매칭 실패 — ${s.name} 이미 납부 완료`);
  setMatchingId(null);
  return;
}
```

---

### WR-04: `guardianName` trimming is only done in `sync-students.js`; the Firestore record is saved untrimmed

**File:** `functions/api/payments/sync-students.js:50`

**Issue:** `sync-students.js` trims `guardianName` on line 50 before writing to KV. However, the `guardianName` value in Firestore is set directly from the form input (`StudentFormModal`, line 173) with no trim applied — `set("guardianName", e.target.value)` stores raw user input. An accidental trailing space will cause Levenshtein distance of 1 for an otherwise exact guardian name match, demoting confidence from `guardian_exact` to `guardian_fuzzy` (or even `no_match` for a 3-char name).

**Fix:** Trim on save in `StudentFormModal`:
```js
onChange={e => set("guardianName", e.target.value.trim())}
// or trim in handleConfirm before passing to onSave
```

---

### WR-05: `checkRateLimit` returns `false` when KV is unbound — blocks all POST requests silently

**File:** `functions/api/payments/kakaobank-webhook.js:309`

**Issue:** The inline `checkRateLimit` function returns `false` (i.e., 429 Too Many Requests) when `kv` is `null`/`undefined`:

```js
if (!kv) return false; // fail closed — KV 미바인딩 시 차단
```

This is intentional "fail closed" behavior, but because the binding name `RATE_LIMIT_KV` is the same binding used for both the rate limiter and the students cache, a KV binding misconfiguration causes **all POST requests to silently return 429** with no log, no alert. There is no way to distinguish this from an actual rate-limit event. The Tasker device receives a 429 and may retry indefinitely.

**Fix:** Return a distinct error response or at minimum log the binding absence:
```js
if (!kv) {
  console.error("[webhook] RATE_LIMIT_KV not bound — rejecting request");
  return new Response("Service Unavailable", { status: 503 });
}
```

---

### WR-06: `drainPending` in `App.jsx` does not deduplicate already-processed KV record IDs

**File:** `src/App.jsx:649–690`

**Issue:** When `matched` records from the GET drain are processed, the code checks `merged.findIndex(p => p.studentId === np.studentId && p.month === np.month)` (line 649) to find existing records. This check is on `(studentId, month)` tuple — it does **not** check `p.id === np.id`. If the same `record.id` (a UUID from the webhook) is drained twice (which can happen if the KV delete at line 267 fails atomically — Cloudflare KV delete after get is not transactional), a second drain run will either merge into the existing `paid` record (triggering `duplicate_paid` path) or create a duplicate payment row. The KV drain is supposed to be atomic but Cloudflare KV does not guarantee read-then-delete atomicity.

**Fix:** Before merging, check if a payment record with the same `id` already exists:
```js
for (const np of newPayments) {
  if (merged.some(p => p.id === np.id)) continue; // already processed
  const idx = merged.findIndex(p => p.studentId === np.studentId && p.month === np.month);
  // ...
}
```

---

## Info

### IN-01: Comment mismatch in `sync-students.js`

**File:** `functions/api/payments/sync-students.js:54`

**Issue:** Comment says `// TTL 24h (webhook이 같은 TTL 사용)` but the actual value is 259200s = 72h. This is a maintenance hazard — a developer reading the comment will believe the cache expires in 24h and over-provision sync frequency.

**Fix:** Update to `// TTL 72h`.

---

### IN-02: `suggestedStudentId` badge text overlaps with select dropdown on narrow screens

**File:** `src/components/payment/PaymentsView.jsx:1419–1428`

**Issue:** The suggestion badge is rendered above the `<select>` but inside a `width:148` fixed column. On very narrow viewports, the badge text `"💡 금액 기반 추천: {name}"` can overflow the column. `name` is not truncated and there is no `overflow:hidden` or `text-overflow:ellipsis`. Long names (e.g. `김순옥(아징)`) will overflow.

**Fix:** Add `overflow:hidden; text-overflow:ellipsis; white-space:nowrap` to the badge div.

---

### IN-03: `levenshtein` function allocates a full `m×n` DP matrix every call

**File:** `functions/api/payments/kakaobank-webhook.js:320–332`

**Issue:** For each student in the active list, a new `(m+1)×(n+1)` matrix is allocated. With 77+ students and two passes (name + guardianName), this creates ~160 matrix allocations per POST. For Korean names (2–5 chars) this is harmless at current scale, but it is worth noting for future growth.

**Fix:** (Not urgent) Consider a two-row rolling-array variant if student count grows significantly.

---

_Reviewed: 2026-06-03T10:30:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
