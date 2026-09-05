/**
 * Memory Detector
 * Intelligente Erkennung von langfristigen Informationen aus Konversationen
 */

class MemoryDetector {
  constructor() {
    this.patterns = {
      // Name
      name: [
        /(?:mein name ist|ich hei[ß]e|mich nennt|ich bin)\s+([A-ZäöüÄÖÜ][a-zäöüß]+)/i,
      ],
      // Wohnort
      location: [
        /(?:ich wohne|ich lebe|ich bin aus|ich bin von)\s+([A-ZäöüÄÖÜ][a-zäöüß\s]+)/i,
      ],
      // Hobbys/Interessen
      hobby: [
        /(?:ich mag|ich liebe|mein hobby|meine interessen sind|ich spiele|ich mache)\s+([a-zäöüß\s]+)/i,
      ],
      // Beruf/Arbeit
      job: [
        /(?:ich arbeite als|ich bin|mein beruf|meine arbeit)\s+([a-zäöüß\s]+)/i,
      ],
      // Projekt
      project: [
        /(?:ich arbeite an|mein projekt|project|entwickle)\s+(?:einem|an einem)?\s+([A-ZäöüÄÖÜ][a-zA-Z0-9äöüß\s]+)/i,
      ],
      // Präfernzen (Essen, etc.)
      preference: [
        /(?:mein favorit|mein lieblings|ich mag|mein liebstes)\s+([a-zäöüß\s]+)\s+(?:ist|sind)/i,
      ]
    };

    this.minConfidence = 0.7;
  }

  /**
   * Analysiert Nachricht auf Memory-worthy Informationen
   * @param {string} message - Benutzer-Nachricht
   * @returns {Array<{category, text, confidence}>}
   */
  detectMemories(message) {
    if (!message || message.length < CONFIG.MEMORY_SETTINGS.MIN_MEMORY_LENGTH) {
      return [];
    }

    const detected = [];

    for (const [category, patterns] of Object.entries(this.patterns)) {
      for (const pattern of patterns) {
        const match = message.match(pattern);
        if (match && match[1]) {
          detected.push({
            category,
            text: this.formatMemory(category, match[1]),
            confidence: this.calculateConfidence(message, match[0])
          });
        }
      }
    }

    return detected.filter(m => m.confidence >= this.minConfidence);
  }

  /**
   * Formatiert erkannte Information
   * @private
   */
  formatMemory(category, text) {
    text = text.trim();

    switch (category) {
      case 'name':
        return `Name: ${text}`;
      case 'location':
        return `Wohnort: ${text}`;
      case 'hobby':
        return `Hobby/Interesse: ${text}`;
      case 'job':
        return `Beruf: ${text}`;
      case 'project':
        return `Projekt: ${text}`;
      case 'preference':
        return `Vorliebe: ${text}`;
      default:
        return text;
    }
  }

  /**
   * Berechnet Konfidenz der Erkennung
   * @private
   */
  calculateConfidence(message, match) {
    // Base confidence
    let confidence = 0.8;

    // Am Anfang der Nachricht = höhere Konfidenz
    if (message.startsWith(match.substring(0, 5))) {
      confidence += 0.1;
    }

    // Explizite Aussagen = höhere Konfidenz
    if (/^(ich|mein|meine)/.test(match)) {
      confidence += 0.1;
    }

    return Math.min(confidence, 1.0);
  }

  /**
   * Filter für unwichtige Informationen
   * @private
   */
  isRelevant(text) {
    // Ignoriere sehr kurze Infos
    if (text.length < CONFIG.MEMORY_SETTINGS.MIN_MEMORY_LENGTH) {
      return false;
    }

    // Ignoriere temporäre Aussagen
    const temporary = ['gerade', 'gerade eben', 'eben', 'sofort', 'gleich', 'später'];
    if (temporary.some(word => text.toLowerCase().includes(word))) {
      return false;
    }

    return true;
  }
}

export default new MemoryDetector();
