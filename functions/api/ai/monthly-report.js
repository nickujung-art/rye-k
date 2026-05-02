import { callAnthropic } from "./_utils/anthropic.js";
import { stripPii } from "./_utils/pii-guard.js";

const TREND_LABELS = { improving: "향상", stable: "안정", declining: "하락" };

export async function onRequest(context) {
  const { request, env } = context;

  let body;
  try { body = await request.json(); } catch { return new Response("Bad Request", { status: 400 }); }

  body = stripPii(body);
  const { studentName, instruments, audience, month, attendanceSummary, conditionTrend, noteSummaries, commentCount } = body;

  if (!studentName || !month) {
    return json({ error: "required fields missing" }, 400);
  }

  const audienceLabel = audience === "adult_self"
    ? "회원에게 한 달 학습을 정리해 드리는 정중한 톤"
    : "학부모님께 자녀의 모습을 전하는 따뜻한 톤";

  const { total, present, absent, late, excused, rate } = attendanceSummary || {};
  const instrumentStr = Array.isArray(instruments) ? instruments.join(", ") : (instruments || "");
  const trendStr = TREND_LABELS[conditionTrend] || "안정";

  const systemPrompt = `당신은 국악(한국 전통 음악) 교육기관의 월간 학부모 리포트 작성 보조입니다. 한 달간의 출석·레슨노트·태도 데이터를 바탕으로 따뜻하고 구체적인 리포트를 작성하세요.

국악 도메인: 가야금·거문고·해금·대금·단소·피리·장구 등 악기명, 산조·정악·민요·판소리·영산회상 등 형식, 농현·시김새·추성·퇴성 등 주법 용어는 원어 그대로 사용하세요. 배운 곡·기법을 구체적으로 언급하세요.

구조:
1. 한 달 요약 (출석·진도·태도, 2-3문장)
2. 잘한 점 (구체 사례 1-2개, 레슨노트 내용 활용)
3. 다음 달 권장 사항 (실행 가능한 1-2개)
4. 격려/마무리

톤: ${audienceLabel}

주의: 자연스럽고 개인화된 리포트를 작성하세요. 데이터가 없으면 일반적인 격려 문구로 대체하세요.`;

  const lines = [
    `회원: ${studentName}`,
    instrumentStr ? `과목: ${instrumentStr}` : null,
    `기간: ${month}`,
    total != null ? `출석: 총 ${total}회 (출석 ${present} / 결석 ${absent} / 지각 ${late} / 사유결석 ${excused}), 출석률 ${rate}%` : null,
    `컨디션 추이: ${trendStr}`,
    noteSummaries?.length ? `레슨노트:\n${noteSummaries.join("\n")}` : null,
    commentCount > 0 ? `학부모/회원 댓글: ${commentCount}건` : null,
  ].filter(Boolean);

  try {
    const result = await callAnthropic(env.GEMINI_API_KEY, {
      model: "claude-sonnet-4-6",
      system: systemPrompt,
      user: lines.join("\n"),
      max_tokens: 800,
      temperature: 0.4,
    });
    return json({ result });
  } catch (e) {
    console.error("monthly-report AI error:", e);
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
