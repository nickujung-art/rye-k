// gemini.js — anthropic.js에서 이름 정리 (Phase 3 AI-01)
const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta/models";
const GEMINI_API = `${GEMINI_BASE}/gemini-2.5-flash:generateContent`;

export async function callGemini(apiKey, { system, user, max_tokens = 400, temperature = 0.3, thinkingBudget = 0 }) {
  const resp = await fetch(`${GEMINI_API}?key=${apiKey}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: system }] },
      contents: [{ role: "user", parts: [{ text: user }] }],
      generationConfig: {
        maxOutputTokens: max_tokens,
        temperature,
        // thinkingBudget=0 disables the model's internal reasoning so that the entire
        // maxOutputTokens budget is available for the visible response. For short
        // creative writing tasks (lesson notes, monthly reports) thinking adds
        // latency + cost without measurable quality gain and frequently consumes
        // 60-80% of the token budget — leaving the actual response truncated.
        thinkingConfig: { thinkingBudget },
      },
    }),
  });
  if (!resp.ok) {
    const err = await resp.text().catch(() => String(resp.status));
    const e = new Error(`Gemini ${resp.status}: ${err}`);
    e.status = resp.status;
    throw e;
  }
  const data = await resp.json();
  const cand = data.candidates?.[0];
  const text = cand?.content?.parts?.[0]?.text || "";
  if (cand?.finishReason === "MAX_TOKENS") {
    console.warn("Gemini truncated by MAX_TOKENS", { promptChars: (system?.length || 0) + (user?.length || 0), outputChars: text.length, max_tokens });
  }
  return text;
}

// Gemini function-calling: 함수 선택 결과만 반환 (Phase 2 자연어 쿼리용)
export async function callGeminiTools(apiKey, { system, user, tools, max_tokens = 200 }) {
  const resp = await fetch(`${GEMINI_BASE}/gemini-2.5-flash:generateContent?key=${apiKey}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      system_instruction: system ? { parts: [{ text: system }] } : undefined,
      contents: [{ role: "user", parts: [{ text: user }] }],
      tools: [{ function_declarations: tools }],
      generationConfig: { maxOutputTokens: max_tokens, temperature: 0.1 },
    }),
  });
  if (!resp.ok) {
    const err = await resp.text().catch(() => String(resp.status));
    const e = new Error(`Gemini ${resp.status}: ${err}`);
    e.status = resp.status;
    throw e;
  }
  const data = await resp.json();
  const part = data.candidates?.[0]?.content?.parts?.[0];
  if (part?.functionCall) {
    return { type: "tool", tool: part.functionCall.name, args: part.functionCall.args || {} };
  }
  return { type: "text" };
}
