// KV key: rl:{uid}:{minute_bucket} — TTL 2 minutes
export async function checkRateLimit(kv, userId, limit = 20) {
  if (!kv) throw new Error("RATE_LIMIT_KV 바인딩이 없습니다 — wrangler.toml의 [[kv_namespaces]] 설정을 확인하세요");
  const bucket = Math.floor(Date.now() / 60000);
  const key = `rl:${userId}:${bucket}`;
  const val = await kv.get(key);
  const count = val ? parseInt(val, 10) : 0;
  if (count >= limit) return false;
  await kv.put(key, String(count + 1), { expirationTtl: 120 });
  return true;
}
