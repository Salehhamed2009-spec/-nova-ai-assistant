export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method Not Allowed"
    });
  }

  try {
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        error: "OPENAI_API_KEY ist auf dem Server nicht eingerichtet."
      });
    }

    const body =
      typeof req.body === "string"
        ? JSON.parse(req.body)
        : req.body || {};

    const message =
      typeof body.message === "string"
        ? body.message.trim()
        : "";

    if (!message) {
      return res.status(400).json({
        error: "Keine Nachricht erhalten."
      });
    }

    if (message.length > 4000) {
      return res.status(400).json({
        error: "Die Nachricht ist zu lang."
      });
    }

    const history =
      Array.isArray(body.history)
        ? body.history
            .slice(-20)
            .filter(
              item =>
                item &&
                typeof item.text === "string" &&
                (item.role === "user" ||
                 item.role === "nova")
            )
            .map(item => ({
              role:
                item.role === "nova"
                  ? "assistant"
                  : "user",
              content: item.text.slice(0, 4000)
            }))
        : [];

    const input = [
      ...history,
      {
        role: "user",
        content: message
      }
    ];

    const openAIResponse = await fetch(
      "https://api.openai.com/v1/responses",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: "gpt-5-mini",
          instructions:
            "Du bist NOVA, ein moderner persönlicher KI-Assistent. " +
            "Antworte auf Deutsch, wenn der Benutzer Deutsch schreibt. " +
            "Sei hilfreich, natürlich, präzise und freundlich. " +
            "Behaupte niemals, eine Funktion ausgeführt zu haben, wenn du sie nicht tatsächlich ausführen kannst. " +
            "Du hast in dieser Version keinen direkten Zugriff auf das Gerät, lokale Dateien, Apps oder das Internet.",
          input,
          max_output_tokens: 1200
        })
      }
    );

    const data = await openAIResponse.json();

    if (!openAIResponse.ok) {
      console.error("OpenAI API error:", data);

      return res.status(
        openAIResponse.status >= 400 &&
        openAIResponse.status < 500
          ? 400
          : 502
      ).json({
        error:
          data?.error?.message ||
          "Die KI konnte die Anfrage nicht verarbeiten."
      });
    }

    const answer =
      typeof data.output_text === "string"
        ? data.output_text.trim()
        : extractResponseText(data);

    if (!answer) {
      return res.status(502).json({
        error: "Die KI hat keine Textantwort zurückgegeben."
      });
    }

    return res.status(200).json({
      answer
    });

  } catch (error) {

    console.error("NOVA backend error:", error);

    return res.status(500).json({
      error:
        "Interner NOVA-Fehler. Bitte versuche es erneut."
    });
  }
}

function extractResponseText(data) {

  if (!Array.isArray(data?.output)) {
    return "";
  }

  let result = "";

  for (const item of data.output) {

    if (!Array.isArray(item?.content)) {
      continue;
    }

    for (const content of item.content) {

      if (
        content?.type === "output_text" &&
        typeof content.text === "string"
      ) {
        result += content.text;
      }
    }
  }

  return result.trim();
}