import CONFIG from '../config.js';

class StorageManager {
  constructor() {
    this.keys = CONFIG.STORAGE_KEYS;
  }

  getChats() {
    try {
      const data = localStorage.getItem(this.keys.CHATS);
      const chats = data ? JSON.parse(data) : [];

      return Array.isArray(chats) ? chats : [];
    } catch (error) {
      console.error('NOVA: Chats konnten nicht geladen werden.', error);
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
      console.error('NOVA: Chats konnten nicht gespeichert werden.', error);
      return false;
    }
  }

  getChat(chatId) {
    return this.getChats().find(
      chat => chat.id === chatId
    ) || null;
  }

  createChat(title = 'Neuer Chat') {
    const chat = {
      id:
        'chat_' +
        Date.now() +
        '_' +
        Math.random()
          .toString(36)
          .slice(2, 9),

      title: title || 'Neuer Chat',

      messages: [],

      createdAt: new Date().toISOString(),

      updatedAt: new Date().toISOString()
    };

    const chats = this.getChats();

    chats.unshift(chat);

    this.saveChats(chats);

    return chat;
  }

  updateChat(chatId, updates = {}) {
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
      updatedAt: new Date().toISOString()
    };

    return this.saveChats(chats);
  }

  addMessage(chatId, message) {
    const chat = this.getChat(chatId);

    if (!chat) {
      return false;
    }

    if (
      !message ||
      typeof message.content !== 'string'
    ) {
      return false;
    }

    chat.messages.push({
      id:
        'msg_' +
        Date.now() +
        '_' +
        Math.random()
          .toString(36)
          .slice(2, 8),

      role: message.role,

      content: message.content,

      createdAt: new Date().toISOString()
    });

    if (
      chat.messages.length === 1 &&
      message.role === 'user'
    ) {
      chat.title =
        message.content.length > 35
          ? message.content.slice(0, 35) + '…'
          : message.content;
    }

    chat.updatedAt =
      new Date().toISOString();

    return this.saveChats(
      this.getChats().map(item =>
        item.id === chatId
          ? chat
          : item
      )
    );
  }

  deleteChat(chatId) {
    const chats = this.getChats();

    const filtered = chats.filter(
      chat => chat.id !== chatId
    );

    if (filtered.length === chats.length) {
      return false;
    }

    this.saveChats(filtered);

    if (
      this.getCurrentChat() === chatId
    ) {
      this.setCurrentChat(
        filtered[0]?.id || null
      );
    }

    return true;
  }

  clearAllChats() {
    try {
      localStorage.removeItem(
        this.keys.CHATS
      );

      localStorage.removeItem(
        this.keys.CURRENT_CHAT
      );

      return true;
    } catch (error) {
      console.error(
        'NOVA: Chats konnten nicht gelöscht werden.',
        error
      );

      return false;
    }
  }

  getCurrentChat() {
    try {
      return localStorage.getItem(
        this.keys.CURRENT_CHAT
      );
    } catch {
      return null;
    }
  }

  setCurrentChat(chatId) {
    try {
      if (chatId) {
        localStorage.setItem(
          this.keys.CURRENT_CHAT,
          chatId
        );
      } else {
        localStorage.removeItem(
          this.keys.CURRENT_CHAT
        );
      }

      return true;
    } catch (error) {
      console.error(
        'NOVA: Aktueller Chat konnte nicht gespeichert werden.',
        error
      );

      return false;
    }
  }

  getMemories() {
    try {
      const data =
        localStorage.getItem(
          this.keys.MEMORIES
        );

      const memories =
        data ? JSON.parse(data) : [];

      return Array.isArray(memories)
        ? memories
        : [];
    } catch (error) {
      console.error(
        'NOVA: Memories konnten nicht geladen werden.',
        error
      );

      return [];
    }
  }

  saveMemories(memories) {
    try {
      const max =
        CONFIG.MEMORY_SETTINGS
          ?.MAX_MEMORIES || 100;

      localStorage.setItem(
        this.keys.MEMORIES,
        JSON.stringify(
          Array.isArray(memories)
            ? memories.slice(0, max)
            : []
        )
      );

      return true;
    } catch (error) {
      console.error(
        'NOVA: Memories konnten nicht gespeichert werden.',
        error
      );

      return false;
    }
  }

  addMemory(memory) {
    if (!memory) {
      return false;
    }

    const memories =
      this.getMemories();

    const text =
      typeof memory === 'string'
        ? memory.trim()
        : memory.text?.trim();

    if (!text) {
      return false;
    }

    const exists =
      memories.some(item => {
        const existing =
          typeof item === 'string'
            ? item
            : item.text;

        return (
          existing?.toLowerCase() ===
          text.toLowerCase()
        );
      });

    if (exists) {
      return false;
    }

    memories.unshift({
      id:
        'memory_' +
        Date.now() +
        '_' +
        Math.random()
          .toString(36)
          .slice(2, 8),

      text,

      createdAt:
        new Date().toISOString()
    });

    return this.saveMemories(memories);
  }

  deleteMemory(memoryId) {
    const memories =
      this.getMemories();

    const filtered =
      memories.filter(memory =>
        typeof memory === 'string'
          ? memory !== memoryId
          : memory.id !== memoryId
      );

    if (
      filtered.length ===
      memories.length
    ) {
      return false;
    }

    return this.saveMemories(filtered);
  }

  clearMemories() {
    try {
      localStorage.removeItem(
        this.keys.MEMORIES
      );

      return true;
    } catch (error) {
      console.error(
        'NOVA: Memories konnten nicht gelöscht werden.',
        error
      );

      return false;
    }
  }

  getSettings() {
    try {
      const data =
        localStorage.getItem(
          this.keys.SETTINGS
        );

      return data
        ? JSON.parse(data)
        : {};
    } catch {
      return {};
    }
  }

  saveSettings(settings) {
    try {
      localStorage.setItem(
        this.keys.SETTINGS,
        JSON.stringify(
          settings || {}
        )
      );

      return true;
    } catch {
      return false;
    }
  }
}

const storage = new StorageManager();

export default storage;
export { StorageManager };