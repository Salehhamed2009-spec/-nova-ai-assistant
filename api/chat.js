export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method Not Allowed"
    });
  }

  try {
    const token = process.env.HF_TOKEN;

    if (!token) {
      return res.status(500).json({
        error: "HF_TOKEN ist in Vercel nicht eingerichtet."
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

    const history = Array.isArray(body.history)
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

    const messages = [
      {
        role: "system",
        content:
          "Du bist NOVA, ein moderner persönlicher KI-Assistent. " +
          "Antworte standardmäßig auf Deutsch, wenn der Benutzer Deutsch schreibt. " +
          "Sei intelligent, freundlich, natürlich und präzise. " +
          "Antworte nicht unnötig lang. " +
          "Wenn du etwas nicht weißt, sag ehrlich, dass du es nicht weißt. " +
          "Behaupte niemals, eine Aktion auf dem Gerät des Benutzers durchgeführt zu haben, " +
          "wenn du dafür keine echte technische Funktion besitzt. " +
          "Du bist die KI innerhalb der NOVA-App."
      },
      ...history,
      {
        role: "user",
        content: message
      }
    ];

    const response = await fetch(
      "https://router.huggingface.co/v1/chat/completions",
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },

        body: JSON.stringify({
          model: "openai/gpt-oss-120b",
          messages,
          max_tokens: 1200,
          temperature: 0.7
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("Hugging Face API error:", data);

      return res.status(502).json({
        error:
          data?.error?.message ||
          "Die NOVA-KI konnte momentan nicht antworten."
      });
    }

    const answer =
      data?.choices?.[0]?.message?.content;

    if (
      typeof answer !== "string" ||
      !answer.trim()
    ) {
      console.error(
        "Unexpected Hugging Face response:",
        data
      );

      return res.status(502).json({
        error:
          "Die KI hat keine gültige Antwort zurückgegeben."
      });
    }

    return res.status(200).json({
      answer: answer.trim()
    });

  } catch (error) {

    console.error(
      "NOVA backend error:",
      error
    );

    return res.status(500).json({
      error:
        "Interner NOVA-Fehler. Bitte versuche es erneut."
    });
  }
}