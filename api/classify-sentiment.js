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

async function supabasePost(path, body) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const result = await fetch(`${url}/rest/v1/${path}`, {
    method: "POST",
    headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json", Prefer: "return=minimal" },
    body: JSON.stringify(body)
  });
  if (!result.ok) throw new Error(`Supabase insert failed (${result.status}).`);
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
    const [answerRow] = await supabaseGet(`user_answers?id=eq.${answerId}&select=answer,poll_id`);
    const text = String(answerRow?.answer || "").trim().slice(0, 500);
    if (!text) return response.status(200).json({ classified: false });

    const completion = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0,
        max_tokens: 40,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: "You moderate a single short piece of user-submitted feedback text, which may be written in any language. Reply with strict JSON only, no other text, in exactly this shape: {\"sentiment\": \"positive\"|\"neutral\"|\"negative\", \"restricted\": true|false}. Set \"restricted\" to true only if the text is primarily about politics, religion, or sexual content, regardless of what language it is written in."
          },
          { role: "user", content: text }
        ]
      })
    });

    if (!completion.ok) throw new Error(`OpenAI request failed (${completion.status}).`);
    const completionData = await completion.json();
    const raw = String(completionData?.choices?.[0]?.message?.content || "").trim();

    let parsed = null;
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = null;
    }

    const sentiment = ["positive", "neutral", "negative"].includes(parsed?.sentiment) ? parsed.sentiment : null;
    const restricted = parsed?.restricted === true;
    if (!sentiment && !restricted) return response.status(200).json({ classified: false });

    const patch = {};
    if (sentiment) patch.sentiment = sentiment;
    // Auto-hide anything flagged as political/religious/sexual content, in any language - this
    // is the multi-language backstop for src/lib/restrictedContent.js, which only catches the
    // languages/terms it explicitly lists.
    if (restricted) patch.is_hidden = true;
    await supabasePatch(`user_answers?id=eq.${answerId}`, patch);

    if (restricted && answerRow?.poll_id) {
      try {
        const [pollRow] = await supabaseGet(`polls?id=eq.${answerRow.poll_id}&select=workspace_id`);
        if (pollRow?.workspace_id) {
          // Leave an audit trail visible in the existing Moderation page, distinguishable from
          // a human-submitted report via reason="policy_violation" and an already-"hidden" status.
          await supabasePost("content_reports", {
            workspace_id: pollRow.workspace_id,
            poll_id: answerRow.poll_id,
            reported_answer: text,
            reason: "policy_violation",
            status: "hidden",
            reviewed_at: new Date().toISOString()
          });
        }
      } catch (reportError) {
        console.error("Failed to log auto-moderation audit entry", reportError);
      }
    }

    return response.status(200).json({ classified: Boolean(sentiment), sentiment, restricted });
  } catch (error) {
    console.error("Sentiment classification failed", error);
    return response.status(200).json({ classified: false });
  }
}
