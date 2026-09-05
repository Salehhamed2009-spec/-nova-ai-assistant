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

    const history = Array.isArray(body.history)
      ? body.history
          .slice(-20)
          .filter(
            x =>
              x &&
              typeof x.text === "string" &&
              (x.role === "user" || x.role === "nova")
          )
          .map(x => ({
            role:
              x.role === "nova"
                ? "assistant"
                : "user",
            content: x.text.slice(0, 4000)
          }))
      : [];

    const memories = Array.isArray(body.memories)
      ? body.memories
          .filter(x => typeof x === "string")
          .map(x => x.trim())
          .filter(Boolean)
          .slice(0, 100)
      : [];

    const memoryText = memories.length
      ? `

GESPEICHERTE MEMORY:
${memories.map((x, i) => `${i + 1}. ${x}`).join("\n")}`
      : "";

    const messages = [
      {
        role: "system",
        content: `
Du bist NOVA, ein persönlicher KI-Assistent.

Antworte auf Deutsch, wenn der Nutzer Deutsch schreibt.

Sei:
- hilfreich
- natürlich
- verständlich
- ehrlich
- direkt

Nutze den bisherigen Gesprächsverlauf.

Die folgenden Informationen sind gespeicherte Erinnerungen des Benutzers:
${memoryText}

WICHTIG:
Behaupte niemals, dass du auf das Handy, Mikrofon,
Kamera, Dateien oder andere Geräte zugreifen kannst,
wenn dafür kein entsprechendes Tool vorhanden ist.

Wenn du etwas nicht kannst, sage es ehrlich.
        `
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
          max_tokens: 1600,
          temperature: 0.7
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return res.status(502).json({
        error:
          data?.error?.message ||
          "Hugging Face konnte nicht antworten."
      });
    }

    const answer =
      data?.choices?.[0]?.message?.content;

    if (
      typeof answer !== "string" ||
      !answer.trim()
    ) {
      return res.status(502).json({
        error: "Keine gültige KI-Antwort erhalten."
      });
    }

    return res.status(200).json({
      answer: answer.trim()
    });

  } catch (error) {

    console.error(error);

    return res.status(500).json({
      error:
        "Interner NOVA-Fehler. Bitte erneut versuchen."
    });
  }
}