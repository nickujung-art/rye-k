// care-message.js — 이탈 위험 회원 단건 케어 메시지 초안 생성 (AI-03)
import { callGemini } from "./_utils/gemini.js";
import { stripPii } from "./_utils/pii-guard.js";
import { buildNameMap, deanonymize } from "./_utils/anonymize.js";

export async function onRequest(context) {
  const { request, env } = context;
  let body;
  try { body = await request.json(); } catch { return err(400, "Bad Request"); }
  body = stripPii(body);

  const { name, consecutive, rate, score, teacherName } = body;
  if (!name) return err(400, "name required");

  // SEC-08: 이름 익명화
  const nameMap = buildNameMap([name]);
  const anonName = nameMap[name] || name;

  const level = score >= 50 ? "위험" : "주의";
  const system = "당신은 국악 교육기관 RYE-K의 학원 관리 AI 비서입니다. 이탈 위험 회원의 학부모에게 보낼 따뜻하고 진심 어린 케어 메시지 초안을 한국어로 작성합니다. 300자 이내로 간결하게 작성하세요.";
  const lines = [
    `회원: ${anonName}`,
    consecutive >= 2 ? `연속 결석 ${consecutive}회` : null,
    rate != null ? `최근 4주 출석률 ${rate}%` : null,
    `위험도: ${level}`,
    teacherName ? `담당 강사: ${teacherName}` : null,
    "\n학부모에게 보낼 케어 메시지 초안을 1개만 작성하세요. 인사말부터 마무리까지 완성된 형태로 작성하세요.",
  ].filter(Boolean);

  try {
    const raw = await callGemini(env.GEMINI_API_KEY, {
      system,
      user: lines.join("\n"),
      max_tokens: 400,
      temperature: 0.5,
    });
    // SEC-08: 익명 이름 복원
    const result = Object.keys(nameMap).length ? deanonymize(raw, nameMap) : raw;
    return json({ result });
  } catch (e) {
    console.error("care-message AI error:", e);
    if (e.status === 429) return new Response("Too Many Requests", { status: 429 });
    return err(500, e.message);
  }
}

const json = (d, s = 200) => new Response(JSON.stringify(d), { status: s, headers: { "content-type": "application/json" } });
const err  = (s, m)      => new Response(JSON.stringify({ error: m }), { status: s, headers: { "content-type": "application/json" } });
