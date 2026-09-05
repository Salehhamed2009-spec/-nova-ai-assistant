/**
 * Storage Manager
 * Verwaltet lokale Speicherung (localStorage) für Chats und Memories
 */

import CONFIG from '../config.js';

class StorageManager {
  constructor() {
    this.keys = CONFIG.STORAGE_KEYS;
    this.initStorage();
  }

  /**
   * Initialisiere Storage mit Default-Werten
   */
  initStorage() {
    if (!localStorage.getItem(this.keys.CHATS)) {
      localStorage.setItem(this.keys.CHATS, JSON.stringify([]));
    }
    if (!localStorage.getItem(this.keys.MEMORIES)) {
      localStorage.setItem(this.keys.MEMORIES, JSON.stringify([]));
    }
    if (!localStorage.getItem(this.keys.SETTINGS)) {
      localStorage.setItem(this.keys.SETTINGS, JSON.stringify({
        memoryEnabled: true,
        theme: 'dark'
      }));
    }
  }

  /**
   * Alle Chats abrufen
   */
  getChats() {
    try {
      return JSON.parse(localStorage.getItem(this.keys.CHATS) || '[]');
    } catch (error) {
      console.error('Error reading chats:', error);
      return [];
    }
  }

  /**
   * Chat speichern
   */
  saveChats(chats) {
    try {
      localStorage.setItem(this.keys.CHATS, JSON.stringify(chats));
      return true;
    } catch (error) {
      console.error('Error saving chats:', error);
      return false;
    }
  }

  /**
   * Einzelnen Chat abrufen
   */
  getChat(chatId) {
    const chats = this.getChats();
    return chats.find(chat => chat.id === chatId);
  }

  /**
   * Chat aktualisieren
   */
  updateChat(chatId, updates) {
    const chats = this.getChats();
    const index = chats.findIndex(chat => chat.id === chatId);
    
    if (index !== -1) {
      chats[index] = { ...chats[index], ...updates, updated: Date.now() };
      this.saveChats(chats);
      return true;
    }
    return false;
  }

  /**
   * Neuen Chat erstellen
   */
  createChat(title = 'Neuer Chat') {
    const chat = {
      id: `chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      title: title,
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

  /**
   * Chat löschen
   */
  deleteChat(chatId) {
    const chats = this.getChats();
    const filtered = chats.filter(chat => chat.id !== chatId);
    this.saveChats(filtered);

    if (this.getCurrentChat() === chatId && filtered.length > 0) {
      this.setCurrentChat(filtered[0].id);
    }

    return true;
  }

  /**
   * Nachricht zu Chat hinzufügen
   */
  addMessage(chatId, message) {
    const chat = this.getChat(chatId);
    if (!chat) return false;

    chat.messages.push({
      ...message,
      timestamp: Date.now()
    });

    return this.updateChat(chatId, { messages: chat.messages });
  }

  /**
   * Aktuellen Chat abrufen
   */
  getCurrentChat() {
    return localStorage.getItem(this.keys.CURRENT_CHAT);
  }

  /**
   * Aktuellen Chat setzen
   */
  setCurrentChat(chatId) {
    localStorage.setItem(this.keys.CURRENT_CHAT, chatId);
  }

  /**
   * Alle Memories abrufen
   */
  getMemories() {
    try {
      return JSON.parse(localStorage.getItem(this.keys.MEMORIES) || '[]');
    } catch (error) {
      console.error('Error reading memories:', error);
      return [];
    }
  }

  /**
   * Memory hinzufügen
   */
  addMemory(memory) {
    if (!memory?.trim()) return false;

    const memories = this.getMemories();
    
    // Duplikat-Check
    if (memories.some(m => m.text.toLowerCase() === memory.toLowerCase())) {
      return false;
    }

    memories.unshift({
      id: `mem_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      text: memory.trim(),
      created: Date.now()
    });

    memories.splice(CONFIG.MEMORY_SETTINGS.MAX_MEMORIES);

    localStorage.setItem(this.keys.MEMORIES, JSON.stringify(memories));
    return true;
  }

  /**
   * Memory löschen
   */
  deleteMemory(memoryId) {
    const memories = this.getMemories();
    const filtered = memories.filter(m => m.id !== memoryId);
    localStorage.setItem(this.keys.MEMORIES, JSON.stringify(filtered));
    return true;
  }

  /**
   * Alle Memories löschen
   */
  clearAllMemories() {
    localStorage.setItem(this.keys.MEMORIES, JSON.stringify([]));
    return true;
  }

  /**
   * Alle Chats löschen
   */
  clearAllChats() {
    localStorage.setItem(this.keys.CHATS, JSON.stringify([]));
    localStorage.removeItem(this.keys.CURRENT_CHAT);
    return true;
  }

  /**
   * Settings abrufen
   */
  getSettings() {
    try {
      return JSON.parse(localStorage.getItem(this.keys.SETTINGS) || '{}');
    } catch (error) {
      return {};
    }
  }

  /**
   * Settings speichern
   */
  saveSettings(settings) {
    try {
      localStorage.setItem(this.keys.SETTINGS, JSON.stringify(settings));
      return true;
    } catch (error) {
      console.error('Error saving settings:', error);
      return false;
    }
  }
}

export default new StorageManager();
