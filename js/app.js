/**
 * NOVA Main App
 * Zentrale Anwendungslogik und Event-Handler
 */

import CONFIG from './config.js';
import apiClient from './js/api-client.js';
import storage from './js/storage-manager.js';
import chatManager from './js/chat-manager.js';
import uiRenderer from './js/ui-renderer.js';

class NOVAApp {
  constructor() {
    this.isOnline = true;
    this.initialize();
  }

  /**
   * App initialisieren
   */
  async initialize() {
    // Prüfe Backend-Verbindung
    this.isOnline = await apiClient.healthCheck();
    this.updateOnlineStatus();

    // Render initial UI
    uiRenderer.renderAll();

    // Event-Listener registrieren
    this.setupEventListeners();

    console.log('✅ NOVA initialized');
  }

  /**
   * Registriert alle Event-Listener
   */
  setupEventListeners() {
    // Chat-Operationen
    uiRenderer.elements.newChatBtn?.addEventListener('click', () => this.createNewChat());
    uiRenderer.elements.mobileNew?.addEventListener('click', () => this.createNewChat());

    // Einstellungen
    uiRenderer.elements.settingsBtn?.addEventListener('click', () => uiRenderer.openSettings());
    uiRenderer.elements.mobileSettings?.addEventListener('click', () => uiRenderer.openSettings());
    uiRenderer.elements.closeBtn?.addEventListener('click', () => uiRenderer.closePanel());

    // Message-Form
    uiRenderer.elements.form?.addEventListener('submit', (e) => this.handleSubmit(e));

    // Mobile Chat-Liste
    uiRenderer.elements.mobileChats?.addEventListener('click', () => {
      const sidebar = document.querySelector('.sidebar');
      sidebar?.classList.toggle('open');
    });

    // Panel-Hintergrund schließen
    uiRenderer.elements.panel?.addEventListener('click', (e) => {
      if (e.target === uiRenderer.elements.panel) {
        uiRenderer.closePanel();
      }
    });
  }

  /**
   * Neuen Chat erstellen
   */
  createNewChat() {
    chatManager.createNewChat();
    uiRenderer.renderAll();
  }

  /**
   * Formular absenden
   */
  async handleSubmit(e) {
    e.preventDefault();

    const input = uiRenderer.elements.input;
    const message = input.value.trim();

    if (!message || uiRenderer.isLoading) {
      return;
    }

    // User-Nachricht hinzufügen
    chatManager.addMessage('user', message);
    input.value = '';
    uiRenderer.renderMessages();

    // Loading-Indicator
    uiRenderer.showLoading();

    try {
      // Chat-History vorbereiten
      const history = chatManager.getChatHistory();
      const memories = storage.getMemories().map(m => m.text);

      // An Backend senden
      const response = await apiClient.chat(message, history, memories);

      // Loading entfernen
      uiRenderer.hideLoading();

      // Antwort hinzufügen
      chatManager.addMessage('assistant', response);
      uiRenderer.renderMessages();

    } catch (error) {
      uiRenderer.hideLoading();

      console.error('Chat error:', error);

      let errorMsg = 'Es tut mir leid, ich konnte die Anfrage nicht verarbeiten.';

      if (!this.isOnline) {
        errorMsg = '⚠️ Backend-Verbindung verloren. Prüfe deine Internetverbindung.';
      } else if (error.name === 'AbortError') {
        errorMsg = '⏱️ Die Anfrage hat zu lange gedauert. Bitte versuche es erneut.';
      }

      chatManager.addMessage('assistant', errorMsg);
      uiRenderer.renderMessages();
    }
  }

  /**
   * Online-Status aktualisieren
   */
  async updateOnlineStatus() {
    const indicator = document.querySelector('.online span');
    if (!indicator) return;

    if (this.isOnline) {
      indicator.style.background = '#55e6a5';
    } else {
      indicator.style.background = '#ff718f';
    }

    // Periodisch prüfen
    setInterval(async () => {
      this.isOnline = await apiClient.healthCheck();
      indicator.style.background = this.isOnline ? '#55e6a5' : '#ff718f';
    }, 30000);
  }
}

// App starten wenn DOM ready
document.addEventListener('DOMContentLoaded', () => {
  window.NOVA = new NOVAApp();
});
