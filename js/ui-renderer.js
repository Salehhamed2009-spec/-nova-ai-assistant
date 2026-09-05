/**
 * UI Renderer
 * Rendering-Logik für Chat-Interface
 */

import storage from './storage-manager.js';
import chatManager from './chat-manager.js';

class UIRenderer {
  constructor() {
    this.elements = {
      messages: document.getElementById('messages'),
      input: document.getElementById('input'),
      form: document.getElementById('form'),
      chatList: document.getElementById('chatList'),
      newChatBtn: document.getElementById('newChat'),
      settingsBtn: document.getElementById('settings'),
      panel: document.getElementById('panel'),
      panelContent: document.getElementById('panelContent'),
      closeBtn: document.getElementById('close'),
      mobileNew: document.getElementById('mobileNew'),
      mobileSettings: document.getElementById('mobileSettings'),
      mobileChats: document.getElementById('mobileChats')
    };

    this.isLoading = false;
  }

  /**
   * Rendert alle Chats in der Sidebar
   */
  renderChatList() {
    const chats = chatManager.getAllChats();
    const current = chatManager.currentChatId;
    
    this.elements.chatList.innerHTML = '';

    chats.forEach(chat => {
      const chatEl = document.createElement('div');
      chatEl.className = `chat ${chat.id === current ? 'active' : ''}`;

      const selectBtn = document.createElement('button');
      selectBtn.className = 'chatSelect';
      selectBtn.innerHTML = `
        <div class="chatTitle">${this.escapeHtml(chat.title)}</div>
        <div class="chatCount">${chat.messages.length} Nachrichten</div>
      `;
      selectBtn.onclick = () => {
        chatManager.switchChat(chat.id);
        this.renderAll();
      };

      const renameBtn = document.createElement('button');
      renameBtn.className = 'chatButton';
      renameBtn.textContent = '✎';
      renameBtn.onclick = (e) => {
        e.stopPropagation();
        const newTitle = prompt('Chat umbenennen:', chat.title);
        if (newTitle?.trim()) {
          chatManager.renameChat(chat.id, newTitle);
          this.renderChatList();
        }
      };

      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'chatButton delete';
      deleteBtn.textContent = '×';
      deleteBtn.onclick = (e) => {
        e.stopPropagation();
        if (confirm('Diesen Chat wirklich löschen?')) {
          chatManager.deleteChat(chat.id);
          this.renderAll();
        }
      };

      chatEl.appendChild(selectBtn);
      chatEl.appendChild(renameBtn);
      chatEl.appendChild(deleteBtn);
      this.elements.chatList.appendChild(chatEl);
    });
  }

  /**
   * Rendert Nachrichten im aktuellen Chat
   */
  renderMessages() {
    const chat = chatManager.getCurrentChat();
    this.elements.messages.innerHTML = '';

    if (!chat || chat.messages.length === 0) {
      this.elements.messages.innerHTML = `
        <div class="welcome">
          <h1>Wie kann ich helfen?</h1>
          <div>Dein persönlicher KI-Assistent</div>
        </div>
      `;
      return;
    }

    chat.messages.forEach(message => {
      const msgEl = document.createElement('div');
      msgEl.className = `message ${message.role === 'user' ? 'user' : 'nova'}`;
      msgEl.textContent = message.content;
      this.elements.messages.appendChild(msgEl);
    });

    // Scroll to bottom
    this.elements.messages.scrollTop = this.elements.messages.scrollHeight;
  }

  /**
   * Zeigt Loading-Indicator
   */
  showLoading() {
    this.isLoading = true;
    const msgEl = document.createElement('div');
    msgEl.className = 'message nova loading';
    msgEl.id = 'loading-indicator';
    msgEl.innerHTML = '<span>●</span><span>●</span><span>●</span>';
    this.elements.messages.appendChild(msgEl);
    this.elements.messages.scrollTop = this.elements.messages.scrollHeight;
  }

  /**
   * Entfernt Loading-Indicator
   */
  hideLoading() {
    this.isLoading = false;
    const loader = document.getElementById('loading-indicator');
    if (loader) {
      loader.remove();
    }
  }

  /**
   * Öffnet Einstellungen-Panel
   */
  openSettings() {
    this.elements.panel.classList.add('open');
    this.renderSettingsPanel();
  }

  /**
   * Schließt Panel
   */
  closePanel() {
    this.elements.panel.classList.remove('open');
  }

  /**
   * Rendert Einstellungen-Panel
   */
  renderSettingsPanel() {
    const memories = storage.getMemories();
    
    this.elements.panelContent.innerHTML = `
      <div class="section">
        <b>🧠 Memory</b>
        <div class="description">
          Diese Informationen bleiben auch bei neuen Chats erhalten.
        </div>
        <div class="memoryForm">
          <input id="memoryInput" placeholder="z. B. Ich mag Fußball" maxlength="500">
          <button id="memorySave">Merken</button>
        </div>
        <div id="memoryList"></div>
      </div>

      <div class="section">
        <b>🤖 KI</b>
        <div class="description">
          NOVA verwendet deine Open-Source-KI über Hugging Face.
          Der HF_TOKEN bleibt ausschließlich auf dem Server.
        </div>
      </div>

      <div class="section">
        <button class="danger" id="clearChats">Alle Chats löschen</button>
        <br><br>
        <button class="danger" id="clearMemory">Memory löschen</button>
      </div>
    `;

    this.renderMemoryList();

    document.getElementById('memorySave').onclick = () => {
      const input = document.getElementById('memoryInput');
      if (storage.addMemory(input.value)) {
        input.value = '';
        this.renderMemoryList();
      }
    };

    document.getElementById('clearChats').onclick = () => {
      if (confirm('Alle Chats wirklich löschen?')) {
        chatManager.clearAllChats();
        this.renderAll();
        this.closePanel();
      }
    };

    document.getElementById('clearMemory').onclick = () => {
      if (confirm('Alle Memories wirklich löschen?')) {
        storage.clearAllMemories();
        this.renderMemoryList();
      }
    };
  }

  /**
   * Rendert Memory-Liste
   */
  renderMemoryList() {
    const memories = storage.getMemories();
    const container = document.getElementById('memoryList');

    if (!container) return;

    container.innerHTML = '';

    if (memories.length === 0) {
      container.innerHTML = '<div class="description" style="margin-top: 10px; font-style: italic;">Noch keine Erinnerungen gespeichert.</div>';
      return;
    }

    memories.forEach(memory => {
      const memEl = document.createElement('div');
      memEl.className = 'memory';
      memEl.innerHTML = `
        <span>${this.escapeHtml(memory.text)}</span>
        <button data-id="${memory.id}">✕</button>
      `;
      memEl.querySelector('button').onclick = () => {
        storage.deleteMemory(memory.id);
        this.renderMemoryList();
      };
      container.appendChild(memEl);
    });
  }

  /**
   * Rendert alles neu
   */
  renderAll() {
    this.renderChatList();
    this.renderMessages();
  }

  /**
   * HTML escapen
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

export default new UIRenderer();
