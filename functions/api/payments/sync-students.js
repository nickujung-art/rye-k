// functions/api/payments/sync-students.js
// PAY-05 gap fix: populate students_cache KV so webhook can fuzzy-match deposits.
// POST /api/payments/sync-students — Firebase JWT auth required
// Called by browser before draining the pending KV queue.

import { verifyToken } from "../ai/_utils/auth.js";

export async function onRequest(context) {
  const { request, env } = context;

  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });
  }

  if (request.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  const payload = await verifyToken(request);
  if (!payload) return json({ error: "Unauthorized" }, 401);

  let body;
  try { body = await request.json(); }
  catch { return json({ error: "Bad Request" }, 400); }

  const students = Array.isArray(body.students) ? body.students : [];
  const safe = students
    .filter(s => s && typeof s.name === "string" && s.name.length > 0)
    .map(s => ({
      id: String(s.id || ""),
      name: String(s.name || ""),
      status: String(s.status || "active"),
      isInstitution: Boolean(s.isInstitution),
    }));

  try {
    await env.RATE_LIMIT_KV.put("students_cache", JSON.stringify(safe), { expirationTtl: 7200 });
  } catch (e) {
    return json({ error: "KV write failed" }, 500);
  }

  return json({ ok: true, count: safe.length });
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
