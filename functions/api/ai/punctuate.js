import { callAnthropic } from "./_utils/anthropic.js";
import { stripPii } from "./_utils/pii-guard.js";

export async function onRequest(context) {
  const { request, env } = context;
  let body;
  try { body = await request.json(); } catch { return new Response("Bad Request", { status: 400 }); }
  body = stripPii(body);
  const { text } = body;
  if (!text?.trim()) return json({ result: text || "" });

  try {
    const result = await callAnthropic(env.GEMINI_API_KEY, {
      model: "claude-haiku-4-5-20251001",
      system: `한국어 텍스트에 구두점(마침표, 쉼표, 물음표, 느낌표)을 자연스럽게 추가합니다.
규칙:
1. 단어·표현·내용은 절대 변경하지 마세요. 구두점만 추가하세요.
2. 국악 용어(가야금·해금·거문고·대금·피리·장구·산조·진양조·정악·민요 등)는 절대 수정하지 마세요.
3. 다듬은 텍스트만 반환하세요. 설명·인사말 없이.`,
      user: text,
      max_tokens: 400,
      temperature: 0.1,
    });
    return json({ result });
  } catch (e) {
    console.error("punctuate AI error:", e);
    if (e.status === 429) return new Response("Too Many Requests", { status: 429 });
    return json({ error: e.message }, 500);
  }
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json" } });
}
