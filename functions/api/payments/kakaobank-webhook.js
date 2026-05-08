// functions/api/payments/kakaobank-webhook.js
// KakaoBank Tasker Webhook — PAY-04/05
// POST: Android Tasker → webhook → fuzzy match → KV buffer
// GET:  Browser polling → drain KV buffer → return pending records (Firebase JWT auth)

import { verifyToken } from "../ai/_utils/auth.js";

export async function onRequest(context) {
  const { request, env } = context;
  const method = request.method;

  // ── CORS preflight ────────────────────────────────────────────────────
  if (method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, X-RYE-Secret, Authorization",
      },
    });
  }

  if (method === "POST") return handlePost(request, env);
  if (method === "GET")  return handleGet(request, env);
  return new Response("Method Not Allowed", { status: 405 });
}

// ── POST: Tasker sends deposit notification ───────────────────────────────
async function handlePost(request, env) {
  // 1. IP rate limit — max 10 calls/min per IP (DoS protection, ASVS)
  const ip = request.headers.get("CF-Connecting-IP") || "unknown";
  const allowed = await checkRateLimit(env.RATE_LIMIT_KV, `wh:${ip}`, 10);
  if (!allowed) return new Response("Too Many Requests", { status: 429 });

  // 2. Parse body early (needed for timestamp check)
  let body;
  try { body = await request.json(); }
  catch { return new Response("Bad Request", { status: 400 }); }

  // 3. Secret header validation — timingSafeEqual (ASVS: timing attack prevention)
  const secret = request.headers.get("X-RYE-Secret") || "";
  const expected = env.RYE_WEBHOOK_SECRET || "";
  if (!expected || !(await timingSafeEqual(secret, expected))) {
    return json({ error: "Unauthorized" }, 401);
  }

  // 4. Replay protection — reject timestamp older than ±5 minutes (ASVS)
  const ts = typeof body.timestamp === "number" ? body.timestamp : parseInt(body.timestamp || "0");
  const now = Date.now();
  if (!ts || Math.abs(now - ts) > 5 * 60 * 1000) {
    return json({ error: "Request expired or timestamp missing" }, 400);
  }

  // 5. Input validation — name and amount (ASVS: input sanitization)
  const rawName = String(body.name || "").trim();
  // Allow Korean chars, spaces, alphanumeric only — reject XSS/injection attempts
  const name = rawName.replace(/[^가-힣ᄀ-ᇿ㄰-㆏ a-zA-Z0-9]/g, "").trim();
  const amount = parseInt(String(body.amount || "0").replace(/[^\d]/g, "")) || 0;
  const rawText = String(body.rawText || "").slice(0, 200); // cap raw notification text

  if (!name || name.length < 2 || name.length > 20) {
    return json({ error: "Invalid name" }, 400);
  }
  if (amount <= 0 || amount > 10_000_000) {
    return json({ error: "Invalid amount" }, 400);
  }

  // 6. Load student list from KV cache (set by browser app — see notes below)
  //    If no student cache in KV, store as unmatched directly.
  let students = [];
  try {
    const cached = await env.RATE_LIMIT_KV.get("students_cache");
    if (cached) students = JSON.parse(cached);
  } catch { /* no cache — proceed as unmatched */ }

  // 7. Fuzzy match
  const { match, confidence } = fuzzyMatchStudent(name, students);

  // 8. Build record
  const id = crypto.randomUUID();
  const record = {
    id,
    senderName: name,
    amount,
    timestamp: ts,
    source: "kakaobank",
    rawText,
    createdAt: now,
    matchedAt: null,
    matchedStudentId: null,
    confidence,
  };

  if (match && (confidence === "exact" || confidence === "fuzzy_1")) {
    // Auto-matched — store in KV as pending with studentId for browser to confirm
    record.matchedStudentId = match.id;
    record.matchedAt = now;
    await env.RATE_LIMIT_KV.put(
      `pending:matched:${id}`,
      JSON.stringify(record),
      { expirationTtl: 86400 }  // 24h TTL
    );
    return json({ ok: true, matched: true, studentId: match.id, confidence });
  } else {
    // Unmatched — store for manual review
    await env.RATE_LIMIT_KV.put(
      `pending:unmatched:${id}`,
      JSON.stringify(record),
      { expirationTtl: 86400 }
    );
    return json({ ok: true, matched: false, confidence });
  }
}

// ── GET: Browser polls to drain KV pending queue ─────────────────────────
// Auth: Firebase JWT Bearer token (Authorization: Bearer {idToken})
// Required role: "admin" or "manager" (from Firebase custom claims)
async function handleGet(request, env) {
  // 1. Verify Firebase JWT — uses jose JWKS, same as AI workers
  const payload = await verifyToken(request);
  if (!payload) {
    return json({ error: "Unauthorized" }, 401);
  }

  // 2. Role check — only admin/manager may drain the payment queue
  const role = payload.role;
  if (role !== "admin" && role !== "manager") {
    return json({ error: "Forbidden" }, 403);
  }

  // 3. Drain all pending:* keys from KV
  const matched   = [];
  const unmatched = [];

  try {
    // Cloudflare KV list — prefix filter
    const mList = await env.RATE_LIMIT_KV.list({ prefix: "pending:matched:" });
    for (const key of mList.keys) {
      const val = await env.RATE_LIMIT_KV.get(key.name);
      if (val) {
        try { matched.push(JSON.parse(val)); } catch {}
        await env.RATE_LIMIT_KV.delete(key.name);
      }
    }

    const uList = await env.RATE_LIMIT_KV.list({ prefix: "pending:unmatched:" });
    for (const key of uList.keys) {
      const val = await env.RATE_LIMIT_KV.get(key.name);
      if (val) {
        try { unmatched.push(JSON.parse(val)); } catch {}
        await env.RATE_LIMIT_KV.delete(key.name);
      }
    }
  } catch (e) {
    return json({ error: e.message }, 500);
  }

  return json({ ok: true, matched, unmatched });
}

// ── Helpers ──────────────────────────────────────────────────────────────

// Constant-time comparison to prevent timing attacks (ASVS V2, Pitfall 5)
async function timingSafeEqual(a, b) {
  const enc = new TextEncoder();
  const aB = enc.encode(a);
  const bB = enc.encode(b);
  if (aB.length !== bB.length) return false;
  const key = await crypto.subtle.importKey(
    "raw", aB, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const [s1, s2] = await Promise.all([
    crypto.subtle.sign("HMAC", key, aB),
    crypto.subtle.sign("HMAC", key, bB),
  ]);
  const h = (buf) => Array.from(new Uint8Array(buf)).map(x => x.toString(16).padStart(2, "0")).join("");
  return h(s1) === h(s2);
}

// Inline rate limiter (mirrors _utils/ratelimit.js — avoids cross-function import)
async function checkRateLimit(kv, userId, limit) {
  if (!kv) return true; // fail open if KV not bound
  const bucket = Math.floor(Date.now() / 60000);
  const key = `rl:${userId}:${bucket}`;
  const val = await kv.get(key);
  const count = val ? parseInt(val, 10) : 0;
  if (count >= limit) return false;
  await kv.put(key, String(count + 1), { expirationTtl: 120 });
  return true;
}

// Levenshtein distance — inline, no npm, handles Korean chars correctly
function levenshtein(a, b) {
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]);
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

// Fuzzy match student — returns { match, confidence }
// confidence: "exact" | "fuzzy_1" | "duplicate_exact" | "duplicate_fuzzy" | "no_match"
function fuzzyMatchStudent(inputName, students) {
  const active = students.filter(s => !s.isInstitution && (s.status || "active") === "active");

  // 1. Exact match
  const exact = active.filter(s => s.name === inputName);
  if (exact.length === 1) return { match: exact[0], confidence: "exact" };
  if (exact.length > 1)   return { match: null,     confidence: "duplicate_exact" };

  // 2. Levenshtein 1 — single closest match
  const close = active
    .map(s => ({ s, dist: levenshtein(inputName, s.name) }))
    .filter(({ dist }) => dist <= 1)
    .sort((a, b) => a.dist - b.dist);

  if (close.length === 1) return { match: close[0].s, confidence: "fuzzy_1" };
  if (close.length > 1)   return { match: null,       confidence: "duplicate_fuzzy" };

  return { match: null, confidence: "no_match" };
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
