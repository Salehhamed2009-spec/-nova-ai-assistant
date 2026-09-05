/**
 * NOVA Main App
 * Chat + automatische Memory-Integration
 */

import apiClient from './api-client.js';
import storage from './storage-manager.js';
import chatManager from './chat-manager.js';
import uiRenderer from './ui-renderer.js';
import memoryDetector from './memory-detector.js';

class NOVAApp {
  constructor() {
    this.isOnline = true;
    this.initialize();
  }

  async initialize() {
    try {
      this.isOnline = await apiClient.healthCheck();
    } catch {
      this.isOnline = false;
    }

    this.updateOnlineStatus();
    uiRenderer.renderAll();
    this.setupEventListeners();

    console.log('✅ NOVA initialized');
    console.log('🧠 Smart Memory enabled');
  }

  setupEventListeners() {
    uiRenderer.elements.newChatBtn?.addEventListener(
      'click',
      () => this.createNewChat()
    );

    uiRenderer.elements.mobileNew?.addEventListener(
      'click',
      () => this.createNewChat()
    );

    uiRenderer.elements.settingsBtn?.addEventListener(
      'click',
      () => uiRenderer.openSettings()
    );

    uiRenderer.elements.mobileSettings?.addEventListener(
      'click',
      () => uiRenderer.openSettings()
    );

    uiRenderer.elements.closeBtn?.addEventListener(
      'click',
      () => uiRenderer.closePanel()
    );

    uiRenderer.elements.form?.addEventListener(
      'submit',
      e => this.handleSubmit(e)
    );

    uiRenderer.elements.mobileChats?.addEventListener(
      'click',
      () => {
        const sidebar = document.querySelector('.sidebar');
        sidebar?.classList.toggle('open');
      }
    );

    uiRenderer.elements.panel?.addEventListener(
      'click',
      e => {
        if (e.target === uiRenderer.elements.panel) {
          uiRenderer.closePanel();
        }
      }
    );
  }

  createNewChat() {
    chatManager.createNewChat();
    uiRenderer.renderAll();
  }

  async handleSubmit(e) {
    e.preventDefault();

    const input = uiRenderer.elements.input;
    const message = input?.value?.trim();

    if (!message || uiRenderer.isLoading) {
      return;
    }

    /*
     * ==========================================
     * 1. USER-NACHRICHT SPEICHERN
     * ==========================================
     */

    chatManager.addMessage('user', message);

    input.value = '';

    uiRenderer.renderMessages();

    /*
     * ==========================================
     * 2. AUTOMATISCHE MEMORY-ERKENNUNG
     * ==========================================
     */

    this.processMemory(message);

    /*
     * ==========================================
     * 3. LOADING
     * ==========================================
     */

    uiRenderer.showLoading();

    try {
      /*
       * ==========================================
       * 4. CHAT-HISTORY
       * ==========================================
       */

      const history = chatManager.getChatHistory();

      /*
       * ==========================================
       * 5. ALLE GESPEICHERTEN MEMORIES
       * ==========================================
       */

      const memories = this.getMemories();

      console.log('🧠 Memories sent to NOVA:', memories);

      /*
       * ==========================================
       * 6. KI-BACKEND
       * ==========================================
       */

      const response = await apiClient.chat(
        message,
        history,
        memories
      );

      uiRenderer.hideLoading();

      /*
       * ==========================================
       * 7. NOVA-ANTWORT SPEICHERN
       * ==========================================
       */

      chatManager.addMessage(
        'assistant',
        response
      );

      uiRenderer.renderMessages();

    } catch (error) {
      uiRenderer.hideLoading();

      console.error('❌ Chat error:', error);

      let errorMsg =
        'Es tut mir leid, ich konnte die Anfrage nicht verarbeiten.';

      if (!this.isOnline) {
        errorMsg =
          '⚠️ Die Verbindung zum NOVA-Backend ist momentan nicht verfügbar.';
      } else if (error.name === 'AbortError') {
        errorMsg =
          '⏱️ Die Anfrage hat zu lange gedauert. Bitte versuche es erneut.';
      }

      chatManager.addMessage(
        'assistant',
        errorMsg
      );

      uiRenderer.renderMessages();
    }
  }

  /*
   * ==========================================
   * SMART MEMORY
   * ==========================================
   */

  processMemory(message) {
    try {
      /*
       * Memory-System kann deaktiviert werden.
       */
      if (
        typeof storage.isMemoryEnabled === 'function' &&
        !storage.isMemoryEnabled()
      ) {
        return;
      }

      /*
       * Nachricht analysieren.
       */
      const detected =
        typeof memoryDetector.analyze === 'function'
          ? memoryDetector.analyze(message)
          : memoryDetector.detectMemories(message);

      if (!Array.isArray(detected) || detected.length === 0) {
        return;
      }

      detected.forEach(memory => {
        /*
         * Nur ausreichend sichere Memories speichern.
         */
        if (
          typeof memoryDetector.isWorthRemembering === 'function' &&
          !memoryDetector.isWorthRemembering(memory)
        ) {
          return;
        }

        this.saveMemory(memory);
      });

    } catch (error) {
      /*
       * Memory darf niemals den Chat kaputt machen.
       */
      console.error(
        '❌ Memory detection error:',
        error
      );
    }
  }

  saveMemory(memory) {
    if (!memory?.text) {
      return;
    }

    /*
     * Vorhandene Memories holen.
     */
    const existing = this.getRawMemories();

    const normalizedNew =
      memory.text
        .trim()
        .toLowerCase();

    /*
     * Duplikate verhindern.
     */
    const duplicate = existing.some(item => {
      const text =
        typeof item === 'string'
          ? item
          : item?.text;

      return (
        text &&
        text
          .trim()
          .toLowerCase() === normalizedNew
      );
    });

    if (duplicate) {
      return;
    }

    /*
     * Speicherformat.
     */
    const memoryObject = {
      id:
        memory.id ||
        `memory_${Date.now()}_${Math.random()
          .toString(36)
          .slice(2, 8)}`,

      text: memory.text,

      category:
        memory.category || 'general',

      value:
        memory.value || '',

      confidence:
        memory.confidence ?? 0.8,

      createdAt:
        memory.timestamp || Date.now(),

      updatedAt:
        Date.now()
    };

    /*
     * Storage Manager bevorzugen.
     */
    try {
      if (
        typeof storage.addMemory === 'function'
      ) {
        storage.addMemory(memoryObject);

        console.log(
          '🧠 Memory saved:',
          memoryObject.text
        );

        return;
      }

      if (
        typeof storage.saveMemory === 'function'
      ) {
        storage.saveMemory(memoryObject);

        console.log(
          '🧠 Memory saved:',
          memoryObject.text
        );

        return;
      }
    } catch (error) {
      console.warn(
        'Storage manager failed:',
        error
      );
    }

    /*
     * Fallback:
     * direkt localStorage benutzen.
     */
    const memories = [
      ...existing,
      memoryObject
    ];

    localStorage.setItem(
      'nova_memories',
      JSON.stringify(memories)
    );

    console.log(
      '🧠 Memory saved using fallback:',
      memoryObject.text
    );
  }

  /*
   * ==========================================
   * MEMORIES LESEN
   * ==========================================
   */

  getRawMemories() {
    try {
      if (
        typeof storage.getMemories === 'function'
      ) {
        const memories =
          storage.getMemories();

        return Array.isArray(memories)
          ? memories
          : [];
      }
    } catch (error) {
      console.warn(
        'Could not read storage memories:',
        error
      );
    }

    try {
      const memories =
        JSON.parse(
          localStorage.getItem(
            'nova_memories'
          ) || '[]'
        );

      return Array.isArray(memories)
        ? memories
        : [];
    } catch {
      return [];
    }
  }

  getMemories() {
    return this.getRawMemories()
      .map(memory => {
        if (typeof memory === 'string') {
          return memory;
        }

        return memory?.text;
      })
      .filter(Boolean);
  }

  /*
   * ==========================================
   * ONLINE STATUS
   * ==========================================
   */

  async updateOnlineStatus() {
    const indicator =
      document.querySelector(
        '.online span'
      );

    if (!indicator) {
      return;
    }

    const update = () => {
      indicator.style.background =
        this.isOnline
          ? '#55e6a5'
          : '#ff718f';
    };

    update();

    setInterval(async () => {
      try {
        this.isOnline =
          await apiClient.healthCheck();
      } catch {
        this.isOnline = false;
      }

      update();
    }, 30000);
  }
}

/*
 * ==========================================
 * START NOVA
 * ==========================================
 */

document.addEventListener(
  'DOMContentLoaded',
  () => {
    window.NOVA =
      new NOVAApp();
  }
);