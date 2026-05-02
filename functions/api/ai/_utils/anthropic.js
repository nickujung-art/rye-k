const GEMINI_API = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

export async function callAnthropic(apiKey, { system, user, max_tokens = 400, temperature = 0.3 }) {
  const resp = await fetch(`${GEMINI_API}?key=${apiKey}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: system }] },
      contents: [{ role: "user", parts: [{ text: user }] }],
      generationConfig: { maxOutputTokens: max_tokens, temperature },
    }),
  });
  if (!resp.ok) {
    const err = await resp.text().catch(() => String(resp.status));
    const e = new Error(`Gemini ${resp.status}: ${err}`);
    e.status = resp.status;
    throw e;
  }
  const data = await resp.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
}
