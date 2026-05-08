---
plan: "05-04"
phase: "05-payment-automation"
status: complete
completed: 2026-05-09
wave: 1
requirements_covered:
  - PAY-04
  - PAY-05
---

# 05-04 Summary — KakaoBank Webhook Worker (PAY-04/05)

## What Was Built

### `functions/api/payments/kakaobank-webhook.js`
Cloudflare Pages Function with two handlers:

**POST** — Android Tasker deposit notification receiver:
- IP rate limit (10/min via RATE_LIMIT_KV)
- `timingSafeEqual` (HMAC-SHA256) constant-time secret validation
- ±5-minute replay protection (timestamp check)
- Korean character sanitization (`/[^가-힣ᄀ-ᇿ㄰-㆏ a-zA-Z0-9]/g`)
- `fuzzyMatchStudent()` — exact → Levenshtein-1 → duplicate handling
- KV buffer write: `pending:matched:{uuid}` or `pending:unmatched:{uuid}` (24h TTL)

**GET** — Browser polling drain endpoint:
- Firebase JWT auth via `verifyToken()` (same jose JWKS as AI workers)
- Role gate: `admin` or `manager` only (teacher returns 403)
- Lists and deletes all `pending:matched:*` and `pending:unmatched:*` KV keys
- Returns `{ ok, matched[], unmatched[] }`

### `docs/operations/kakaobank-webhook-setup.md`
Tasker + AutoNotification setup guide including:
- Prerequisites (Android Tasker + AutoNotification plugin)
- Cloudflare secret registration (wrangler CLI + dashboard)
- Profile trigger: KakaoTalk app, 알림 텍스트 contains "입금"
- JavaScript template (regex patterns + HTTP POST)
- curl test examples

## Security Controls Applied
- `RYE_WEBHOOK_SECRET` NOT in wrangler.toml (Cloudflare encrypted secret only)
- `timingSafeEqual` prevents timing oracle on secret comparison
- Replay attack window: ±5 min
- Input validation: name length 2–20 chars, amount 1–10,000,000
- Rate limit: 10 req/min per IP (reuses RATE_LIMIT_KV)

## Cloudflare Setup (Nick completed)
- `RYE_WEBHOOK_SECRET` registered via `wrangler pages secret put RYE_WEBHOOK_SECRET --project-name rye-k`
- Confirmed: GET `https://rye-k.pages.dev/api/payments/kakaobank-webhook` → `{"error":"Unauthorized"}` (Worker is live)

## Pending (Nick actions)
- Tasker + AutoNotification Android setup (업무폰) — see `docs/operations/kakaobank-webhook-setup.md`
- After registration, enter same secret value in Tasker HTTP task header

## Files Changed
- `functions/api/payments/kakaobank-webhook.js` (new, commit 23523ed)
- `docs/operations/kakaobank-webhook-setup.md` (new, commit 93f728f)
- `wrangler.toml` — NOT modified (0 RYE_WEBHOOK_SECRET matches verified)

## Commits
- `23523ed` — feat(05-04): create kakaobank-webhook Cloudflare Worker (PAY-04/05)
- `93f728f` — docs(05-04): add kakaobank webhook setup guide (Tasker + Cloudflare)
- `06acbdf` — chore: merge executor worktree (05-04 kakaobank-webhook Worker)
