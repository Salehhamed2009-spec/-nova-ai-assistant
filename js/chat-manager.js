/**
 * NOVA Chat Manager
 * Zentrale Verwaltung aller Chats
 */

import storage from './storage-manager.js';

class ChatManager {
  constructor() {
    this.currentChatId = null;
    this.loadCurrentChat();
  }

  loadCurrentChat() {
    const savedId = storage.getCurrentChat();
    const chats = storage.getChats();

    if (savedId && chats.some(chat => chat.id === savedId)) {
      this.currentChatId = savedId;
      return storage.getChat(savedId);
    }

    if (chats.length > 0) {
      this.currentChatId = chats[0].id;
      storage.setCurrentChat(this.currentChatId);
      return chats[0];
    }

    return this.createNewChat();
  }

  createNewChat(title = 'Neuer Chat') {
    const chat = storage.createChat(title);
    this.currentChatId = chat.id;
    storage.setCurrentChat(chat.id);
    return chat;
  }

  getCurrentChat() {
    if (!this.currentChatId) {
      return this.loadCurrentChat();
    }

    return storage.getChat(this.currentChatId);
  }

  getCurrentChatId() {
    return this.currentChatId;
  }

  switchChat(chatId) {
    const chat = storage.getChat(chatId);

    if (!chat) {
      return false;
    }

    this.currentChatId = chatId;
    storage.setCurrentChat(chatId);

    return true;
  }

  addMessage(role, content) {
    if (
      typeof content !== 'string' ||
      !content.trim()
    ) {
      return false;
    }

    let chat = this.getCurrentChat();

    if (!chat) {
      chat = this.createNewChat();
    }

    return storage.addMessage(chat.id, {
      role,
      content: content.trim()
    });
  }

  getMessages() {
    const chat = this.getCurrentChat();

    if (!chat || !Array.isArray(chat.messages)) {
      return [];
    }

    return chat.messages;
  }

  getChatHistory() {
    return this.getMessages();
  }

  getAllChats() {
    return storage.getChats();
  }

  renameChat(chatId, title) {
    if (
      typeof title !== 'string' ||
      !title.trim()
    ) {
      return false;
    }

    return storage.updateChat(chatId, {
      title: title.trim()
    });
  }

  deleteChat(chatId) {
    const result = storage.deleteChat(chatId);

    if (chatId !== this.currentChatId) {
      return result;
    }

    const chats = storage.getChats();

    if (chats.length > 0) {
      this.currentChatId = chats[0].id;
      storage.setCurrentChat(this.currentChatId);
    } else {
      const newChat = this.createNewChat();
      this.currentChatId = newChat.id;
    }

    return result;
  }

  clearCurrentChat() {
    const chat = this.getCurrentChat();

    if (!chat) {
      return false;
    }

    return storage.updateChat(chat.id, {
      messages: []
    });
  }

  clearAllChats() {
    storage.clearAllChats();

    const newChat = this.createNewChat();

    this.currentChatId = newChat.id;

    return true;
  }

  searchChats(query) {
    if (
      typeof query !== 'string' ||
      !query.trim()
    ) {
      return this.getAllChats();
    }

    const search = query
      .toLowerCase()
      .trim();

    return this.getAllChats().filter(chat => {
      const titleMatch =
        typeof chat.title === 'string' &&
        chat.title
          .toLowerCase()
          .includes(search);

      const messageMatch =
        Array.isArray(chat.messages) &&
        chat.messages.some(message =>
          typeof message.content === 'string' &&
          message.content
            .toLowerCase()
            .includes(search)
        );

      return titleMatch || messageMatch;
    });
  }
}

const chatManager = new ChatManager();

export default chatManager;
export { ChatManager };