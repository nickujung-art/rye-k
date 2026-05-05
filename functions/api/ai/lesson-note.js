import { callGemini } from "./_utils/gemini.js";
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

  const systemPrompt = `당신은 국악(한국 전통 음악) 교육기관의 강사 글 다듬기 도우미입니다.

엄격한 규칙 (반드시 지킬 것):
1. 강사가 작성한 "원본" 텍스트만 다듬으세요. 새로운 내용을 절대 추가하지 마세요.
2. 원본에 없는 사실, 사건, 사례, 격려 문구를 만들어내지 마세요.
3. 원본의 길이를 크게 늘리지 마세요. 비슷한 길이로 표현만 자연스럽게 다듬으세요.
4. 원본이 짧거나 단편적이면 그 짧은 그대로 다듬으세요. 풀어 쓰거나 살을 붙이지 마세요.
5. 국악 용어(가야금·거문고·해금·대금·단소·피리·장구·산조·진양조·중머리·정악·민요·판소리·영산회상·농현·시김새·추성·퇴성 등)는 절대 변경하거나 영어로 번역하지 마세요.
6. 강사가 쓴 사실(컨디션·진도·태도)은 보존하세요.
7. 답변은 다듬은 텍스트만 반환하세요. 설명·인사말·머리말 금지.`;

  const lines = [`원본: ${inputText}`];
  if (conditionStr) lines.push(`학생 컨디션: ${conditionStr}`);
  if (instrumentStr) lines.push(`과목: ${instrumentStr}`);
  lines.push(`톤: ${audienceLabel}`);

  try {
    let result = await callGemini(env.GEMINI_API_KEY, {
      model: "claude-haiku-4-5-20251001",
      system: systemPrompt,
      user: lines.join("\n"),
      max_tokens: 600,
      temperature: 0.3,
    });

    if (Object.keys(nameMap).length) result = deanonymize(result, nameMap);

    return json({ result });
  } catch (e) {
    console.error("lesson-note AI error:", e);
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
