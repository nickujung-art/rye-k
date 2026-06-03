// functions/api/payments/sync-students.js
// POST /api/payments/sync-students
// 브라우저 앱 → Worker → KV students_cache 갱신
// Auth: Firebase JWT Bearer + body.role ("admin"|"manager"만 허용)

import { verifyToken } from "../ai/_utils/auth.js";

export async function onRequest(context) {
  const { request, env } = context;
  const method = request.method;

  // CORS preflight
  if (method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });
  }

  if (method !== "POST") return new Response("Method Not Allowed", { status: 405 });

  // 1. Firebase JWT 인증
  const payload = await verifyToken(request);
  if (!payload) return json({ error: "Unauthorized" }, 401);

  // 2. Body 파싱
  let body;
  try { body = await request.json(); }
  catch { return json({ error: "Bad Request" }, 400); }

  // 3. 역할 체크 — JWT payload의 custom claim에서 role 읽기 (body.role 신뢰 금지)
  const jwtRole = String(payload?.role || "").toLowerCase();
  if (jwtRole !== "admin" && jwtRole !== "manager") {
    return json({ error: "Forbidden" }, 403);
  }

  // 4. 학생 목록 수신 및 필터
  const raw = Array.isArray(body.students) ? body.students : [];
  const filtered = raw
    .filter(s => s && typeof s.id === "string" && typeof s.name === "string")
    .filter(s => !s.isInstitution && (s.status || "active") === "active")
    .map(s => ({
      id: s.id,
      name: s.name,
      status: s.status || "active",
      guardianName: (s.guardianName || "").trim(),
      monthlyFee: typeof s.monthlyFee === "number" ? s.monthlyFee : 0,
    }));

  // 5. KV 저장 — TTL 72h (3일, webhook이 같은 TTL 사용)
  try {
    await env.RATE_LIMIT_KV.put(
      "students_cache",
      JSON.stringify(filtered),
      { expirationTtl: 259200 }
    );
  } catch (e) {
    return json({ error: "KV write failed", detail: e.message }, 500);
  }

  return json({ ok: true, count: filtered.length });
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
