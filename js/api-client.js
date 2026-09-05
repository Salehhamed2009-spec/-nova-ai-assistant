/**
 * NOVA API Client
 * Verbindung zum NOVA KI-Backend
 */

import CONFIG from '../config.js';

class ApiClient {
  constructor() {
    this.endpoint =
      CONFIG.API?.CHAT_ENDPOINT || '/api/chat';

    this.timeout =
      CONFIG.API?.TIMEOUT || 60000;
  }

  async sendMessage({
    message,
    history = [],
    memories = []
  }) {
    if (
      typeof message !== 'string' ||
      !message.trim()
    ) {
      throw new Error('Nachricht ist leer.');
    }

    const controller =
      new AbortController();

    const timeoutId =
      setTimeout(
        () => controller.abort(),
        this.timeout
      );

    try {
      const response =
        await fetch(this.endpoint, {
          method: 'POST',

          headers: {
            'Content-Type': 'application/json'
          },

          body: JSON.stringify({
            message: message.trim(),
            history: Array.isArray(history)
              ? history
              : [],
            memories: Array.isArray(memories)
              ? memories
              : []
          }),

          signal: controller.signal
        });

      let data = null;

      try {
        data = await response.json();
      } catch {
        throw new Error(
          `Backend hat keine gültige JSON-Antwort geliefert. HTTP ${response.status}`
        );
      }

      if (!response.ok) {
        throw new Error(
          data?.error ||
          data?.message ||
          `Backend-Fehler: HTTP ${response.status}`
        );
      }

      if (
        data?.error &&
        !data?.answer &&
        !data?.message &&
        !data?.response &&
        !data?.content
      ) {
        throw new Error(data.error);
      }

      return data;

    } catch (error) {
      if (error.name === 'AbortError') {
        throw new Error(
          'Die Anfrage hat zu lange gedauert.'
        );
      }

      throw error;

    } finally {
      clearTimeout(timeoutId);
    }
  }

  async healthCheck() {
    const response =
      await fetch(this.endpoint, {
        method: 'GET',
        headers: {
          Accept: 'application/json'
        },
        cache: 'no-store'
      });

    let data = null;

    try {
      data = await response.json();
    } catch {
      throw new Error(
        `Backend antwortet nicht mit gültigem JSON. HTTP ${response.status}`
      );
    }

    if (!response.ok || data?.ok === false) {
      throw new Error(
        data?.error ||
        `Backend nicht erreichbar. HTTP ${response.status}`
      );
    }

    return data;
  }
}

const apiClient = new ApiClient();

export default apiClient;
export { ApiClient };