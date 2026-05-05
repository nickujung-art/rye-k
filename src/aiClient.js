import { auth, firebaseSignInAnon } from "./firebase.js";
import { getIdToken } from "firebase/auth";

let _aiEnabled = true;
export function setAiEnabled(val) { _aiEnabled = val; }
export function isAiEnabled() { return _aiEnabled; }

async function getToken() {
  let user = auth.currentUser;
  if (!user) {
    try {
      user = await firebaseSignInAnon();
    } catch (e) {
      console.error("[ai] anon failed:", e);
      return null;
    }
  }
  if (!user) return null;
  try {
    const t = await getIdToken(user);
    return t;
  } catch (e) {
    console.error("[ai] getIdToken failed:", e);
    return null;
  }
}

export async function callAi(endpoint, payload) {
  if (!_aiEnabled) throw new Error("ai_disabled");
  const token = await getToken();
  if (!token) throw new Error("no_token");

  const resp = await fetch(`/api/ai/${endpoint}`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (resp.status === 401) throw new Error("server_401");
  if (resp.status === 429) throw new Error("rate_limited");
  if (resp.status === 503) throw new Error("ai_disabled");
  if (!resp.ok) {
    let detail = "";
    try { const b = await resp.json(); detail = b.error || ""; } catch {}
    throw new Error(`api_error_${resp.status}${detail ? `:${detail}` : ""}`);
  }
  return resp.json();
}

export async function aiPolishLessonNote({ field, text, condition, instruments, audience, studentName }) {
  if (!text?.trim()) return text;
  const { result } = await callAi("lesson-note", { field, text, condition, instruments, audience, studentName });
  return result;
}

export async function aiSuggestReply({ parentComment, keywords, audience, instrument }) {
  if (!parentComment?.trim()) return "";
  const { result } = await callAi("reply-suggest", { parentComment, keywords, audience, instrument });
  return result;
}

export async function aiPolishPaymentMessage({ previewText, messageType, audience }) {
  if (!previewText?.trim()) return previewText;
  const { result } = await callAi("payment-tone", { previewText, messageType, audience });
  return result;
}

export async function aiSuggestPractice({ progress, assignment, content, instrument, audience }) {
  const { result } = await callAi("practice-guide", { progress, assignment, content, instrument, audience });
  return result;
}

export async function aiGenerateMonthlyReport({ studentName, instruments, audience, month, attendanceSummary, conditionTrend, noteSummaries, commentCount }) {
  const { result } = await callAi("monthly-report", { studentName, instruments, audience, month, attendanceSummary, conditionTrend, noteSummaries, commentCount });
  return result;
}

export async function aiPunctuate(text) {
  if (!text?.trim()) return text;
  const { result } = await callAi("punctuate", { text });
  return result;
}

export async function aiQuery(question) {
  if (!question?.trim()) return { type: "no_match" };
  return callAi("query", { question });
}

export async function aiChurnAnalysis(students) {
  if (!students?.length) return { comments: [] };
  const payload = students.slice(0, 5).map(s => ({ name: s.name, consecutive: s.consecutive, rate: s.rate, score: s.score }));
  return callAi("churn", { students: payload });
}
