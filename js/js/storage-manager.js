/**
 * NOVA Storage Manager
 * Chats + langfristige Memories
 */

import CONFIG from '../config.js';

class StorageManager {
  constructor() {
    this.keys = CONFIG.STORAGE_KEYS;
    this.initStorage();
  }

  initStorage() {
    if (!localStorage.getItem(this.keys.CHATS)) {
      localStorage.setItem(
        this.keys.CHATS,
        JSON.stringify([])
      );
    }

    if (!localStorage.getItem(this.keys.MEMORIES)) {
      localStorage.setItem(
        this.keys.MEMORIES,
        JSON.stringify([])
      );
    }

    if (!localStorage.getItem(this.keys.SETTINGS)) {
      localStorage.setItem(
        this.keys.SETTINGS,
        JSON.stringify({
          memoryEnabled: true,
          theme: 'dark'
        })
      );
    }
  }

  getChats() {
    try {
      return JSON.parse(
        localStorage.getItem(this.keys.CHATS) || '[]'
      );
    } catch (error) {
      console.error('Error reading chats:', error);
      return [];
    }
  }

  saveChats(chats) {
    try {
      localStorage.setItem(
        this.keys.CHATS,
        JSON.stringify(chats)
      );

      return true;
    } catch (error) {
      console.error('Error saving chats:', error);
      return false;
    }
  }

  getChat(chatId) {
    return this.getChats().find(
      chat => chat.id === chatId
    );
  }

  updateChat(chatId, updates) {
    const chats = this.getChats();

    const index = chats.findIndex(
      chat => chat.id === chatId
    );

    if (index === -1) {
      return false;
    }

    chats[index] = {
      ...chats[index],
      ...updates,
      updated: Date.now()
    };

    return this.saveChats(chats);
  }

  createChat(title = 'Neuer Chat') {
    const chat = {
      id:
        `chat_${Date.now()}_` +
        Math.random()
          .toString(36)
          .slice(2, 9),

      title,

      messages: [],

      created: Date.now(),

      updated: Date.now()
    };

    const chats = this.getChats();

    chats.unshift(chat);

    this.saveChats(chats);

    this.setCurrentChat(chat.id);

    return chat;
  }

  deleteChat(chatId) {
    const chats = this.getChats();

    const filtered = chats.filter(
      chat => chat.id !== chatId
    );

    this.saveChats(filtered);

    if (this.getCurrentChat() === chatId) {
      if (filtered.length > 0) {
        this.setCurrentChat(filtered[0].id);
      } else {
        localStorage.removeItem(
          this.keys.CURRENT_CHAT
        );
      }
    }

    return true;
  }

  addMessage(chatId, message) {
    const chat = this.getChat(chatId);

    if (!chat) {
      return false;
    }

    chat.messages.push({
      ...message,
      timestamp: Date.now()
    });

    return this.updateChat(
      chatId,
      {
        messages: chat.messages
      }
    );
  }

  getCurrentChat() {
    return localStorage.getItem(
      this.keys.CURRENT_CHAT
    );
  }

  setCurrentChat(chatId) {
    localStorage.setItem(
      this.keys.CURRENT_CHAT,
      chatId
    );
  }

  /* =====================================
     MEMORY
  ===================================== */

  getMemories() {
    try {
      const memories = JSON.parse(
        localStorage.getItem(
          this.keys.MEMORIES
        ) || '[]'
      );

      return Array.isArray(memories)
        ? memories
        : [];

    } catch (error) {
      console.error(
        'Error reading memories:',
        error
      );

      return [];
    }
  }

  addMemory(memory) {
    /*
     * Unterstützt jetzt BEIDES:
     *
     * addMemory("Mein Name ist Saleh")
     *
     * oder
     *
     * addMemory({
     *   text: "Der Nutzer heißt Saleh"
     * })
     */

    let memoryText = '';

    let metadata = {};

    if (typeof memory === 'string') {
      memoryText = memory.trim();
    }

    else if (
      memory &&
      typeof memory === 'object'
    ) {
      memoryText =
        typeof memory.text === 'string'
          ? memory.text.trim()
          : '';

      metadata = memory;
    }

    if (!memoryText) {
      return false;
    }

    const memories = this.getMemories();

    const normalized =
      memoryText
        .toLowerCase()
        .replace(/\s+/g, ' ')
        .trim();

    /*
     * Duplikate verhindern.
     */

    const duplicate =
      memories.some(existing => {

        const existingText =
          typeof existing === 'string'
            ? existing
            : existing?.text;

        if (!existingText) {
          return false;
        }

        return (
          existingText
            .toLowerCase()
            .replace(/\s+/g, ' ')
            .trim() === normalized
        );
      });

    if (duplicate) {
      return false;
    }

    /*
     * Memory speichern.
     */

    const newMemory = {
      id:
        metadata.id ||
        `mem_${Date.now()}_` +
        Math.random()
          .toString(36)
          .slice(2, 9),

      text: memoryText,

      category:
        metadata.category ||
        'general',

      value:
        metadata.value ||
        '',

      confidence:
        metadata.confidence ??
        0.8,

      created:
        metadata.createdAt ||
        Date.now(),

      updated:
        Date.now()
    };

    memories.unshift(newMemory);

    /*
     * Maximale Anzahl aus config.js verwenden.
     */

    const max =
      CONFIG?.MEMORY_SETTINGS?.MAX_MEMORIES ||
      100;

    memories.splice(max);

    try {
      localStorage.setItem(
        this.keys.MEMORIES,
        JSON.stringify(memories)
      );

      console.log(
        '🧠 NOVA MEMORY SAVED:',
        newMemory
      );

      return true;

    } catch (error) {

      console.error(
        '❌ Error saving memory:',
        error
      );

      return false;
    }
  }

  deleteMemory(memoryId) {
    const memories =
      this.getMemories();

    const filtered =
      memories.filter(
        memory =>
          memory.id !== memoryId
      );

    localStorage.setItem(
      this.keys.MEMORIES,
      JSON.stringify(filtered)
    );

    return true;
  }

  clearAllMemories() {
    localStorage.setItem(
      this.keys.MEMORIES,
      JSON.stringify([])
    );

    return true;
  }

  clearAllChats() {
    localStorage.setItem(
      this.keys.CHATS,
      JSON.stringify([])
    );

    localStorage.removeItem(
      this.keys.CURRENT_CHAT
    );

    return true;
  }

  getSettings() {
    try {
      return JSON.parse(
        localStorage.getItem(
          this.keys.SETTINGS
        ) || '{}'
      );

    } catch {
      return {};
    }
  }

  saveSettings(settings) {
    try {
      localStorage.setItem(
        this.keys.SETTINGS,
        JSON.stringify(settings)
      );

      return true;

    } catch (error) {

      console.error(
        'Error saving settings:',
        error
      );

      return false;
    }
  }

  isMemoryEnabled() {
    const settings =
      this.getSettings();

    return settings.memoryEnabled !== false;
  }
}

export default new StorageManager();