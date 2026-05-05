import { callGemini } from "./_utils/gemini.js";
import { stripPii } from "./_utils/pii-guard.js";

export async function onRequest(context) {
  const { request, env } = context;

  let body;
  try { body = await request.json(); } catch { return new Response("Bad Request", { status: 400 }); }

  body = stripPii(body);
  const { progress, assignment, content, instrument, audience } = body;

  const audienceLabel = audience === "adult_self" ? "성인 회원이 집에서 혼자 연습할 수 있도록" : "학생/학부모가 일주일 동안 집에서";

  const systemPrompt = `당신은 국악(한국 전통 음악) 교육 보조입니다.

국악 도메인 지식 (참고):
- 주요 악기: 가야금, 거문고, 해금, 아쟁, 대금, 소금, 단소, 피리, 태평소, 장구, 북, 꽹과리
- 음악 형식: 산조(진양조→중머리→중중머리→자진머리→휘머리), 정악, 민요, 판소리, 시조, 가곡, 영산회상
- 주요 주법: 농현(가야금/거문고 떨림), 시김새(꾸밈음), 추성·퇴성(해금 음정 변화), 술대(거문고)
- 연습 강조점: 호흡, 장단(박자), 시김새 표현, 음색 균형

강사 레슨노트를 바탕으로 ${audienceLabel} 어떻게 연습하면 좋을지 안내하세요.

작성 규칙:
- "이번 주 과제는 …" 같이 **과제**라는 단어를 자연스럽게 포함하세요.
- 노트에 명시된 곡·기법·진도 맥락에 맞춰 구체적으로 (예: "진양조의 느린 박자에서 호흡을 길게 가져가세요").
- 일반론 금지 ("꾸준히 연습하세요" 같은 추상적 문장 금지).
- 짧고 실행 가능한 항목 3개. 번호 매김 (1. 2. 3.).
- 한국 국악 용어는 그대로 사용 (영어 번역 금지).
- 짧은 마무리 인사 1문장으로 끝내세요.`;

  const lines = [];
  if (progress) lines.push(`오늘 진도: ${progress}`);
  if (content) lines.push(`수업 내용: ${content}`);
  if (assignment) lines.push(`과제: ${assignment}`);
  if (instrument) lines.push(`과목: ${instrument}`);

  if (!lines.length) {
    return json({ error: "lesson note content required" }, 400);
  }

  try {
    const result = await callGemini(env.GEMINI_API_KEY, {
      model: "claude-haiku-4-5-20251001",
      system: systemPrompt,
      user: lines.join("\n"),
      max_tokens: 800,
      temperature: 0.4,
    });
    return json({ result });
  } catch (e) {
    console.error("practice-guide AI error:", e);
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
