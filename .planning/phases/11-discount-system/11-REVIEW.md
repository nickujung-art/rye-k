---
phase: 11-discount-system
reviewed: 2026-06-22T00:00:00Z
depth: standard
files_reviewed: 8
files_reviewed_list:
  - src/utils.js
  - src/firebase.js
  - src/App.jsx
  - src/components/admin/AdminTools.jsx
  - src/components/dashboard/Dashboard.jsx
  - src/components/payment/PaymentsView.jsx
  - src/components/settlement/SettlementView.jsx
  - src/components/student/StudentManagement.jsx
findings:
  critical: 2
  warning: 3
  info: 2
  total: 7
status: issues_found
---

# Phase 11: Code Review Report

**Reviewed:** 2026-06-22  
**Depth:** standard  
**Files Reviewed:** 8  
**Status:** issues_found

## Summary

Phase 11 adds a discount type system: `calcTotalFee` extended to return `{ total, original, discountAmount, discountName }`, a new `saveDiscountTypes` firebase helper, a `DiscountTypeManager` CRUD component in the 5th PaymentsView tab, discount assignment UI in `StudentFormModal`, and `.total` access in Dashboard/SettlementView.

The core discount logic in `calcTotalFee` is sound. The Firestore listener, UI components, and per-op student update paths are all correct.

Two blockers exist. The monthly payment auto-seeding in `App.jsx` was never updated to call `calcTotalFee` — `calcTotalFee` is not even imported in `App.jsx` — so auto-seeded payment records carry the pre-discount amount. Because the discount strikethrough UI in `PaymentsView` is gated on `!p?.amount`, the discount is invisible in every month where seeding has already run. The full-data backup also omits `rye-discounts`, so a backup/restore cycle loses the entire discount configuration.

---

## Critical Issues

### CR-01: Monthly payment seeding does not apply discounts — discount system is non-functional after month start

**File:** `src/App.jsx:1043`

**Issue:**  
The `useEffect` that auto-seeds payment records uses `(s.monthlyFee || 0) + (s.instrumentRental ? (s.rentalFee || 0) : 0)` directly. `calcTotalFee` is **not imported** in `App.jsx` (see line 4 import — it lists `calcLessonFeeWithFallback` but not `calcTotalFee`). For any student with `student.discount` set, the seeded `payment.amount` equals the undiscounted base fee. This triggers a second failure:

`PaymentsView.jsx:708` only renders the discount strikethrough when `!p?.amount`. Once a payment record exists (with the undiscounted amount), `!p?.amount` is `false` so the entire discount chip and original-price strikethrough are suppressed. `Dashboard.jsx:145` uses `p?.amount ?? calcTotalFee(...).total` — the nullish coalescing operator does NOT fall through for a present-but-undiscounted `p.amount`, so `unpaidAmount` is overstated by the sum of all active discounts.

End result: from the first day of any month the seeding trigger fires, discounts are invisible to every user role and payment totals are wrong.

**Fix:**  
1. Add `calcTotalFee` to the import on `App.jsx` line 4.  
2. Replace the `amount` expression inside the seeding `.map()`:

```javascript
// App.jsx line 1043 — replace:
amount: (s.monthlyFee || 0) + (s.instrumentRental ? (s.rentalFee || 0) : 0),

// with:
amount: calcTotalFee(s, feePresets, discountTypes).total,
```

`calcTotalFee` already adds `rentalFee` when `instrumentRental` is true, so the explicit rental addition is eliminated by the change.

Note: `feePresets` and `discountTypes` are already captured in the `useEffect` closure — no dependency array change needed.

---

### CR-02: Full data backup excludes `rye-discounts`

**File:** `src/App.jsx:1176-1194`

**Issue:**  
`handleFullBackup` builds a `snapshot` object that lists every Firestore key that matters for restore (`rye-teachers`, `rye-students`, `rye-attendance`, `rye-payments`, `rye-notices`, `rye-categories`, `rye-fee-presets`, `rye-schedule-overrides`, `rye-activity`, `rye-pending`, `rye-trash`, `rye-student-notices`, `rye-institutions`). `rye-discounts` is absent. A backup-then-restore cycle silently drops the entire discount type catalog. Since student records reference discount types by `disc.discountId`, orphaned references would cause `calcTotalFee` to find no matching `dtype` and silently produce `discountAmount: 0` — a silent data integrity failure.

**Fix:**

```javascript
// App.jsx line ~1193 — add to the snapshot object:
"rye-discounts": discountTypes,
```

---

## Warnings

### WR-01: `handleSaveEdit` does not default `splitRatio` when burden is changed to "split"

**File:** `src/components/payment/PaymentsView.jsx:27-33`

**Issue:**  
`handleAddNew` (line 47) guards with:
```javascript
if (entry.burden === "split" && !entry.splitRatio) entry.splitRatio = { academy: 0.5, teacher: 0.5 };
```

`handleSaveEdit` (lines 27-33) has no equivalent guard. When a user edits an existing discount type that has `splitRatio: undefined` (or changes burden from "academy"/"teacher" to "split" without touching the ratio slider), `editForm.splitRatio` stays `undefined`. The save writes `{ ...d, ...editForm }` which preserves `splitRatio: undefined` in the DB. The `burdenLabel` function tolerates this via `d.splitRatio?.academy ?? 0.5`, but future code that reads `splitRatio` without optional-chaining would produce NaN arithmetic.

**Fix:**

```javascript
// PaymentsView.jsx — in handleSaveEdit, before the map:
const updatedForm = { ...editForm };
if (updatedForm.burden === "split" && !updatedForm.splitRatio) {
  updatedForm.splitRatio = { academy: 0.5, teacher: 0.5 };
}
const upd = discountTypes.map(d => d.id === editId ? { ...d, ...updatedForm } : d);
```

---

### WR-02: Settlement calculation ignores discount burden — teacher-burden and split-burden discounts do not reduce teacher payout

**File:** `src/components/settlement/SettlementView.jsx:95-104`

**Issue:**  
`calcResult` uses `studentTotalFee = calcTotalFee(student, feePresets, discountTypes).total` (the discounted total) as the denominator, and `lessonFee = calcLessonFeeWithFallback(...)` (the pre-discount per-lesson fee) as the numerator:

```javascript
const prop = studentTotalFee > 0 ? lessonFee / studentTotalFee : 1;
const base = paidAmount * prop;
```

When `paidAmount === studentTotalFee` (student paid in full at the discounted rate), `base = lessonFee` — effectively the pre-discount fee. This correctly makes the teacher whole when the discount is "academy burden." But when `discountTypes[i].burden === "teacher"` or `"split"`, the teacher's payout is identical: the `splitRatio` field on discount types is **never read** anywhere in `calcResult`. The discount burden information is stored in the database but produces no effect on settlement numbers.

**Fix:**  
Identify the applicable discount for each student lesson and, when `burden === "teacher"` or `"split"`, subtract the teacher's share of the discount from `base` before computing `settlement`:

```javascript
// After computing base:
const disc = student.discount;
if (disc?.discountId) {
  const dtype = discountTypes.find(d => d.id === disc.discountId);
  if (dtype && (dtype.burden === "teacher" || dtype.burden === "split")) {
    const teacherShare = dtype.burden === "teacher"
      ? 1
      : (1 - (dtype.splitRatio?.academy ?? 0.5));
    const discountOnLesson = dtype.type === "percent"
      ? Math.round(lessonFee * dtype.value / 100)
      : Math.min(dtype.value, lessonFee);
    base = Math.max(0, base - discountOnLesson * teacherShare);
  }
}
```

---

### WR-03: Discount chip and strikethrough hidden once any payment record exists

**File:** `src/components/payment/PaymentsView.jsx:708`

**Issue:**  
```javascript
{!p?.amount && feeResult.discountAmount > 0 ? (
  // discount chip + strikethrough UI
) : (
  // plain amount display
)}
```

The condition `!p?.amount` suppresses the discount UI as soon as a payment record with any non-zero amount exists. This was presumably intended to avoid confusing UI when an admin manually overrides the fee. However, the condition is too broad: it also hides the discount when the payment record was auto-seeded with the undiscounted amount (CR-01), and it will still hide the discount after CR-01 is fixed if the seeded `p.amount` matches the discounted total (because `p.amount` is truthy).

The result is that the discount indicator appears only during the very brief window before any payment record exists (start of month before seeding, or for mid-month-added students). Admins have no way to confirm discounts are being applied without opening the payment edit modal.

**Fix:** Change the condition to check whether the stored payment amount exceeds the discounted total, not whether a payment record exists at all:

```javascript
// Replace:
{!p?.amount && feeResult.discountAmount > 0 ? (

// With:
{feeResult.discountAmount > 0 && (p == null || p.amount > feeResult.total) ? (
```

This shows the discount UI whenever a discount applies and either no record exists or the stored amount has not yet been reduced to the discounted price.

---

## Info

### IN-01: Variable named `totalFee` holds the pre-discount `original`, not the discounted total

**File:** `src/components/student/StudentManagement.jsx:132`

**Issue:**  
```javascript
const { original: totalFee } = calcTotalFee(form, feePresets, discountTypes);
await onSave({ ...form, ..., monthlyFee: totalFee, ... });
```

`totalFee` is aliased from `original` — it is the undiscounted base fee. Saving `monthlyFee: original` is architecturally correct (monthlyFee stores the base; the discount overlay lives in `student.discount`), but the name `totalFee` implies the discounted final total and will mislead any developer who reads this code. Rename the alias:

```javascript
const { original: baseFee } = calcTotalFee(form, feePresets, discountTypes);
await onSave({ ...form, ..., monthlyFee: baseFee, ... });
```

---

### IN-02: `shopItems` prop passed to `SettlementView` but undeclared in its function signature

**File:** `src/App.jsx:1563` / `src/components/settlement/SettlementView.jsx:323-326`

**Issue:**  
`App.jsx` passes `shopItems={shopItems}` to `<SettlementView>`. `SettlementView`'s function signature destructures `{ teachers, students, attendance, payments, institutions, instantCharges, feePresets, currentUser, discountTypes }` — `shopItems` is absent. The prop is silently ignored. `SettlementView` computes shop incentives from `instantCharges` records (which carry `itemCategory`) and `teacher.shopIncentiveRates`, without needing the item catalog. The dead prop should be removed from the call site to avoid confusion.

**Fix:** Remove `shopItems={shopItems}` from the `<SettlementView>` JSX at `App.jsx:1563`.

---

_Reviewed: 2026-06-22_  
_Reviewer: Claude (gsd-code-reviewer)_  
_Depth: standard_
