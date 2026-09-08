async function supabaseGet(path) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase credentials are not configured.");
  const result = await fetch(`${url}/rest/v1/${path}`, { headers: { apikey: key, Authorization: `Bearer ${key}` } });
  if (!result.ok) throw new Error(`Supabase query failed (${result.status}).`);
  return result.json();
}

async function supabasePatch(path, body) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const result = await fetch(`${url}/rest/v1/${path}`, {
    method: "PATCH",
    headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json", Prefer: "return=minimal" },
    body: JSON.stringify(body)
  });
  if (!result.ok) throw new Error(`Supabase update failed (${result.status}).`);
}

export default async function handler(request, response) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    return response.status(405).json({ error: "Method not allowed." });
  }

  if (!process.env.OPENAI_API_KEY) {
    return response.status(200).json({ classified: false });
  }

  const answerId = Number(request.body?.answerId);
  if (!Number.isSafeInteger(answerId) || answerId <= 0) {
    return response.status(400).json({ error: "A valid answerId is required." });
  }

  try {
    // Re-fetch the real submitted text server-side instead of trusting the client payload.
    const [answerRow] = await supabaseGet(`user_answers?id=eq.${answerId}&select=answer`);
    const text = String(answerRow?.answer || "").trim().slice(0, 500);
    if (!text) return response.status(200).json({ classified: false });

    const completion = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0,
        max_tokens: 5,
        messages: [
          { role: "system", content: "Classify the sentiment of the user's feedback text as exactly one word: positive, neutral, or negative. Reply with only that one word." },
          { role: "user", content: text }
        ]
      })
    });

    if (!completion.ok) throw new Error(`OpenAI request failed (${completion.status}).`);
    const completionData = await completion.json();
    const raw = String(completionData?.choices?.[0]?.message?.content || "").trim().toLowerCase();
    const sentiment = ["positive", "neutral", "negative"].includes(raw) ? raw : null;
    if (!sentiment) return response.status(200).json({ classified: false });

    await supabasePatch(`user_answers?id=eq.${answerId}`, { sentiment });
    return response.status(200).json({ classified: true, sentiment });
  } catch (error) {
    console.error("Sentiment classification failed", error);
    return response.status(200).json({ classified: false });
  }
}
