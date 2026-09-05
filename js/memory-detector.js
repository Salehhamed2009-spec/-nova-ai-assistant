/**
 * NOVA – Smart Memory Detector
 * Erkennt wichtige Informationen aus normalen Gesprächen.
 */

class MemoryDetector {
  constructor() {
    this.rules = [
      {
        category: "name",
        patterns: [
          /(?:mein name ist|ich heiße|ich heisse|nenne mich|mein name:)\s+([A-Za-zÄÖÜäöüß'-]+)/i
        ],
        format: value => `Der Name des Nutzers ist ${value}.`
      },

      {
        category: "location",
        patterns: [
          /(?:ich wohne in|ich lebe in|ich komme aus|ich bin aus|mein wohnort ist)\s+([A-Za-zÄÖÜäöüß .'-]+)/i
        ],
        format: value => `Der Nutzer wohnt in ${value.trim()}.`
      },

      {
        category: "age",
        patterns: [
          /(?:ich bin|ich werde)\s+(\d{1,3})\s*(?:jahre alt|j\.?)/i,
          /(?:mein alter ist)\s+(\d{1,3})/i
        ],
        format: value => `Der Nutzer ist ${value} Jahre alt.`
      },

      {
        category: "school",
        patterns: [
          /(?:ich gehe auf die|ich besuche die|meine schule ist)\s+(.+)/i
        ],
        format: value => `Die Schule des Nutzers ist ${value.trim()}.`
      },

      {
        category: "job",
        patterns: [
          /(?:ich arbeite bei|ich arbeite in|ich arbeite als|mein beruf ist)\s+(.+)/i
        ],
        format: value => `Der Nutzer arbeitet ${value.trim()}.`
      },

      {
        category: "hobby",
        patterns: [
          /(?:mein hobby ist|meine hobbys sind|ich spiele gerne|ich spiele|ich mache gerne|ich mache gern)\s+(.+)/i,
          /(?:ich mag|ich liebe)\s+(.+)/i
        ],
        format: value => `Der Nutzer interessiert sich für ${value.trim()}.`
      },

      {
        category: "preference",
        patterns: [
          /(?:mein lieblingsessen ist|mein lieblingsessen:)\s+(.+)/i,
          /(?:mein lieblingsfilm ist|mein lieblingssong ist|mein lieblingsspiel ist)\s+(.+)/i,
          /(?:ich mag am liebsten|am liebsten mag ich)\s+(.+)/i
        ],
        format: value => `Der Nutzer bevorzugt ${value.trim()}.`
      },

      {
        category: "project",
        patterns: [
          /(?:ich arbeite gerade an|ich arbeite an|mein projekt ist|mein projekt:|ich entwickle)\s+(.+)/i,
          /(?:wir bauen gerade|wir entwickeln gerade)\s+(.+)/i
        ],
        format: value => `Der Nutzer arbeitet an ${value.trim()}.`
      },

      {
        category: "goal",
        patterns: [
          /(?:mein ziel ist|mein größtes ziel ist|mein traum ist|ich möchte später|ich will später)\s+(.+)/i,
          /(?:ich möchte|ich will)\s+(?:einmal|später)\s+(.+)/i
        ],
        format: value => `Ein Ziel des Nutzers ist: ${value.trim()}.`
      },

      {
        category: "plan",
        patterns: [
          /(?:ich plane|wir planen|geplant ist|ich habe vor)\s+(.+)/i
        ],
        format: value => `Der Nutzer plant: ${value.trim()}.`
      },

      {
        category: "family",
        patterns: [
          /(?:ich habe|bei mir leben)\s+(\d+)\s+(?:geschwister|brüder|schwestern)/i
        ],
        format: value => `Der Nutzer hat ${value} Geschwister bzw. genannte Familienmitglieder.`
      }
    ];

    this.temporaryWords = [
      "gerade eben",
      "eben gerade",
      "gerade",
      "heute",
      "jetzt",
      "sofort",
      "gleich",
      "später heute",
      "momentan"
    ];

    this.ignorePhrases = [
      "ich glaube",
      "ich denke",
      "vielleicht",
      "wahrscheinlich",
      "keine ahnung",
      "ich weiß nicht",
      "ich weiss nicht"
    ];
  }

  /**
   * Hauptfunktion.
   *
   * @param {string} message
   * @returns {Array}
   */
  detectMemories(message) {
    if (!message || typeof message !== "string") {
      return [];
    }

    const cleanMessage = message.trim();

    if (cleanMessage.length < 4) {
      return [];
    }

    const lower = cleanMessage.toLowerCase();

    /*
     * Keine Memories aus offensichtlich unsicheren Aussagen.
     */
    if (
      this.ignorePhrases.some(phrase =>
        lower.startsWith(phrase)
      )
    ) {
      return [];
    }

    const detected = [];

    for (const rule of this.rules) {
      for (const pattern of rule.patterns) {
        const match = cleanMessage.match(pattern);

        if (!match || !match[1]) {
          continue;
        }

        let value = match[1].trim();

        value = this.cleanValue(value);

        if (!value) {
          continue;
        }

        /*
         * Vermeide temporäre Aussagen.
         */
        if (this.isTemporary(value)) {
          continue;
        }

        const memory = {
          category: rule.category,
          value,
          text: rule.format(value),
          confidence: this.calculateConfidence(
            cleanMessage,
            rule.category,
            value
          ),
          timestamp: Date.now()
        };

        if (memory.confidence >= 0.7) {
          detected.push(memory);
        }

        break;
      }
    }

    return this.removeDuplicates(detected);
  }

  /**
   * Zusätzliche allgemeine Erkennung.
   *
   * Dadurch kann NOVA auch Informationen erkennen,
   * die nicht exakt zu einer einzelnen Regex-Regel passen.
   */
  detectGeneralMemory(message) {
    if (!message || typeof message !== "string") {
      return null;
    }

    const text = message.trim();

    /*
     * Aussagen über dauerhafte Vorlieben.
     */
    const preferenceMatch = text.match(
      /^(?:ich mag|ich liebe|ich hasse|ich bevorzuge)\s+(.+)$/i
    );

    if (preferenceMatch) {
      const value = this.cleanValue(preferenceMatch[1]);

      if (
        value &&
        !this.isTemporary(value) &&
        value.length >= 3
      ) {
        return {
          category: "preference",
          value,
          text: `Der Nutzer sagt: ${value}.`,
          confidence: 0.78,
          timestamp: Date.now()
        };
      }
    }

    /*
     * Aussagen über langfristige Pläne.
     */
    const goalMatch = text.match(
      /^(?:ich möchte|ich will|ich plane|ich habe vor)\s+(.+)$/i
    );

    if (goalMatch) {
      const value = this.cleanValue(goalMatch[1]);

      if (
        value &&
        !this.isTemporary(value) &&
        value.length >= 5
      ) {
        return {
          category: "goal",
          value,
          text: `Der Nutzer möchte: ${value}.`,
          confidence: 0.74,
          timestamp: Date.now()
        };
      }
    }

    return null;
  }

  /**
   * Kombinierte Erkennung.
   */
  analyze(message) {
    const memories = this.detectMemories(message);

    const general = this.detectGeneralMemory(message);

    if (general) {
      memories.push(general);
    }

    return this.removeDuplicates(memories);
  }

  /**
   * Entfernt unnötige Zeichen.
   */
  cleanValue(value) {
    return value
      .replace(/\s+/g, " ")
      .replace(/[.!?]+$/, "")
      .trim();
  }

  /**
   * Prüft, ob eine Information nur temporär ist.
   */
  isTemporary(value) {
    const lower = value.toLowerCase();

    return this.temporaryWords.some(word =>
      lower.includes(word)
    );
  }

  /**
   * Berechnet die Vertrauenswürdigkeit.
   */
  calculateConfidence(message, category, value) {
    let confidence = 0.72;

    if (
      category === "name" ||
      category === "location" ||
      category === "age"
    ) {
      confidence += 0.12;
    }

    if (value.length >= 5) {
      confidence += 0.04;
    }

    if (
      /^(ich|mein|meine|wir)\b/i.test(message)
    ) {
      confidence += 0.05;
    }

    if (/[.!]$/.test(message)) {
      confidence += 0.02;
    }

    return Math.min(confidence, 0.98);
  }

  /**
   * Entfernt doppelte Memories.
   */
  removeDuplicates(memories) {
    const seen = new Set();

    return memories.filter(memory => {
      const key =
        `${memory.category}:${memory.text}`
          .toLowerCase()
          .trim();

      if (seen.has(key)) {
        return false;
      }

      seen.add(key);
      return true;
    });
  }

  /**
   * Prüft, ob eine Memory wirklich langfristig
   * gespeichert werden sollte.
   */
  isWorthRemembering(memory) {
    if (!memory || !memory.text) {
      return false;
    }

    if (memory.confidence < 0.7) {
      return false;
    }

    const text = memory.text.toLowerCase();

    const temporary = [
      "heute",
      "gerade",
      "jetzt",
      "gleich",
      "sofort"
    ];

    if (
      temporary.some(word =>
        text.includes(word)
      )
    ) {
      return false;
    }

    return true;
  }
}

const memoryDetector = new MemoryDetector();

export default memoryDetector;

export {
  MemoryDetector
};