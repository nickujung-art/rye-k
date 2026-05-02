import { callAnthropic } from "./_utils/anthropic.js";
import { stripPii } from "./_utils/pii-guard.js";

export async function onRequest(context) {
  const { request, env } = context;

  let body;
  try { body = await request.json(); } catch { return new Response("Bad Request", { status: 400 }); }

  body = stripPii(body);
  const { progress, assignment, content, instrument, audience } = body;

  const audienceLabel = audience === "adult_self" ? "성인 회원이 집에서 혼자 연습할 수 있도록" : "학생/학부모가 일주일 동안 집에서";

  const systemPrompt = `당신은 국악 교육 보조입니다. 강사 레슨노트를 바탕으로 ${audienceLabel} 어떻게 연습하면 좋을지 부드럽게 안내하는 카드를 작성하세요. 짧고 실행 가능한 항목 3개로 구성하세요. 번호를 붙여 명확하게 작성하세요. 한국 국악 용어는 그대로 사용하세요.`;

  const lines = [];
  if (progress) lines.push(`오늘 진도: ${progress}`);
  if (content) lines.push(`수업 내용: ${content}`);
  if (assignment) lines.push(`과제: ${assignment}`);
  if (instrument) lines.push(`과목: ${instrument}`);

  if (!lines.length) {
    return json({ error: "lesson note content required" }, 400);
  }

  try {
    const result = await callAnthropic(env.GEMINI_API_KEY, {
      model: "claude-haiku-4-5-20251001",
      system: systemPrompt,
      user: lines.join("\n"),
      max_tokens: 300,
      temperature: 0.4,
    });
    return json({ result });
  } catch (e) {
    console.error("practice-guide AI error:", e);
    return json({ error: "AI service error" }, 500);
  }
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  });
}
