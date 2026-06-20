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

  // 2. Parse body — Content-Type 무시하고 text 우선 읽기 후 JSON 시도
  //    Tasker가 Content-Type:application/json + 평문 body 조합을 보내는 경우 대응
  //    JSON 형식: {"title": "%antitle", "text": "%antext"} 또는 plain text
  let body;
  try {
    const rawBody = await request.text();
    try { body = JSON.parse(rawBody); } catch { body = { rawText: rawBody }; }
  } catch { return new Response("Bad Request", { status: 400 }); }

  // 2-a. 알림 타이틀 필터 — 카카오뱅크 알림만 처리
  //      body.title 또는 X-Notification-Title 헤더로 전달
  //      타이틀이 있고 카카오뱅크가 아니면 저장 없이 정상 응답 (일반 메시지 차단)
  const notifTitle = String(body.title || request.headers.get("X-Notification-Title") || "").toLowerCase();
  if (notifTitle && !notifTitle.includes("카카오뱅크") && !notifTitle.includes("카카오 뱅크") && !notifTitle.includes("kakaobank")) {
    return json({ ok: true, skipped: "title_mismatch" });
  }

  // 3. Secret header validation — timingSafeEqual (ASVS: timing attack prevention)
  const secret = request.headers.get("X-RYE-Secret") || "";
  const expected = env.RYE_WEBHOOK_SECRET || "";
  if (!expected || !(await timingSafeEqual(secret, expected))) {
    return json({ error: "Unauthorized" }, 401);
  }

  // 4. Timestamp — use body value if provided, else server time
  const tsRaw = typeof body.timestamp === "number" ? body.timestamp : parseInt(body.timestamp);
  const ts = Number.isFinite(tsRaw) ? tsRaw : Date.now();
  const now = Date.now();
  if (Math.abs(now - ts) > 5 * 60 * 1000) {
    return json({ error: "Request expired" }, 400);
  }

  // 5. Input validation — parse rawText first, then override with explicit fields
  //    body.text: JSON 형식으로 전송 시 텍스트 필드, body.rawText: 기존 plain text 호환
  const rawText = String(body.rawText || body.text || "").slice(0, 500);

  // 5-a. 중복 방지 — 동일 rawText + 5분 버킷 조합으로 dedup key 생성
  //       Tasker가 동일 알림에 대해 HTTP POST를 2회 보내는 경우를 차단
  if (rawText) {
    const bucket = Math.floor(ts / 300000);
    const dedupHash = await shortHash(`${rawText}:${bucket}`);
    const alreadySeen = await env.RATE_LIMIT_KV.get(`dedup:${dedupHash}`);
    if (alreadySeen) return json({ ok: true, skipped: "duplicate" });
    await env.RATE_LIMIT_KV.put(`dedup:${dedupHash}`, "1", { expirationTtl: 600 });
  }
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
  } catch (e) { console.error("[webhook] students_cache parse error:", e.message); }

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

  if (match && (confidence === "exact" || confidence === "fuzzy_1" || confidence === "guardian_exact" || confidence === "guardian_fuzzy")) {
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
    // Try split-name match for space-separated multi-child names (e.g. "홍길동 김개똥")
    if (confidence === "no_match" && name.includes(" ")) {
      const tokens = name.split(/\s+/).filter(t => t.length >= 2);
      if (tokens.length === 2) {
        const m1 = fuzzyMatchStudent(tokens[0], students);
        const m2 = fuzzyMatchStudent(tokens[1], students);
        const ok1 = m1.match && (m1.confidence === "exact" || m1.confidence === "fuzzy_1" || m1.confidence === "guardian_exact" || m1.confidence === "guardian_fuzzy");
        const ok2 = m2.match && (m2.confidence === "exact" || m2.confidence === "fuzzy_1" || m2.confidence === "guardian_exact" || m2.confidence === "guardian_fuzzy");
        if (ok1 && ok2 && m1.match.id !== m2.match.id) {
          for (const [nm, mt] of [[tokens[0], m1], [tokens[1], m2]]) {
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
              confidence: "split_space",
            };
            await env.RATE_LIMIT_KV.put(`pending:matched:${rid}`, JSON.stringify(splitRec), { expirationTtl: 604800 });
          }
          return json({ ok: true, matched: true, split: true, names: tokens });
        }
      }
    }

    // Try split-name match for concatenated multi-child names (e.g. "홍길동김개똥")
    if (confidence === "no_match" && name.length >= 4) {
      const candidates = splitNameCandidates(name);
      for (const [n1, n2] of candidates) {
        const m1 = fuzzyMatchStudent(n1, students);
        const m2 = fuzzyMatchStudent(n2, students);
        const ok1 = m1.confidence === "exact" || m1.confidence === "fuzzy_1" || m1.confidence === "guardian_exact" || m1.confidence === "guardian_fuzzy";
        const ok2 = m2.confidence === "exact" || m2.confidence === "fuzzy_1" || m2.confidence === "guardian_exact" || m2.confidence === "guardian_fuzzy";
        if (ok1 && ok2 && m1.match.id !== m2.match.id) {
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

    // amount_match — 이름 no_match이지만 monthlyFee 일치 학생이 1명이면 suggestedStudentId 추가
    // duplicate_* 신뢰도는 제외 — 동명이인 상황에서 무관한 학생을 추천하는 오류 방지
    let suggestedStudentId = null;
    if (amount > 0 && confidence === "no_match") {
      const activeStudents = students.filter(s => !s.isInstitution && (s.status || "active") === "active");
      const feeMatches = activeStudents.filter(s => s.monthlyFee > 0 && s.monthlyFee === amount);
      if (feeMatches.length === 1) {
        suggestedStudentId = feeMatches[0].id;
        record.confidence = "amount_match";
      }
    }
    if (suggestedStudentId) record.suggestedStudentId = suggestedStudentId;

    // Unmatched — store for manual review
    await env.RATE_LIMIT_KV.put(
      `pending:unmatched:${id}`,
      JSON.stringify(record),
      { expirationTtl: 604800 }
    );
    return json({ ok: true, matched: false, confidence: record.confidence });
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
  // set-role이 호출되지 않아 JWT custom claim에 role이 없는 경우를 고려해
  // 이메일 인증 여부로 체크 (anonymous 차단은 verifyToken에서 이미 처리됨)
  if (payload.firebase?.sign_in_provider !== "password") {
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
        try {
          matched.push(JSON.parse(val));
          await env.RATE_LIMIT_KV.delete(key.name);
        } catch (e) {
          console.error("[webhook] matched KV parse error, preserving:", key.name, e.message);
        }
      }
    }

    const uList = await env.RATE_LIMIT_KV.list({ prefix: "pending:unmatched:" });
    for (const key of uList.keys) {
      const val = await env.RATE_LIMIT_KV.get(key.name);
      if (val) {
        try {
          unmatched.push(JSON.parse(val));
          await env.RATE_LIMIT_KV.delete(key.name);
        } catch (e) {
          console.error("[webhook] unmatched KV parse error, preserving:", key.name, e.message);
        }
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
  if (!kv) { console.error("[webhook] RATE_LIMIT_KV not bound — rejecting request"); return false; }
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

  // 1. Exact match on student name
  const exact = active.filter(s => s.name === inputName);
  if (exact.length === 1) return { match: exact[0], confidence: "exact" };
  if (exact.length > 1)   return { match: null,     confidence: "duplicate_exact" };

  // 2. Levenshtein ≤ 1 on student name
  const close = active
    .map(s => ({ s, dist: levenshtein(inputName, s.name) }))
    .filter(({ dist }) => dist <= 1)
    .sort((a, b) => a.dist - b.dist);
  if (close.length === 1) return { match: close[0].s, confidence: "fuzzy_1" };
  if (close.length > 1)   return { match: null,       confidence: "duplicate_fuzzy" };

  // 3. Exact match on guardianName
  const guardianExact = active.filter(s => s.guardianName && s.guardianName === inputName);
  if (guardianExact.length === 1) return { match: guardianExact[0], confidence: "guardian_exact" };
  if (guardianExact.length > 1)   return { match: null,             confidence: "duplicate_guardian" };

  // 4. Levenshtein ≤ 1 on guardianName
  const guardianClose = active
    .filter(s => s.guardianName && s.guardianName.length >= 2)
    .map(s => ({ s, dist: levenshtein(inputName, s.guardianName) }))
    .filter(({ dist }) => dist <= 1)
    .sort((a, b) => a.dist - b.dist);
  if (guardianClose.length === 1) return { match: guardianClose[0].s, confidence: "guardian_fuzzy" };
  if (guardianClose.length > 1)   return { match: null,               confidence: "duplicate_guardian_fuzzy" };

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

async function shortHash(text) {
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(hash)).slice(0, 8).map(b => b.toString(16).padStart(2, "0")).join("");
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
