/**
 * NOVA Memory Detector
 * Erkennt persönliche Informationen automatisch aus normalen Gesprächen.
 */

import storage from './storage-manager.js';
import CONFIG from '../config.js';

class MemoryDetector {
  constructor() {
    this.enabled =
      CONFIG.MEMORY_SETTINGS?.ENABLED !== false;

    this.maxMemories =
      CONFIG.MEMORY_SETTINGS?.MAX_MEMORIES || 100;
  }

  detect(message) {
    if (
      !this.enabled ||
      typeof message !== 'string' ||
      !message.trim()
    ) {
      return [];
    }

    const text = message.trim();
    const memories = [];

    const add = (value) => {
      if (!value) return;

      const cleaned = value
        .replace(/\s+/g, ' ')
        .trim()
        .replace(/[.!?]+$/, '');

      if (
        cleaned.length < 2 ||
        cleaned.length > 180
      ) {
        return;
      }

      if (
        memories.some(
          memory =>
            memory.text.toLowerCase() ===
            cleaned.toLowerCase()
        )
      ) {
        return;
      }

      memories.push({
        text: cleaned,
        type: 'personal'
      });
    };

    /*
     * Direkte "Merk dir..."-Anweisungen
     */

    const rememberPatterns = [
      /(?:merk(?:e)?\s+dir|behalte\s+(?:im\s+kopf|im\s+gedächtnis)|erinnere\s+dich\s+an)\s*(?:bitte\s*)?(?:dass|das)?\s*:?\s*(.+)$/i,
      /(?:bitte\s+)?(?:speichere|speicher)\s*(?:dir|das)?\s*:?\s*(.+)$/i
    ];

    for (const pattern of rememberPatterns) {
      const match = text.match(pattern);

      if (match?.[1]) {
        add(match[1]);
        break;
      }
    }

    /*
     * Name
     */

    const namePatterns = [
      /(?:ich\s+heiße|ich\s+heisse|mein\s+name\s+ist)\s+([A-Za-zÄÖÜäöüß][A-Za-zÄÖÜäöüß' -]{1,50})/i,
      /(?:nenn(?:e)?\s+mich)\s+([A-Za-zÄÖÜäöüß][A-Za-zÄÖÜäöüß' -]{1,50})/i
    ];

    for (const pattern of namePatterns) {
      const match = text.match(pattern);

      if (match?.[1]) {
        add(`Der Name des Nutzers ist ${match[1]}`);
        break;
      }
    }

    /*
     * Alter
     */

    const ageMatch = text.match(
      /(?:ich\s+bin|ich\s+werde)\s+(\d{1,3})\s*(?:jahre?\s*alt)?/i
    );

    if (
      ageMatch &&
      Number(ageMatch[1]) >= 10 &&
      Number(ageMatch[1]) <= 120
    ) {
      add(`Der Nutzer ist ${ageMatch[1]} Jahre alt`);
    }

    /*
     * Wohnort / Herkunft
     */

    const locationPatterns = [
      /ich\s+wohne\s+in\s+([A-Za-zÄÖÜäöüß0-9 .,'-]{2,80})/i,
      /ich\s+lebe\s+in\s+([A-Za-zÄÖÜäöüß0-9 .,'-]{2,80})/i,
      /ich\s+komme\s+aus\s+([A-Za-zÄÖÜäöüß0-9 .,'-]{2,80})/i
    ];

    for (const pattern of locationPatterns) {
      const match = text.match(pattern);

      if (match?.[1]) {
        const place = match[1]
          .replace(/[.!?]+$/, '')
          .trim();

        add(`Der Nutzer lebt bzw. kommt aus ${place}`);
        break;
      }
    }

    /*
     * Schule / Ausbildung / Arbeit
     */

    const schoolPatterns = [
      /ich\s+gehe\s+(?:auf|zur)\s+([A-Za-zÄÖÜäöüß0-9 .,'-]{2,100})/i,
      /ich\s+besuche\s+(?:die|den|das)\s+([A-Za-zÄÖÜäöüß0-9 .,'-]{2,100})/i
    ];

    for (const pattern of schoolPatterns) {
      const match = text.match(pattern);

      if (match?.[1]) {
        add(`Der Nutzer besucht ${match[1]}`);
        break;
      }
    }

    const workPatterns = [
      /ich\s+arbeite\s+(?:bei|in)\s+([A-Za-zÄÖÜäöüß0-9 .,'&-]{2,100})/i,
      /ich\s+arbeite\s+als\s+([A-Za-zÄÖÜäöüß0-9 .,'&-]{2,100})/i
    ];

    for (const pattern of workPatterns) {
      const match = text.match(pattern);

      if (match?.[1]) {
        add(`Der Nutzer arbeitet ${match[1]}`);
        break;
      }
    }

    /*
     * Vorlieben
     */

    const preferencePatterns = [
      {
        regex:
          /ich\s+(?:liebe|mag|möchte|moechte)\s+(.+)/i,
        prefix:
          'Der Nutzer mag '
      },
      {
        regex:
          /ich\s+(?:hasse|mag\s+nicht)\s+(.+)/i,
        prefix:
          'Der Nutzer mag nicht '
      },
      {
        regex:
          /mein(?:e)?\s+lieblings(?:farbe|essen|gericht|sport|spiel|film|musik|song)\s+ist\s+(.+)/i,
        prefix:
          'Eine Vorliebe des Nutzers ist '
      }
    ];

    for (const pattern of preferencePatterns) {
      const match = text.match(pattern.regex);

      if (match?.[1]) {
        add(pattern.prefix + match[1]);
      }
    }

    /*
     * Ziele und Pläne
     */

    const goalPatterns = [
      /ich\s+(?:möchte|moechte|will|plane|habe\s+vor)\s+(.+)/i,
      /mein\s+ziel\s+ist\s+(.+)/i
    ];

    for (const pattern of goalPatterns) {
      const match = text.match(pattern);

      if (match?.[1]) {
        add(`Ein Ziel bzw. Plan des Nutzers ist ${match[1]}`);
      }
    }

    /*
     * Projekte
     */

    const projectPatterns = [
      /ich\s+arbeite\s+gerade\s+an\s+(.+)/i,
      /ich\s+baue\s+gerade\s+(.+)/i,
      /mein\s+projekt\s+ist\s+(.+)/i
    ];

    for (const pattern of projectPatterns) {
      const match = text.match(pattern);

      if (match?.[1]) {
        add(`Der Nutzer arbeitet an ${match[1]}`);
      }
    }

    return memories.slice(0, this.maxMemories);
  }

  saveDetected(message) {
    const detected = this.detect(message);

    if (!detected.length) {
      return [];
    }

    const saved = [];

    for (const memory of detected) {
      const success =
        storage.addMemory(memory);

      if (success) {
        saved.push(memory);
      }
    }

    return saved;
  }

  getMemories() {
    return storage.getMemories();
  }

  deleteMemory(memoryId) {
    return storage.deleteMemory(memoryId);
  }

  clearMemories() {
    return storage.clearMemories();
  }

  getMemoryTexts() {
    return this.getMemories()
      .map(memory =>
        typeof memory === 'string'
          ? memory
          : memory?.text
      )
      .filter(Boolean);
  }
}

const memoryDetector =
  new MemoryDetector();

export default memoryDetector;
export { MemoryDetector };