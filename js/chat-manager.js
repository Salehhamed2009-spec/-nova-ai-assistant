import storage from './storage-manager.js';

class ChatManager {
  constructor() {
    this.currentChatId = null;
    this.loadCurrentChat();
  }

  loadCurrentChat() {
    this.currentChatId = storage.getCurrentChat();

    if (!this.currentChatId) {
      const chats = storage.getChats();

      if (chats.length > 0) {
        this.currentChatId = chats[0].id;
        storage.setCurrentChat(this.currentChatId);
      } else {
        this.createNewChat();
      }
    }
  }

  createNewChat(title = 'Neuer Chat') {
    const chat = storage.createChat(title);

    this.currentChatId = chat.id;

    return chat;
  }

  getCurrentChat() {
    if (!this.currentChatId) {
      this.loadCurrentChat();
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
    if (!content || !content.trim()) {
      return false;
    }

    let chat = this.getCurrentChat();

    if (!chat) {
      chat = this.createNewChat();
    }

    const message = {
      role,
      content: content.trim(),
      timestamp: Date.now()
    };

    return storage.addMessage(
      chat.id,
      message
    );
  }

  getMessages() {
    const chat = this.getCurrentChat();

    if (!chat) {
      return [];
    }

    return Array.isArray(chat.messages)
      ? chat.messages
      : [];
  }

  getChatHistory() {
    return this.getMessages();
  }

  getAllChats() {
    return storage.getChats();
  }

  renameChat(chatId, title) {
    if (!title || !title.trim()) {
      return false;
    }

    return storage.updateChat(
      chatId,
      {
        title: title.trim()
      }
    );
  }

  deleteChat(chatId) {
    const result =
      storage.deleteChat(chatId);

    if (
      chatId === this.currentChatId
    ) {
      this.loadCurrentChat();
    }

    return result;
  }

  clearCurrentChat() {
    const chat = this.getCurrentChat();

    if (!chat) {
      return false;
    }

    return storage.updateChat(
      chat.id,
      {
        messages: [],
        updated: Date.now()
      }
    );
  }

  searchChats(query) {
    if (!query || !query.trim()) {
      return this.getAllChats();
    }

    const search =
      query
        .toLowerCase()
        .trim();

    return this.getAllChats()
      .filter(chat => {

        if (
          chat.title
            ?.toLowerCase()
            .includes(search)
        ) {
          return true;
        }

        return chat.messages?.some(
          message =>
            message.content
              ?.toLowerCase()
              .includes(search)
        );
      });
  }
}

const chatManager =
  new ChatManager();

export default chatManager;
export { ChatManager };