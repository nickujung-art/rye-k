import { verifyToken } from "./_utils/auth.js";
import { checkRateLimit } from "./_utils/ratelimit.js";

export const onRequest = [
  async (context) => {
    const { request, env, next } = context;

    if (request.method !== "POST") {
      return new Response("Method Not Allowed", { status: 405 });
    }

    const payload = await verifyToken(request);
    if (!payload) {
      return new Response("Unauthorized", { status: 401 });
    }

    const allowed = await checkRateLimit(env.RATE_LIMIT_KV, payload.uid);
    if (!allowed) {
      return new Response("Too Many Requests", { status: 429 });
    }

    context.data.user = payload;
    return next();
  },
];
