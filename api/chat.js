// Vercel serverless function: keeps the Gemini API key on the server.
export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed. Use POST." });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL || "gemini-3.8-flash";

  if (!apiKey) {
    return res.status(500).json({
      error: "Server configuration is missing GEMINI_API_KEY. Add it in Vercel Environment Variables."
    });
  }

  const { message, history = [] } = req.body || {};
  if (typeof message !== "string" || !message.trim()) {
    return res.status(400).json({ error: "Please enter a message." });
  }
  if (message.length > 12000) {
    return res.status(413).json({ error: "Message is too long. Keep it under 12,000 characters." });
  }

  // Send a bounded conversation history; only accept well-formed text turns.
  const contents = [
    ...history.slice(-12).filter((item) =>
      item && ["user", "model"].includes(item.role) &&
      typeof item.text === "string" && item.text.length <= 12000
    ).map((item) => ({
      role: item.role,
      parts: [{ text: item.text }]
    })),
    { role: "user", parts: [{ text: message.trim() }] }
  ];

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
        body: JSON.stringify({
          contents,
          systemInstruction: {
            parts: [{ text: "You are GeminiChat, a helpful, clear, and friendly AI assistant. Use Markdown for readable answers. If unsure, say so rather than inventing facts." }]
          },
          generationConfig: { temperature: 0.7, maxOutputTokens: 2048 }
        })
      }
    );

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const providerMessage = data?.error?.message || `Gemini API returned HTTP ${response.status}.`;
      const status = response.status === 429 ? 429 : (response.status === 400 ? 400 : 502);
      return res.status(status).json({
        error: providerMessage,
        hint: response.status === 404
          ? "The configured model may not be available for this API key. Check the model name in Google AI Studio and update GEMINI_MODEL."
          : undefined
      });
    }

    const answer = (data?.candidates?.[0]?.content?.parts || [])
      .map((part) => part.text || "")
      .join("")
      .trim();

    if (!answer) {
      return res.status(502).json({ error: "Gemini returned an empty response. Please try again." });
    }
    return res.status(200).json({ answer, model });
  } catch (error) {
    console.error("Gemini request failed:", error);
    return res.status(502).json({ error: "Unable to reach Gemini right now. Please try again in a moment." });
  }
}