import { callGeminiTools } from "./_utils/anthropic.js";
import { stripPii } from "./_utils/pii-guard.js";

// 화이트리스트 — 클라이언트가 실행 가능한 함수만 허용
const QUERY_SCHEMA = [
  {
    name: "getStudentsByStatus",
    description: "특정 상태의 회원 목록. active=활성, paused=중지, withdrawn=탈퇴",
    parameters: { type: "OBJECT", properties: { status: { type: "STRING", enum: ["active","paused","withdrawn"] } }, required: ["status"] },
  },
  {
    name: "getRecentAbsences",
    description: "최근 N주 내 결석 횟수가 많은 회원. 기본 4주, minAbsences=2",
    parameters: { type: "OBJECT", properties: { weeks: { type: "NUMBER" }, minAbsences: { type: "NUMBER" } } },
  },
  {
    name: "getNewRegistrations",
    description: "최근 N개월 내 신규 등록 회원",
    parameters: { type: "OBJECT", properties: { months: { type: "NUMBER" } }, required: ["months"] },
  },
  {
    name: "getOverduePayments",
    description: "최근 N개월 이상 수납 미완료 회원. 기본 1개월",
    parameters: { type: "OBJECT", properties: { months: { type: "NUMBER" } } },
  },
  {
    name: "getTopAttendanceStudents",
    description: "출석률 TOP N명 회원. 기본 10명",
    parameters: { type: "OBJECT", properties: { limit: { type: "NUMBER" } } },
  },
  {
    name: "getStudentsByTeacher",
    description: "특정 강사 이름으로 담당 회원 조회",
    parameters: { type: "OBJECT", properties: { teacherName: { type: "STRING" } }, required: ["teacherName"] },
  },
  {
    name: "getStudentsByInstrument",
    description: "특정 악기 또는 과목(예: 가야금, 해금, 대금) 수강 회원 목록",
    parameters: { type: "OBJECT", properties: { instrument: { type: "STRING" } }, required: ["instrument"] },
  },
  {
    name: "searchStudentByName",
    description: "회원 이름으로 검색",
    parameters: { type: "OBJECT", properties: { query: { type: "STRING" } }, required: ["query"] },
  },
  {
    name: "getChurnRiskStudents",
    description: "이탈 위험 회원 분석. 연속 결석과 최근 4주 출석률 기준으로 이탈 위험도를 계산해 위험/주의 회원 목록 반환. '이탈', '위험 회원', '그만둘 것 같은' 등의 질문에 사용",
    parameters: { type: "OBJECT", properties: {} },
  },
  {
    name: "getMonthlyStats",
    description: "특정 월(YYYY-MM 형식)의 출석·수납 통계",
    parameters: { type: "OBJECT", properties: { ym: { type: "STRING" } }, required: ["ym"] },
  },
];

const ALLOWED = new Set(QUERY_SCHEMA.map(f => f.name));

export async function onRequest(context) {
  const { request, env } = context;
  let body;
  try { body = await request.json(); } catch { return err(400, "Bad Request"); }
  body = stripPii(body);
  const { question } = body;
  if (!question?.trim()) return err(400, "질문이 없습니다.");

  try {
    const result = await callGeminiTools(env.GEMINI_API_KEY, {
      system: "당신은 국악 교육기관 RYE-K의 데이터 쿼리 어시스턴트입니다. 사용자 질문에 가장 적합한 함수를 하나 선택하세요. 목록에 없는 질문은 함수를 호출하지 마세요.",
      user: question,
      tools: QUERY_SCHEMA,
      max_tokens: 150,
    });
    if (result.type !== "tool" || !ALLOWED.has(result.tool)) {
      return json({ type: "no_match" });
    }
    return json({ type: "tool", tool: result.tool, args: result.args });
  } catch (e) {
    console.error("query AI error:", e);
    if (e.status === 429) return new Response("Too Many Requests", { status: 429 });
    return err(500, e.message);
  }
}

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json" } });
const err = (status, msg) =>
  new Response(JSON.stringify({ error: msg }), { status, headers: { "content-type": "application/json" } });
