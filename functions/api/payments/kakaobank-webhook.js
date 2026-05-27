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

  // 2. Parse body — accept JSON or plain text (Tasker sends plain text)
  let body;
  try {
    const ct = request.headers.get("content-type") || "";
    if (ct.includes("application/json")) {
      body = await request.json();
    } else {
      body = { rawText: await request.text() };
    }
  } catch { return new Response("Bad Request", { status: 400 }); }

  // 3. Secret header validation — timingSafeEqual (ASVS: timing attack prevention)
  const secret = request.headers.get("X-RYE-Secret") || "";
  const expected = env.RYE_WEBHOOK_SECRET || "";
  if (!expected || !(await timingSafeEqual(secret, expected))) {
    return json({ error: "Unauthorized" }, 401);
  }

  // 4. Timestamp — use body value if provided, else server time
  const ts = typeof body.timestamp === "number"
    ? body.timestamp
    : (body.timestamp ? parseInt(body.timestamp) : Date.now());
  const now = Date.now();
  if (Math.abs(now - ts) > 5 * 60 * 1000) {
    return json({ error: "Request expired" }, 400);
  }

  // 5. Input validation — parse rawText first, then override with explicit fields
  const rawText = String(body.rawText || "").slice(0, 500);
  const parsed = parseRawText(rawText);

  const rawName = String(body.name || parsed.name || "").trim();
  const name = rawName.replace(/[^가-힣ᄀ-ᇿ㄰-㆏ a-zA-Z0-9]/g, "").trim();
  const amount = parseInt(String(body.amount || "0").replace(/[^\d]/g, "")) || parsed.amount || 0;

  if (amount > 10_000_000) {
    return json({ error: "Invalid amount" }, 400);
  }
  // amount=0: 파싱 실패로 간주 — 400 금지, unmatched 저장 후 계속

  // name 파싱 실패 시 400 반환 금지 — 입금 기록 유실 방지
  // rawText를 보존해 unmatched 큐에 저장 → 관리자가 수동 매칭
  const nameValid = name && name.length >= 2 && name.length <= 20;
  if (!nameValid) {
    const id = crypto.randomUUID();
    const fallbackRecord = {
      id,
      senderName: rawText.slice(0, 30) || "미확인",
      amount,
      timestamp: ts,
      source: "kakaobank",
      rawText,
      createdAt: now,
      matchedAt: null,
      matchedStudentId: null,
      confidence: "parse_error",
    };
    await env.RATE_LIMIT_KV.put(
      `pending:unmatched:${id}`,
      JSON.stringify(fallbackRecord),
      { expirationTtl: 604800 }
    );
    return json({ ok: true, matched: false, confidence: "parse_error" });
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
      { expirationTtl: 604800 }  // 7d TTL
    );
    return json({ ok: true, matched: true, studentId: match.id, confidence });
  } else {
    // Try split-name match for concatenated multi-child names (e.g. "홍길동김개똥")
    if (confidence === "no_match" && name.length >= 4) {
      const candidates = splitNameCandidates(name);
      for (const [n1, n2] of candidates) {
        const m1 = fuzzyMatchStudent(n1, students);
        const m2 = fuzzyMatchStudent(n2, students);
        const ok1 = m1.confidence === "exact" || m1.confidence === "fuzzy_1";
        const ok2 = m2.confidence === "exact" || m2.confidence === "fuzzy_1";
        if (ok1 && ok2) {
          for (const [nm, mt] of [[n1, m1], [n2, m2]]) {
            const rid = crypto.randomUUID();
            const splitRec = {
              id: rid,
              senderName: nm,
              amount: mt.match.monthlyFee || 0,
              timestamp: ts,
              source: "kakaobank",
              rawText,
              createdAt: now,
              matchedAt: now,
              matchedStudentId: mt.match.id,
              confidence: "split_name",
            };
            await env.RATE_LIMIT_KV.put(
              `pending:matched:${rid}`,
              JSON.stringify(splitRec),
              { expirationTtl: 604800 }
            );
          }
          return json({ ok: true, matched: true, split: true, names: [n1, n2] });
        }
      }
    }

    // Unmatched — store for manual review
    await env.RATE_LIMIT_KV.put(
      `pending:unmatched:${id}`,
      JSON.stringify(record),
      { expirationTtl: 604800 }
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
  const jwtRole = String(payload?.role || "").toLowerCase();
  if (jwtRole !== "admin" && jwtRole !== "manager") {
    return json({ error: "Forbidden" }, 403);
  }

  // 2. Drain all pending:* keys from KV
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

// Constant-time comparison to prevent timing attacks (ASVS V2)
// 랜덤 키 HMAC + XOR 누적 → JS 엔진의 string short-circuit 우회
async function timingSafeEqual(a, b) {
  const enc = new TextEncoder();
  const aB = enc.encode(a);
  const bB = enc.encode(b);
  if (aB.length !== bB.length) return false;
  const key = await crypto.subtle.generateKey({ name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const [s1, s2] = await Promise.all([
    crypto.subtle.sign("HMAC", key, aB),
    crypto.subtle.sign("HMAC", key, bB),
  ]);
  const v1 = new Uint8Array(s1);
  const v2 = new Uint8Array(s2);
  let diff = 0;
  for (let i = 0; i < v1.length; i++) diff |= v1[i] ^ v2[i];
  return diff === 0;
}

// Inline rate limiter (mirrors _utils/ratelimit.js — avoids cross-function import)
async function checkRateLimit(kv, userId, limit) {
  if (!kv) return false; // fail closed — KV 미바인딩 시 차단
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
// Split a concatenated name "홍길동김개똥" into candidate pairs.
// Korean names are 2-4 chars; try split positions 2 and 3.
function splitNameCandidates(name) {
  const pairs = new Set();
  const n = name.length;
  for (let i = 2; i <= Math.min(4, n - 2); i++) {
    pairs.add(JSON.stringify([name.slice(0, i), name.slice(i)]));
  }
  return [...pairs].map(p => JSON.parse(p));
}

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

// Parse KakaoBank notification text — multiple formats:
// Format A:  "[카카오뱅크] 홍길동 150,000원 입금"
// Format B:  "05/08 15:36\n입금 150,000원\n홍길동"  (실제 앱 알림)
// Format B2: "입금\n150,000원\n홍길동"              (일부 기기 줄바꿈 변형)
// Format C:  "홍길동님이 150,000원을 보내셨어요"    (카카오뱅크 문자/알림 변형)
// Format D:  "150,000원 입금\n홍길동"               (역순 포맷)
// Format E:  카카오뱅크 SMS — "[Web발신]\n[카카오뱅크]\n...\n입금 N원\n입금자명"
function parseRawText(text) {
  // Format E — 카카오뱅크 SMS (가장 먼저 체크 — 구체적 포맷)
  // "[Web발신]\n[카카오뱅크]\n계좌주(계좌번호)\nMM/DD HH:mm\n입금 N원\n입금자명"
  const mE = text.match(/\[카카오뱅크\][\s\S]*?입금\s+([\d,]+)원\s*[\r\n]+([^\r\n]{2,30})/);
  if (mE) {
    const senderRaw = mE[2].trim().replace(/\s+/g, " ");
    if (senderRaw.length >= 2) return { name: senderRaw, amount: parseInt(mE[1].replace(/,/g, "")) || 0 };
  }

  // Format A
  const mA = text.match(/(?:\[.*?\]\s*)?([가-힣a-zA-Z]{2,10})\s+([\d,]+)원\s*입금/);
  if (mA) return { name: mA[1], amount: parseInt(mA[2].replace(/,/g, "")) || 0 };

  // Format B / B2 — "입금 N원" 뒤 줄바꿈 후 이름 (줄바꿈 개수 유연하게)
  const mB = text.match(/입금\s*[\r\n]?\s*([\d,]+)원[\r\n\s]+([가-힣a-zA-Z]{2,10})/);
  if (mB) {
    const senderName = mB[2].split(/\s*→\s*/)[0].trim();
    return { name: senderName, amount: parseInt(mB[1].replace(/,/g, "")) || 0 };
  }

  // Format C — "N원을 보내셨어요" 계열
  const mC = text.match(/([가-힣a-zA-Z]{2,10})님[이가]?\s*([\d,]+)원/);
  if (mC) return { name: mC[1], amount: parseInt(mC[2].replace(/,/g, "")) || 0 };

  // Format D — 금액 먼저, 이름 나중
  const mD = text.match(/([\d,]+)원\s*입금[\r\n\s]+([가-힣a-zA-Z]{2,10})/);
  if (mD) return { name: mD[2], amount: parseInt(mD[1].replace(/,/g, "")) || 0 };

  return { name: "", amount: 0 };
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
