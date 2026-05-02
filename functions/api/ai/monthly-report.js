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

  const isAdult = audience === "adult_self";
  const audienceBlock = isAdult
    ? `**수신자 = 성인 회원 본인** (학부모 아님)
- 호칭: "회원님" 또는 이름 + "님" (예: "민지 님"). "자녀분"·"학생"·"아드님/따님" 절대 금지.
- 어조: 정중하고 동등한 성인 대 성인. 본인이 직접 한 달 학습을 돌아보도록 정리.
- 인사 예: "한 달간 ○○ 수업 정성껏 임해 주셨습니다."
- 마무리 예: "다음 달도 함께 좋은 시간 만들어가요."
- 주어: "회원님께서는…" / "이번 달 회원님은…"`
    : `**수신자 = 학부모/보호자** (자녀가 미성년 학습자)
- 호칭: "학부모님" 또는 자녀 이름 + "(이)의 보호자분께". "회원님" 절대 금지.
- 어조: 따뜻하고 자상한 보고 톤. 자녀의 모습을 전하는 느낌.
- 인사 예: "안녕하세요, ○○ 학부모님."
- 마무리 예: "댁에서도 따뜻한 격려 부탁드립니다."
- 주어: "○○이는…" / "자녀분께서는…" / 학생 이름 직접 사용`;

  const { total, present, absent, late, excused, rate } = attendanceSummary || {};
  const instrumentStr = Array.isArray(instruments) ? instruments.join(", ") : (instruments || "");
  const trendStr = TREND_LABELS[conditionTrend] || "안정";

  const systemPrompt = `당신은 국악(한국 전통 음악) 교육기관의 월간 리포트 작성 보조입니다.

핵심 임무: 강사가 한 달 동안 작성한 모든 레슨노트를 종합·요약하여, 실제로 그 달에 배운 곡·기법·진도가 수신자에게 생생하게 전달되는 리포트를 작성하세요.

# 톤·수신자 (반드시 준수)
${audienceBlock}

# 국악 도메인 (참고)
가야금·거문고·해금·대금·단소·피리·장구 등 악기명, 산조(진양조→중머리→자진머리)·정악·민요·판소리·영산회상 등 형식, 농현·시김새·추성·퇴성·술대 등 주법 용어는 원어 그대로 사용하고 영어로 번역하지 마세요.

# 작성 규칙
- **레슨노트에 등장한 구체적인 곡명·악장·기법을 반드시 한 번 이상 인용하세요** (예: "진양조 4장", "농현 표현", "산조 휘머리 도입").
- 레슨노트가 비어있는 항목은 추측해서 만들어내지 마세요.
- 한 달 흐름이 보이도록 시간순으로 진도를 정리하세요 (월초 → 월말).
- 일반론 금지 ("열심히 하셨습니다" 같은 추상적 문장 최소화).
- 위 호칭·주어 규칙은 리포트 전반(인사부터 마무리까지) 일관되게 유지하세요.

# 리포트 구조
1. **한 달 요약** — 출석·전반적 태도·이번달 핵심 진도 (2-3문장)
2. **이번 달 학습 흐름** — 레슨노트의 진도/곡/기법을 시간순 정리 (3-5문장)
3. **잘한 점** — 구체적인 사례 1-2개 (레슨노트 발췌 기반)
4. **다음 달 권장 사항** — 실행 가능한 1-2개 (레슨노트 과제 기반)
5. **격려 마무리** — 1-2문장

# 길이·완결성 (필수)
- **반드시 5개 섹션 모두를 끝까지 완성하세요.** 중간에 멈추거나 문장을 잘라먹지 마세요.
- 각 섹션은 위에 명시된 문장 수를 넘기지 마세요. 짧고 밀도 있게.
- 마지막 문장은 반드시 **마침표(.)·물음표·느낌표** 등 종결부호로 끝나야 합니다.
- 전체 길이는 한국어 600~900자 수준으로 유지하세요.`;

  const lines = [
    `회원: ${studentName}`,
    instrumentStr ? `과목: ${instrumentStr}` : null,
    `기간: ${month}`,
    total != null ? `출석: 총 ${total}회 (출석 ${present} / 결석 ${absent} / 지각 ${late} / 사유결석 ${excused}), 출석률 ${rate}%` : null,
    `컨디션 추이: ${trendStr}`,
    noteSummaries?.length ? `이번 달 레슨노트 (${noteSummaries.length}건, 날짜순):\n${noteSummaries.join("\n\n")}` : `이번 달 레슨노트 없음 — 일반적인 격려 톤으로 작성`,
    commentCount > 0 ? `학부모/회원 댓글: ${commentCount}건 (적극적인 소통)` : null,
  ].filter(Boolean);

  try {
    const result = await callAnthropic(env.GEMINI_API_KEY, {
      system: systemPrompt,
      user: lines.join("\n"),
      max_tokens: 3000,
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
