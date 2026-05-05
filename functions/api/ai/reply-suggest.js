import { callGemini } from "./_utils/gemini.js";
import { stripPii } from "./_utils/pii-guard.js";

export async function onRequest(context) {
  const { request, env } = context;

  let body;
  try { body = await request.json(); } catch { return new Response("Bad Request", { status: 400 }); }

  body = stripPii(body);
  const { parentComment, keywords, audience, instrument } = body;

  if (!parentComment?.trim()) {
    return json({ error: "parentComment required" }, 400);
  }

  const audienceLabel = audience === "adult_self" ? "성인 회원 본인" : "학부모님";
  const instrumentStr = instrument || "";

  const systemPrompt = `당신은 국악(한국 전통 음악) 교육기관 강사의 답장 보조입니다. 회원 또는 학부모의 댓글에 대해 따뜻하고 정중한 강사 답장을 작성하세요. 강사의 키워드가 있으면 자연스럽게 반영하고, 없으면 댓글 내용에 맞는 적절한 답장을 작성하세요. 국악 악기명·곡명·주법 용어는 원어 그대로 사용하세요. 답장 텍스트만 반환하세요.`;

  const lines = [`${audienceLabel} 댓글: ${parentComment}`];
  if (keywords) lines.push(`강사 키워드: ${keywords}`);
  if (instrumentStr) lines.push(`과목: ${instrumentStr}`);

  try {
    const result = await callGemini(env.GEMINI_API_KEY, {
      model: "claude-haiku-4-5-20251001",
      system: systemPrompt,
      user: lines.join("\n"),
      max_tokens: 500,
      temperature: 0.5,
    });
    return json({ result });
  } catch (e) {
    console.error("reply-suggest AI error:", e);
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
