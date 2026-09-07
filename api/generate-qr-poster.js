const MAX_PROMPT_LENGTH = 280;

function readBearerToken(request) {
  const header = request.headers.authorization || "";
  return header.startsWith("Bearer ") ? header.slice(7) : "";
}

async function isAuthenticated(token) {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey || !token) return false;

  const authResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: {
      apikey: supabaseAnonKey,
      Authorization: `Bearer ${token}`
    }
  });

  return authResponse.ok;
}

export default async function handler(request, response) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    return response.status(405).json({ error: "Method not allowed." });
  }

  if (!(await isAuthenticated(readBearerToken(request)))) {
    return response.status(401).json({ error: "Sign in to generate a poster image." });
  }

  if (!process.env.OPENAI_API_KEY) {
    return response.status(503).json({ error: "AI image generation is not configured yet." });
  }

  const description = String(request.body?.description || "").trim().slice(0, MAX_PROMPT_LENGTH);
  if (!description) {
    return response.status(400).json({ error: "Describe the poster image you want to create." });
  }

  const prompt = [
    "Create a polished, abstract background image for a business QR-code voting poster.",
    "Leave a calm, uncluttered bright center area for a square QR code overlay.",
    "Do not include words, letters, logos, QR codes, people, or a frame.",
    `Visual direction: ${description}`
  ].join(" ");

  try {
    const openAiResponse = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-image-1",
        prompt,
        size: "1024x1024",
        quality: "medium",
        output_format: "png"
      })
    });

    const payload = await openAiResponse.json();
    if (!openAiResponse.ok) {
      console.error("OpenAI image generation failed", payload);
      return response.status(openAiResponse.status).json({ error: "Image generation failed. Please try again." });
    }

    const image = payload.data?.[0];
    const imageUrl = image?.b64_json ? `data:image/png;base64,${image.b64_json}` : image?.url;
    if (!imageUrl) {
      return response.status(502).json({ error: "The image provider returned no image." });
    }

    return response.status(200).json({ imageUrl });
  } catch (error) {
    console.error("AI image generation error", error);
    return response.status(500).json({ error: "Unable to generate an image right now." });
  }
}