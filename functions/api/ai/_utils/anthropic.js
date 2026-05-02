const ANTHROPIC_API = "https://api.anthropic.com/v1/messages";

export async function callAnthropic(apiKey, { model, system, user, max_tokens = 400, temperature = 0.3 }) {
  const resp = await fetch(ANTHROPIC_API, {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model,
      max_tokens,
      temperature,
      system,
      messages: [{ role: "user", content: user }],
    }),
  });
  if (!resp.ok) {
    const err = await resp.text().catch(() => String(resp.status));
    throw new Error(`Anthropic ${resp.status}: ${err}`);
  }
  const data = await resp.json();
  return data.content?.[0]?.text || "";
}
