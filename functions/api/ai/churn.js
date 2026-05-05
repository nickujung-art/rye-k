import { callAnthropic } from "./_utils/anthropic.js";
import { stripPii } from "./_utils/pii-guard.js";

export async function onRequest(context) {
  const { request, env } = context;
  let body;
  try { body = await request.json(); } catch { return err(400, "Bad Request"); }
  body = stripPii(body);

  const { students } = body;
  if (!Array.isArray(students) || students.length === 0) {
    return json({ comments: [] });
  }

  const top = students.slice(0, 5);

  const studentList = top.map(s => {
    const parts = [];
    if (s.consecutive >= 2) parts.push(`연속 결석 ${s.consecutive}회`);
    if (s.rate != null) parts.push(`최근 4주 출석률 ${s.rate}%`);
    const level = s.score >= 50 ? "위험" : "주의";
    return `- ${s.name}: ${parts.join(", ")} (위험도: ${level})`;
  }).join("\n");

  const system = "당신은 국악 교육기관 RYE-K의 학원 관리 AI 비서입니다. 이탈 위험 회원 데이터를 분석해 원장·매니저에게 실용적인 관리 조언을 한국어로 제공합니다.";
  const user = `다음 이탈 위험 회원들에 대해 JSON 배열로만 답변하세요. 각 항목 형식: {"name":"회원명","comment":"1-2문장 조언"}. 조언은 구체적이고 따뜻한 어조로 작성하세요. JSON 이외의 텍스트는 절대 포함하지 마세요.\n\n회원 데이터:\n${studentList}`;

  try {
    const text = await callAnthropic(env.GEMINI_API_KEY, {
      system,
      user,
      max_tokens: 500,
      temperature: 0.5,
    });

    let comments = [];
    try {
      const match = text.match(/\[[\s\S]*\]/);
      if (match) comments = JSON.parse(match[0]);
    } catch {}

    return json({ comments });
  } catch (e) {
    console.error("churn AI error:", e);
    if (e.status === 429) return new Response("Too Many Requests", { status: 429 });
    return err(500, e.message);
  }
}

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json" } });
const err = (status, msg) =>
  new Response(JSON.stringify({ error: msg }), { status, headers: { "content-type": "application/json" } });
