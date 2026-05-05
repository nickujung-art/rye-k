# Technology Stack

**Analysis Date:** 2026-05-05

## Languages

**Primary:**
- JavaScript (ES Modules) — all source files under `src/` and `functions/`
- JSX — React component files (`*.jsx`)

**Secondary:**
- HTML — entry points at `index.html`, `myryk/index.html`, `register/index.html`
- CSS — delivered as a CSS string exported from `src/constants.jsx`, injected via a `<style>` tag at runtime (no external `.css` files)

## Runtime

**Environment:**
- Browser (SPA PWA) — React 18 client-side rendering
- Cloudflare Workers (edge) — `functions/api/ai/` serverless handlers run on Cloudflare Pages Functions

**Package Manager:**
- npm (implied by `package.json`; no lockfile committed — `package-lock.json` absent from tracked files)

## Frameworks

**Core:**
- React 18.3.1 — UI component framework; SPA with client-side routing via view-state in `App.jsx`

**Build/Dev:**
- Vite 5.4.0 — dev server and production bundler (`vite.config.js`)
- `@vitejs/plugin-react` 4.3.1 — Babel-powered JSX transform + Fast Refresh

**Testing:**
- None — no test runner configured; validation is `npm run build` + browser manual verification

## Key Dependencies

**Critical:**
- `firebase` 10.13.0 — Firestore real-time database + Firebase Auth (anonymous + email/password); the only persistent data store
- `jose` 5.0.0 — JWT verification in Cloudflare Functions (`functions/api/ai/_utils/auth.js`); used to verify Firebase ID tokens server-side via Google's JWKS endpoint

**Infrastructure:**
- Vite multi-entry build: three HTML entry points (`main`, `myryk`, `register`) defined in `vite.config.js` via `rollupOptions.input`
- `chunkSizeWarningLimit: 1100` — raised to suppress warnings from the single large `App.jsx` bundle

## CSS Approach

All styles are defined as a single template-literal string exported as `CSS` from `src/constants.jsx` (line 50 onward). `App.jsx` injects this string into a `<style>` tag at mount time. There are **no external `.css` files** and no CSS-in-JS library. CSS custom properties (`:root` variables) are used for the design token system.

**Font loading:**
- Google Fonts CDN: `Noto Serif KR` (400/500/700) + `Noto Sans KR` (300/400/500/600/700)
- Loaded via `@import` inside the CSS string — not preloaded

**Design tokens defined in `:root`:**
- Color palette: `--blue`, `--red`, `--gold`, `--green`, `--ink-*`, `--paper`, `--bg`, `--border`
- Dancheong (Korean traditional color) palette: `--dancheong-blue/red/yellow/white/black`
- Spacing/radius: `--radius`, `--radius-sm/lg/xs/xl`
- Motion: `--ease-out`, `--dur-fast/base/slow`
- Layout: `--nav-h: 60px`, `--topbar-h: 52px`, `--safe-b` (iOS safe area)

## State Management

No external state library (no Redux, Zustand, Jotai, etc.). Patterns used:

- **React `useState` / `useEffect`** — all UI state local to `App.jsx` or component files
- **Firestore `onSnapshot`** — real-time listeners in `App.jsx` drive top-level state arrays (`students`, `teachers`, `attendance`, `payments`, etc.)
- **Props drilling** — state passed down from `App.jsx` (single source of truth) to all child components
- **`lazy` + `Suspense`** — four heavy views are code-split: `AnalyticsView`, `ScheduleView`, `SystemNewsView`, `MonthlyReportsView`

## Auth System

Dual-mode Firebase Auth managed in `src/firebase.js`:

| Mode | Usage | Mechanism |
|------|-------|-----------|
| Email/password | Staff (teachers, managers, admin) | Synthetic email `{username}@ryek.app` + derived password |
| Anonymous | Public portal visitors + AI API callers | `signInAnonymously()` |

**Password derivation scheme (in `src/firebase.js`):**
- Legacy: `` `ryek!${username}#2024` ``
- Salted (current): `` `ryek2!${username}#${VITE_AUTH_SALT}` ``
- `VITE_AUTH_SALT` env var controls which scheme is active; auto-migration upgrades legacy accounts on login

**Server-side token verification (Cloudflare Functions):**
- `functions/api/ai/_utils/auth.js` verifies Firebase ID tokens using `jose` + Google JWKS
- Rejects anonymous users (only authenticated email accounts reach AI endpoints)

## Build Scripts

```bash
npm run dev      # vite — dev server with HMR
npm run build    # vite build — outputs to dist/
npm run preview  # vite preview — serve built dist/
```

**Build output:** `dist/` — multi-entry SPA bundles (~880KB raw / ~220KB gzip per CLAUDE.md)

## Deployment Pipeline

- **Repository:** `nickujung-art/rye-k` on GitHub
- **Hosting:** Cloudflare Pages — auto-build triggered on push to `main`
- **Config:** `wrangler.toml` — `pages_build_output_dir = "dist"`, `compatibility_date = "2024-09-23"`
- **Functions:** `functions/api/ai/` — served as Cloudflare Pages Functions (Edge Workers)
- **Environment variables** set in Cloudflare dashboard (not committed):
  - `GEMINI_API_KEY` — Google Gemini API key used by all AI functions
  - `AI_ENABLED` — feature flag (`"false"` disables all AI endpoints; returns 503)
  - `AI_SAFE_MODE` — when `"true"`, enables PII anonymization before AI calls
  - `RATE_LIMIT_KV` — KV namespace binding for rate limiting
  - `VITE_AUTH_SALT` — build-time env var for Firebase password salt

## Platform Requirements

**Development:**
- Node.js (version not pinned — no `.nvmrc` or `engines` field)
- `npm run dev` serves from Vite dev server; Cloudflare Functions not available locally unless running `wrangler pages dev`

**Production:**
- Cloudflare Pages (static hosting + Edge Workers for `/api/*` routes)
- Firebase project `rye-k-center` (Firestore + Auth)

---

*Stack analysis: 2026-05-05*
