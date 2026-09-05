/**
 * NOVA KI Backend
 * Vercel Serverless Function
 */

export default async function handler(req, res) {
  if (req.method === 'GET') {
    return res.status(200).json({
      ok: true,
      service: 'NOVA AI Backend'
    });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({
      error: 'Method not allowed'
    });
  }

  try {
    const {
      message,
      history = [],
      memories = []
    } = req.body || {};

    if (
      typeof message !== 'string' ||
      !message.trim()
    ) {
      return res.status(400).json({
        error: 'Keine Nachricht erhalten.'
      });
    }

    const token =
      process.env.HF_TOKEN;

    if (!token) {
      return res.status(500).json({
        error:
          'HF_TOKEN ist in den Vercel Environment Variables nicht eingerichtet.'
      });
    }

    const safeHistory =
      Array.isArray(history)
        ? history
            .filter(item =>
              item &&
              typeof item.content === 'string' &&
              (
                item.role === 'user' ||
                item.role === 'assistant'
              )
            )
            .slice(-20)
        : [];

    const safeMemories =
      Array.isArray(memories)
        ? memories
            .filter(memory =>
              typeof memory === 'string' &&
              memory.trim()
            )
            .slice(0, 100)
        : [];

    const memoryText =
      safeMemories.length > 0
        ? `
WICHTIGE ERINNERUNGEN ÜBER DEN NUTZER:
${safeMemories
  .map(memory => `- ${memory}`)
  .join('\n')}

Nutze diese Informationen natürlich, wenn sie für die Unterhaltung relevant sind.
Behaupte niemals, dass du etwas über den Nutzer weißt, wenn es nicht in den Erinnerungen oder im aktuellen Gespräch steht.
`
        : '';

    const systemPrompt = `
Du bist NOVA, ein moderner persönlicher KI-Assistent.

Deine Persönlichkeit:
- freundlich
- intelligent
- ruhig
- hilfsbereit
- natürlich
- präzise
- technisch kompetent

Du sollst sich wie ein hochwertiger persönlicher Assistent anfühlen.
Antworte auf Deutsch, wenn der Nutzer Deutsch schreibt.
Antworte auf Englisch, wenn der Nutzer Englisch schreibt.

${memoryText}

WICHTIG:
- Erfinde keine persönlichen Informationen.
- Nutze vorhandene Erinnerungen nur dann, wenn sie relevant sind.
- Wenn der Nutzer dich bittet, dir etwas zu merken, bestätige dies kurz.
- Schreibe keine unnötig langen Antworten.
`;

    const messages = [
      {
        role: 'system',
        content: systemPrompt
      },
      ...safeHistory,
      {
        role: 'user',
        content: message.trim()
      }
    ];

    const response =
      await fetch(
        'https://router.huggingface.co/v1/chat/completions',
        {
          method: 'POST',

          headers: {
            Authorization:
              `Bearer ${token}`,

            'Content-Type':
              'application/json'
          },

          body: JSON.stringify({
            model:
              process.env.HF_MODEL ||
              'meta-llama/Llama-3.1-8B-Instruct',

            messages,

            temperature: 0.7,

            max_tokens: 1000
          })
        }
      );

    let data;

    try {
      data = await response.json();
    } catch {
      return res.status(502).json({
        error:
          'Das KI-Backend hat keine gültige Antwort geliefert.'
      });
    }

    if (!response.ok) {
      console.error(
        'Hugging Face error:',
        data
      );

      return res.status(
        response.status >= 500
          ? 502
          : response.status
      ).json({
        error:
          data?.error ||
          data?.message ||
          `KI-Backend Fehler: HTTP ${response.status}`
      });
    }

    const answer =
      data?.choices?.[0]?.message?.content;

    if (
      typeof answer !== 'string' ||
      !answer.trim()
    ) {
      return res.status(502).json({
        error:
          'Die KI hat keine Antwort zurückgegeben.'
      });
    }

    return res.status(200).json({
      ok: true,
      answer: answer.trim()
    });

  } catch (error) {
    console.error(
      'NOVA API error:',
      error
    );

    return res.status(500).json({
      error:
        'Interner NOVA Backend-Fehler.'
    });
  }
}