import { auth } from "./firebase.js";
import { getIdToken } from "firebase/auth";

let _aiEnabled = true;
export function setAiEnabled(val) { _aiEnabled = val; }
export function isAiEnabled() { return _aiEnabled; }

async function getToken() {
  const user = auth.currentUser;
  if (!user) return null;
  try { return await getIdToken(user); } catch { return null; }
}

export async function callAi(endpoint, payload) {
  if (!_aiEnabled) throw new Error("ai_disabled");
  const token = await getToken();
  if (!token) throw new Error("auth_required");

  const resp = await fetch(`/api/ai/${endpoint}`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (resp.status === 401) throw new Error("auth_required");
  if (resp.status === 429) throw new Error("rate_limited");
  if (!resp.ok) throw new Error("api_error");
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
