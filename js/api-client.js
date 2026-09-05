import CONFIG from '../config.js';

class APIClient {
  constructor() {
    this.endpoint = CONFIG.API.CHAT_ENDPOINT;
    this.timeout = CONFIG.API.TIMEOUT || 60000;
  }

  async healthCheck() {
    try {
      const controller = new AbortController();

      const timeout = setTimeout(
        () => controller.abort(),
        5000
      );

      const response = await fetch(
        this.endpoint,
        {
          method: 'GET',
          signal: controller.signal
        }
      );

      clearTimeout(timeout);

      return response.ok;
    } catch {
      return false;
    }
  }

  async chat(message, history = [], memories = []) {
    if (!message || typeof message !== 'string') {
      throw new Error('Keine Nachricht angegeben.');
    }

    const controller = new AbortController();

    const timeout = setTimeout(
      () => controller.abort(),
      this.timeout
    );

    try {
      const response = await fetch(
        this.endpoint,
        {
          method: 'POST',

          headers: {
            'Content-Type': 'application/json'
          },

          body: JSON.stringify({
            message,
            history,
            memories
          }),

          signal: controller.signal
        }
      );

      if (!response.ok) {
        let errorMessage =
          `Serverfehler (${response.status})`;

        try {
          const errorData =
            await response.json();

          if (errorData?.error) {
            errorMessage =
              errorData.error;
          }
        } catch {}

        throw new Error(errorMessage);
      }

      const data =
        await response.json();

      if (typeof data === 'string') {
        return data;
      }

      if (data?.reply) {
        return data.reply;
      }

      if (data?.response) {
        return data.response;
      }

      if (data?.message) {
        return data.message;
      }

      throw new Error(
        'Die KI hat keine gültige Antwort zurückgegeben.'
      );

    } catch (error) {

      if (error.name === 'AbortError') {
        throw new Error(
          'Die Anfrage hat zu lange gedauert.'
        );
      }

      throw error;

    } finally {
      clearTimeout(timeout);
    }
  }
}

export default new APIClient();