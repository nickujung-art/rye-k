# Coding Conventions

**Analysis Date:** 2026-05-05

## Naming Patterns

**Files:**
- React component files: PascalCase, `.jsx` extension — `StudentManagement.jsx`, `Dashboard.jsx`, `CommonUI.jsx`
- Utility/logic files: camelCase, `.js` extension — `utils.js`, `firebase.js`, `aiClient.js`
- Constants subdirectory: camelCase module files — `src/constants/releases.js`

**Functions and Variables:**
- Exported utility functions: camelCase — `calcAge`, `fmtDate`, `fmtMoney`, `expandInstitutionsToMembers`
- React components: PascalCase — `Dashboard`, `LessonEditor`, `StudentFormModal`, `MicButton`
- Boolean variables: `is`/`can` prefix — `isMinor`, `canManageAll`, `isInstitution`, `_aiEnabled`
- Event handlers: `on` prefix — `onSave`, `onClose`, `onTranscript`, `onUpload`
- Internal/private module vars: underscore prefix — `_SALT`, `_LEGACY_PW`, `_SALTED_PW`, `_aiEnabled`

**Constants:**
- Module-level constants: `UPPER_SNAKE_CASE` — `DEFAULT_CATEGORIES`, `TODAY_STR`, `THIS_MONTH`, `ATT_STATUS`, `PAY_METHODS`
- Firestore collection key: `COLLECTION = "appData"` in `src/App.jsx`

**Korean naming:**
- Korean strings appear throughout as UI labels, comments, and data values — this is intentional for a Korean-language product
- Code identifiers (function names, variable names) are always English camelCase/PascalCase
- Korean appears in: inline comments, JSX text content, constant values (e.g. `ATT_STATUS`, `DEFAULT_CATEGORIES`), seed data

## CSS Approach

**No external CSS files.** All styles are defined as a CSS template string in `src/constants.jsx` and injected via a `<style>` tag.

**Structure:**
- The `CSS` export in `src/constants.jsx` contains one large CSS string (~800+ lines)
- Design tokens defined as CSS custom properties on `:root` — `--blue`, `--red`, `--gold`, `--green`, `--ink`, `--paper`, `--border`, `--radius`, etc.
- Dancheong (단청) palette: `--dancheong-blue`, `--dancheong-red`, `--dancheong-yellow`, `--dancheong-white`, `--dancheong-black`
- Hanji texture gradient: `--hanji`
- Layout tokens: `--nav-h`, `--topbar-h`, `--safe-b` (iOS safe area)
- Animation tokens: `--ease-out`, `--dur-fast`, `--dur-base`, `--dur-slow`

**CSS class naming:** BEM-like with kebab-case:
- Block: `.card`, `.btn`, `.av`, `.tag`, `.stat-card`
- Modifier suffix: `.btn-primary`, `.btn-sm`, `.btn-xs`, `.av-lg`, `.av-sm`, `.tag-minor`, `.tag-adult`
- State: `.active`, `.on`, `.checked`

**Inline styles:** Used frequently for one-off overrides directly on JSX elements — `style={{ marginBottom: 6, fontSize: 13 }}`. This is the established pattern; do not add external CSS files.

**Fonts:** `Noto Serif KR` (headings, brand elements) and `Noto Sans KR` (body) loaded via Google Fonts `@import` inside the CSS string.

## Icon System

Icons are stored as React JSX elements in the `IC` object in `src/constants.jsx`:

```js
export const IC = {
  home: <svg ...>,
  users: <svg ...>,
  check: <svg ...>,
  // ~30 icons total
};
```

Usage: `{IC.home}`, `{IC.plus}`, `{IC.check}` — imported from `../../constants.jsx`.

All icons are inline SVG with `stroke="currentColor"` so they inherit text color. Icon sizes vary: `22x22` for nav icons, `16x16` for action icons, `14x14` for inline/compact icons.

**Do not use icon libraries** (no Lucide, FontAwesome, etc.) — extend `IC` in `src/constants.jsx` for new icons.

## State Management

**No global state library.** State is managed via React `useState` + `useEffect` + Firebase `onSnapshot` listeners.

**State layers:**
- `App.jsx` is the single source of truth — holds `students`, `teachers`, `attendance`, `payments`, `notices`, `categories`, `institutions`, etc. as top-level state
- All state is lifted to `App.jsx` and passed down as props
- Child components receive data + callback props; they do not fetch from Firestore directly

**Firebase listener pattern** (in `App.jsx`):
```js
useEffect(() => {
  const unsub = onSnapshot(doc(db, COLLECTION, "rye-students"), snap => {
    if (snap.exists()) setStudents(snap.data().value || []);
  });
  return () => unsub();
}, []);
```

**Write pattern** — all mutations use per-operation transaction functions, never array overwrite:
- `addStudentDoc(student)` — adds single doc
- `updateStudentDoc(student)` — updates by ID
- `deleteStudentDoc(studentId)` — deletes by ID
- `batchStudentDocs(updates[])` — batch update
- All backed by `runTransaction(db, ...)` from `src/firebase.js`

**CRITICAL: `saveStudents([...])` is permanently disabled** — calling it throws. Never use it.

## Import Organization

**Order pattern observed:**
1. React core imports — `import { useState, useEffect } from "react"`
2. Firebase — `import { db, ... } from "./firebase.js"`
3. Constants — `import { IC, TODAY_STR, ... } from "../../constants.jsx"`
4. Utils — `import { fmtDate, calcAge, ... } from "../../utils.js"`
5. Shared components — `import { Av, Logo } from "../shared/CommonUI.jsx"`
6. Feature components — `import { LessonEditor } from "../student/StudentManagement.jsx"`

**Path style:** Relative paths only — no aliases. `../../constants.jsx`, `../../utils.js`, `../shared/CommonUI.jsx`.

**Lazy loading** (in `App.jsx` only): Heavy views are code-split with `React.lazy`:
```js
const AnalyticsView = lazy(() => import("./components/analytics/AnalyticsView.jsx"));
```

## Error Handling

**Pattern:** `try/catch` blocks with `console.error` for Firestore/auth operations. UI-facing errors use toast notifications or inline error state (no `window.alert` — forbidden by CLAUDE.md).

```js
// Firestore write (App.jsx)
async function sSet(k, v) {
  try {
    await setDoc(doc(db, COLLECTION, k), { value: v, updatedAt: Date.now() });
  } catch (e) {
    console.error("sSet error:", k, e);
    throw e;
  }
}
```

**Silent catch pattern:** Used in non-critical paths like password migration:
```js
try { await updatePassword(cred.user, _SALTED_PW(username)); } catch {}
```

**No schema validation library.** Input validation is done with manual checks (`if (!field) return`) at the component level.

## Console Usage

`console.log` is present in `src/aiClient.js` (3 occurrences — debug logging for AI token flow), `src/App.jsx` (2 occurrences), and `src/utils.js` (1 occurrence — mock alimtalk log). This is a known code smell — not all debug logs have been removed.

`console.error` is used consistently for caught errors across all files.

## Component Size

File sizes (approximate line counts):
- `src/App.jsx` — ~690 lines (at limit)
- `src/constants.jsx` — ~700+ lines (CSS + constants + IC)
- `src/components/student/StudentManagement.jsx` — ~859 lines (**exceeds 800-line limit**)
- `src/components/attendance/Attendance.jsx` — large, multi-component file
- `src/components/admin/AdminTools.jsx` — multi-component file

`StudentManagement.jsx` is the primary file exceeding the 800-line guideline. Most other files are within range. Multi-component files (one `View` + multiple modals in one file) is the established pattern.

## Component Design

**Multiple exports per file** — each feature file exports several related components:
```js
// StudentManagement.jsx exports:
export function LessonEditor(...)
export function StudentFormModal(...)
export function StudentDetailModal(...)
export function BulkFeeModal(...)
export default function StudentsView(...)
```

**Props drilling** — no context API; props are passed explicitly from `App.jsx` through view components.

**Modal pattern** — modals are rendered inline in their parent view with a boolean state toggle. No global modal manager.

**No TypeScript** — the project uses plain JavaScript + JSX with no type annotations.

## Constants Organization

**Two locations:**
- `src/constants.jsx` — runtime constants, icons, CSS: `DEFAULT_CATEGORIES`, `DAYS`, `ADMIN`, `ATT_STATUS`, `PAY_METHODS`, `INST_TYPES`, `IC`, `CSS`
- `src/constants/releases.js` — release history only: `RELEASE_HISTORY`, `LATEST_RELEASE`, `CURRENT_VERSION`

When adding new app-wide constants (labels, lookup tables, status maps), add to `src/constants.jsx`. Release notes exclusively belong in `src/constants/releases.js`.

---

*Convention analysis: 2026-05-05*
