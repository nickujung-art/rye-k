import { callGemini } from "./_utils/gemini.js";
import { stripPii } from "./_utils/pii-guard.js";

const TYPE_LABELS = {
  monthly_fee: "월 수강료 안내",
  unpaid_reminder: "미납 독촉",
  makeup_lesson: "보강 안내",
};

export async function onRequest(context) {
  const { request, env } = context;

  let body;
  try { body = await request.json(); } catch { return new Response("Bad Request", { status: 400 }); }

  body = stripPii(body);
  const { previewText, messageType, audience } = body;

  if (!previewText?.trim()) {
    return json({ error: "previewText required" }, 400);
  }

  const audienceLabel = audience === "adult_self" ? "성인 회원 본인" : "학부모님";
  const msgLabel = TYPE_LABELS[messageType] || messageType || "알림";

  const systemPrompt = `당신은 국악 교육기관 운영자의 메시지 보조입니다. 알림톡 메시지를 정중하고 따뜻한 톤으로 다듬으세요. 중요: 금액·계좌번호·날짜·시간 등 구체적인 수치와 정보는 절대 변경하지 마세요. 다듬은 메시지만 반환하세요.`;

  const userPrompt = `원본 메시지:\n${previewText}\n\n메시지 종류: ${msgLabel}\n수신자: ${audienceLabel}`;

  try {
    const result = await callGemini(env.GEMINI_API_KEY, {
      model: "claude-haiku-4-5-20251001",
      system: systemPrompt,
      user: userPrompt,
      max_tokens: 500,
      temperature: 0.3,
    });
    return json({ result });
  } catch (e) {
    console.error("payment-tone AI error:", e);
    if (e.status === 429) return new Response("Too Many Requests", { status: 429 });
    return json({ error: e.message }, 500);
  }
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  });
}
