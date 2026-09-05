const MODEL = 'openai/gpt-oss-120b:fastest';
const HF_URL = 'https://router.huggingface.co/v1/chat/completions';

function json(res, status, data) {
  res.status(status).json(data);
}

function cleanHistory(history) {
  if (!Array.isArray(history)) return [];

  return history
    .filter(
      item =>
        item &&
        (item.role === 'user' || item.role === 'assistant') &&
        typeof item.content === 'string' &&
        item.content.trim()
    )
    .slice(-30)
    .map(item => ({
      role: item.role,
      content: item.content.trim()
    }));
}

function cleanMemories(memories) {
  if (!Array.isArray(memories)) return [];

  return memories
    .map(memory =>
      typeof memory === 'string'
        ? memory.trim()
        : memory && typeof memory.text === 'string'
          ? memory.text.trim()
          : ''
    )
    .filter(Boolean)
    .slice(0, 100);
}

export default async function handler(req, res) {
  if (req.method === 'GET') {
    return json(res, 200, {
      ok: true,
      service: 'NOVA AI Backend',
      provider: 'Hugging Face'
    });
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');

    return json(res, 405, {
      error: 'Method not allowed'
    });
  }

  const token = process.env.HF_TOKEN;

  if (!token) {
    return json(res, 500, {
      error:
        'HF_TOKEN fehlt in den Vercel Environment Variables.'
    });
  }

  try {
    const body = req.body || {};

    const message =
      typeof body.message === 'string'
        ? body.message.trim()
        : '';

    if (!message) {
      return json(res, 400, {
        error: 'Keine Nachricht angegeben.'
      });
    }

    const history = cleanHistory(body.history);
    const memories = cleanMemories(body.memories);

    const memoryBlock = memories.length
      ? memories
          .map((memory, index) =>
            `${index + 1}. ${memory}`
          )
          .join('\n')
      : 'Keine gespeicherten Memories vorhanden.';

    const systemPrompt =
      'Du bist NOVA, ein persönlicher KI-Assistent mit einem ruhigen, intelligenten und futuristischen JARVIS-inspirierten Stil.\n\n' +

      'REGELN:\n' +
      '- Antworte natürlich und hilfreich.\n' +
      '- Nutze gespeicherte Memories, wenn sie zur Frage passen.\n' +
      '- Erfinde keine persönlichen Informationen.\n' +
      '- Wenn der Nutzer fragt, was du über ihn weißt, nutze die gespeicherten Memories.\n' +
      '- Antworte in der Sprache des Nutzers.\n\n' +

      'GESPEICHERTE MEMORIES:\n' +
      memoryBlock;

    const messages = [
      {
        role: 'system',
        content: systemPrompt
      },
      ...history
    ];

    const lastMessage =
      messages[messages.length - 1];

    if (
      !lastMessage ||
      lastMessage.role !== 'user' ||
      lastMessage.content !== message
    ) {
      messages.push({
        role: 'user',
        content: message
      });
    }

    const controller =
      new AbortController();

    const timeout = setTimeout(
      () => controller.abort(),
      55000
    );

    try {
      const response = await fetch(
        HF_URL,
        {
          method: 'POST',

          headers: {
            Authorization:
              `Bearer ${token}`,

            'Content-Type':
              'application/json'
          },

          body: JSON.stringify({
            model: MODEL,
            messages,
            temperature: 0.7,
            max_tokens: 1200
          }),

          signal: controller.signal
        }
      );

      const data =
        await response.json();

      if (!response.ok) {
        console.error(
          'Hugging Face error:',
          data
        );

        return json(
          res,
          response.status >= 500
            ? 502
            : response.status,
          {
            error:
              data?.error?.message ||
              data?.error ||
              'Die KI konnte keine Antwort erzeugen.'
          }
        );
      }

      const reply =
        data?.choices?.[0]?.message?.content;

      if (
        !reply ||
        typeof reply !== 'string'
      ) {
        return json(res, 502, {
          error:
            'Die KI hat keine gültige Antwort zurückgegeben.'
        });
      }

      return json(res, 200, {
        reply: reply.trim()
      });

    } finally {
      clearTimeout(timeout);
    }

  } catch (error) {
    console.error(
      'NOVA backend error:',
      error
    );

    if (
      error?.name === 'AbortError'
    ) {
      return json(res, 504, {
        error:
          'Die KI-Anfrage hat zu lange gedauert.'
      });
    }

    return json(res, 500, {
      error:
        'Interner NOVA-Backend-Fehler.'
    });
  }
}