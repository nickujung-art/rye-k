const PII_KEYS = new Set([
  "phone", "guardianPhone", "email", "address",
  "bizNumber", "contactEmail", "contactPhone",
]);

export function stripPii(obj) {
  if (!obj || typeof obj !== "object") return obj;
  if (Array.isArray(obj)) return obj.map(stripPii);
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    if (PII_KEYS.has(k)) continue;
    out[k] = typeof v === "object" ? stripPii(v) : v;
  }
  return out;
}
