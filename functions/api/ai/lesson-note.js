import { callAnthropic } from "./_utils/anthropic.js";
import { stripPii } from "./_utils/pii-guard.js";
import { buildNameMap, anonymize, deanonymize } from "./_utils/anonymize.js";

const CONDITION_LABELS = { excellent: "매우 좋음", good: "좋음", normal: "보통", poor: "부진" };

export async function onRequest(context) {
  const { request, env } = context;

  let body;
  try { body = await request.json(); } catch { return new Response("Bad Request", { status: 400 }); }

  body = stripPii(body);
  const { text, condition, instruments, audience, studentName } = body;

  if (!text?.trim()) {
    return json({ error: "text required" }, 400);
  }

  const safeMode = env.AI_SAFE_MODE === "true";
  const nameMap = (safeMode && studentName) ? buildNameMap([studentName]) : {};
  const inputText = Object.keys(nameMap).length ? anonymize(text, nameMap) : text;

  const audienceLabel = audience === "guardian" ? "학부모님께 알리는 톤" : "회원 본인에게 보고하는 톤";
  const conditionStr = CONDITION_LABELS[condition] || "";
  const instrumentStr = Array.isArray(instruments) ? instruments.join(", ") : (instruments || "");

  const systemPrompt = `당신은 국악 교육기관의 강사 보조입니다. 강사가 작성한 짧은 레슨노트를 정중한 한국어 문장으로 다듬어주세요. 사실은 변경하지 말고 표현만 다듬으세요. 한국 국악 용어는 보존하세요. 답변은 다듬은 텍스트만 반환하세요.`;

  const lines = [`원본: ${inputText}`];
  if (conditionStr) lines.push(`학생 컨디션: ${conditionStr}`);
  if (instrumentStr) lines.push(`과목: ${instrumentStr}`);
  lines.push(`톤: ${audienceLabel}`);

  try {
    let result = await callAnthropic(env.GEMINI_API_KEY, {
      model: "claude-haiku-4-5-20251001",
      system: systemPrompt,
      user: lines.join("\n"),
      max_tokens: 400,
      temperature: 0.3,
    });

    if (Object.keys(nameMap).length) result = deanonymize(result, nameMap);

    return json({ result });
  } catch (e) {
    console.error("lesson-note AI error:", e);
    return json({ error: e.message }, 500);
  }
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  });
}
