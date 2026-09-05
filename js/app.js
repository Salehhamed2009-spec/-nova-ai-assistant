/**
 * NOVA App
 * Zentrale Verbindung zwischen UI, Chats, Memory und KI-Backend.
 */

import chatManager from './chat-manager.js';
import memoryDetector from './memory-detector.js';
import apiClient from './api-client.js';
import uiRenderer from './ui-renderer.js';

class NovaApp {
  constructor() {
    this.isSending = false;
    this.init();
  }

  init() {
    this.bindEvents();
    this.renderCurrentChat();
    this.renderChats();
    this.renderMemories();
    this.checkBackend();
  }

  bindEvents() {
    const sendButton = document.getElementById('sendButton');
    const messageInput = document.getElementById('messageInput');
    const newChatButton = document.getElementById('newChat');
    const newChatButtonAlt = document.getElementById('newChatButton');

    if (sendButton) {
      sendButton.addEventListener('click', () => {
        this.sendMessage();
      });
    }

    if (messageInput) {
      messageInput.addEventListener('keydown', event => {
        if (event.key === 'Enter' && !event.shiftKey) {
          event.preventDefault();
          this.sendMessage();
        }
      });

      messageInput.addEventListener('input', () => {
        this.autoResizeInput(messageInput);
      });
    }

    if (newChatButton) {
      newChatButton.addEventListener('click', () => {
        this.createNewChat();
      });
    }

    if (newChatButtonAlt) {
      newChatButtonAlt.addEventListener('click', () => {
        this.createNewChat();
      });
    }

    document.addEventListener(
      'nova:new-chat',
      () => this.createNewChat()
    );

    document.addEventListener(
      'nova:send',
      event => {
        const message = event.detail?.message;

        if (message) {
          this.sendMessage(message);
        }
      }
    );

    document.addEventListener(
      'nova:switch-chat',
      event => {
        const chatId = event.detail?.chatId;

        if (chatId) {
          this.switchChat(chatId);
        }
      }
    );

    document.addEventListener(
      'nova:delete-chat',
      event => {
        const chatId = event.detail?.chatId;

        if (chatId) {
          this.deleteChat(chatId);
        }
      }
    );

    document.addEventListener(
      'nova:rename-chat',
      event => {
        const chatId = event.detail?.chatId;
        const title = event.detail?.title;

        if (chatId && title) {
          this.renameChat(chatId, title);
        }
      }
    );

    document.addEventListener(
      'nova:clear-chats',
      () => this.clearAllChats()
    );

    document.addEventListener(
      'nova:clear-memories',
      () => this.clearMemories()
    );
  }

  async sendMessage(forcedMessage = null) {
    if (this.isSending) {
      return;
    }

    const input =
      document.getElementById('messageInput');

    const message =
      typeof forcedMessage === 'string'
        ? forcedMessage.trim()
        : input?.value?.trim();

    if (!message) {
      return;
    }

    this.isSending = true;

    try {
      if (input && !forcedMessage) {
        input.value = '';
        this.autoResizeInput(input);
      }

      chatManager.addMessage(
        'user',
        message
      );

      this.renderCurrentChat();
      this.renderChats();

      /*
       * AUTOMATISCHE MEMORY
       *
       * Jede normale Nachricht wird geprüft.
       * Nur erkannte persönliche Informationen
       * werden gespeichert.
       */
      const detectedMemories =
        memoryDetector.saveDetected(message);

      if (detectedMemories.length > 0) {
        this.renderMemories();
      }

      this.showTyping();

      const history =
        chatManager.getChatHistory();

      const memories =
        memoryDetector.getMemoryTexts();

      const response =
        await apiClient.sendMessage({
          message,
          history,
          memories
        });

      this.hideTyping();

      const answer =
        this.extractAnswer(response);

      if (!answer) {
        throw new Error(
          'Die KI hat keine Antwort zurückgegeben.'
        );
      }

      chatManager.addMessage(
        'assistant',
        answer
      );

      this.renderCurrentChat();
      this.renderChats();

    } catch (error) {
      console.error(
        'NOVA sendMessage error:',
        error
      );

      this.hideTyping();

      const errorMessage =
        this.getReadableError(error);

      chatManager.addMessage(
        'assistant',
        `⚠️ ${errorMessage}`
      );

      this.renderCurrentChat();

    } finally {
      this.isSending = false;
    }
  }

  extractAnswer(response) {
    if (typeof response === 'string') {
      return response.trim();
    }

    if (!response || typeof response !== 'object') {
      return '';
    }

    return (
      response.answer ||
      response.message ||
      response.response ||
      response.content ||
      response.text ||
      ''
    ).toString().trim();
  }

  getReadableError(error) {
    const message =
      error?.message || '';

    if (
      message.includes('Failed to fetch') ||
      message.includes('NetworkError')
    ) {
      return 'Ich konnte keine Verbindung zu meinem KI-Backend herstellen. Bitte prüfe die API-Verbindung.';
    }

    if (
      message.includes('401') ||
      message.includes('403')
    ) {
      return 'Die Verbindung zur KI wurde abgelehnt. Bitte überprüfe die Backend-Anmeldedaten.';
    }

    if (message.includes('429')) {
      return 'Das KI-Backend hat momentan zu viele Anfragen erhalten. Bitte versuche es gleich noch einmal.';
    }

    if (message.includes('500')) {
      return 'Mein KI-Backend hat einen internen Fehler. Bitte überprüfe die Server-Konfiguration.';
    }

    return message ||
      'Es ist ein unbekannter Fehler aufgetreten.';
  }

  createNewChat() {
    chatManager.createNewChat();

    this.renderCurrentChat();
    this.renderChats();

    const input =
      document.getElementById('messageInput');

    if (input) {
      input.value = '';
      input.focus();
      this.autoResizeInput(input);
    }
  }

  switchChat(chatId) {
    const success =
      chatManager.switchChat(chatId);

    if (!success) {
      return;
    }

    this.renderCurrentChat();
    this.renderChats();
  }

  deleteChat(chatId) {
    chatManager.deleteChat(chatId);

    this.renderCurrentChat();
    this.renderChats();
  }

  renameChat(chatId, title) {
    chatManager.renameChat(
      chatId,
      title
    );

    this.renderCurrentChat();
    this.renderChats();
  }

  clearAllChats() {
    chatManager.clearAllChats();

    this.renderCurrentChat();
    this.renderChats();
  }

  clearMemories() {
    memoryDetector.clearMemories();
    this.renderMemories();
  }

  renderCurrentChat() {
    const chat =
      chatManager.getCurrentChat();

    if (!chat) {
      return;
    }

    if (
      typeof uiRenderer.renderChat ===
      'function'
    ) {
      uiRenderer.renderChat(
        chat.messages || []
      );
      return;
    }

    if (
      typeof uiRenderer.renderMessages ===
      'function'
    ) {
      uiRenderer.renderMessages(
        chat.messages || []
      );
    }
  }

  renderChats() {
    const chats =
      chatManager.getAllChats();

    if (
      typeof uiRenderer.renderChats ===
      'function'
    ) {
      uiRenderer.renderChats(
        chats,
        chatManager.getCurrentChatId()
      );
    }
  }

  renderMemories() {
    const memories =
      memoryDetector.getMemories();

    if (
      typeof uiRenderer.renderMemories ===
      'function'
    ) {
      uiRenderer.renderMemories(memories);
    }
  }

  showTyping() {
    if (
      typeof uiRenderer.showTyping ===
      'function'
    ) {
      uiRenderer.showTyping();
      return;
    }

    document.body.classList.add(
      'nova-thinking'
    );
  }

  hideTyping() {
    if (
      typeof uiRenderer.hideTyping ===
      'function'
    ) {
      uiRenderer.hideTyping();
      return;
    }

    document.body.classList.remove(
      'nova-thinking'
    );
  }

  async checkBackend() {
    try {
      if (
        typeof apiClient.healthCheck ===
        'function'
      ) {
        await apiClient.healthCheck();

        this.setConnectionStatus(
          true
        );
      }
    } catch (error) {
      console.warn(
        'NOVA backend unavailable:',
        error
      );

      this.setConnectionStatus(
        false
      );
    }
  }

  setConnectionStatus(online) {
    const selectors = [
      '#connectionStatus',
      '#status',
      '#onlineStatus'
    ];

    let element = null;

    for (const selector of selectors) {
      element =
        document.querySelector(selector);

      if (element) {
        break;
      }
    }

    if (!element) {
      return;
    }

    element.textContent =
      online ? 'ONLINE' : 'OFFLINE';

    element.classList.toggle(
      'online',
      online
    );

    element.classList.toggle(
      'offline',
      !online
    );
  }

  autoResizeInput(input) {
    input.style.height = 'auto';

    input.style.height =
      Math.min(
        input.scrollHeight,
        180
      ) + 'px';
  }
}

const novaApp = new NovaApp();

window.NOVA = novaApp;

export default novaApp;
export { NovaApp };