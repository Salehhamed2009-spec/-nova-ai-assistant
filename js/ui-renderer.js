/**
 * NOVA UI Renderer
 * Verbindet die NOVA-Oberfläche mit Chats, Nachrichten und Memory.
 */

class UIRenderer {
  constructor() {
    this.elements = {
      messages:
        document.getElementById('messages') ||
        document.getElementById('chatMessages'),

      chats:
        document.getElementById('chatList') ||
        document.getElementById('chats'),

      memories:
        document.getElementById('memoryList') ||
        document.getElementById('memories'),

      typing:
        document.getElementById('typingIndicator') ||
        document.getElementById('typing'),

      settings:
        document.getElementById('settings') ||
        document.getElementById('mobileSettings'),

      newChat:
        document.getElementById('newChat') ||
        document.getElementById('newChatButton')
    };

    this.bindEvents();
  }

  bindEvents() {
    if (this.elements.newChat) {
      this.elements.newChat.addEventListener(
        'click',
        () => {
          this.emit('nova:new-chat');
        }
      );
    }

    document.addEventListener(
      'click',
      event => {
        const chatButton =
          event.target.closest('[data-chat-id]');

        if (chatButton) {
          this.emit('nova:switch-chat', {
            chatId:
              chatButton.dataset.chatId
          });
        }

        const deleteButton =
          event.target.closest('[data-delete-chat]');

        if (deleteButton) {
          event.stopPropagation();

          const chatId =
            deleteButton.dataset.deleteChat;

          if (
            confirm(
              'Diesen Chat wirklich löschen?'
            )
          ) {
            this.emit('nova:delete-chat', {
              chatId
            });
          }
        }

        const memoryDelete =
          event.target.closest(
            '[data-delete-memory]'
          );

        if (memoryDelete) {
          event.stopPropagation();

          const memoryId =
            memoryDelete.dataset.deleteMemory;

          this.emit(
            'nova:delete-memory',
            { memoryId }
          );
        }
      }
    );
  }

  emit(name, detail = {}) {
    document.dispatchEvent(
      new CustomEvent(name, {
        detail
      })
    );
  }

  escapeHTML(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  formatMessage(content) {
    const escaped =
      this.escapeHTML(content);

    return escaped
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\n/g, '<br>');
  }

  renderChat(messages = []) {
    const container =
      this.elements.messages;

    if (!container) {
      return;
    }

    container.innerHTML = '';

    if (!messages.length) {
      this.renderEmptyState(container);
      return;
    }

    messages.forEach(message => {
      this.appendMessage(
        message.role,
        message.content
      );
    });

    this.scrollToBottom();
  }

  renderMessages(messages = []) {
    this.renderChat(messages);
  }

  appendMessage(role, content) {
    const container =
      this.elements.messages;

    if (!container) {
      return;
    }

    const wrapper =
      document.createElement('div');

    wrapper.className =
      `nova-message nova-message-${role}`;

    wrapper.dataset.role = role;

    const avatar =
      document.createElement('div');

    avatar.className =
      'nova-message-avatar';

    avatar.textContent =
      role === 'user'
        ? 'U'
        : 'N';

    const body =
      document.createElement('div');

    body.className =
      'nova-message-body';

    const name =
      document.createElement('div');

    name.className =
      'nova-message-name';

    name.textContent =
      role === 'user'
        ? 'Du'
        : 'NOVA';

    const text =
      document.createElement('div');

    text.className =
      'nova-message-text';

    text.innerHTML =
      this.formatMessage(content);

    body.appendChild(name);
    body.appendChild(text);

    wrapper.appendChild(avatar);
    wrapper.appendChild(body);

    container.appendChild(wrapper);
  }

  renderEmptyState(container) {
    const empty =
      document.createElement('div');

    empty.className =
      'nova-empty-state';

    empty.innerHTML = `
      <div class="nova-empty-icon">N</div>
      <h2>Wie kann ich dir helfen?</h2>
      <p>Starte eine Unterhaltung mit NOVA.</p>
    `;

    container.appendChild(empty);
  }

  renderChats(
    chats = [],
    currentChatId = null
  ) {
    const container =
      this.elements.chats;

    if (!container) {
      return;
    }

    container.innerHTML = '';

    chats.forEach(chat => {
      const item =
        document.createElement('div');

      item.className =
        'nova-chat-item';

      if (
        chat.id === currentChatId
      ) {
        item.classList.add('active');
      }

      item.dataset.chatId =
        chat.id;

      const title =
        document.createElement('span');

      title.className =
        'nova-chat-title';

      title.textContent =
        chat.title ||
        'Neuer Chat';

      const actions =
        document.createElement('div');

      actions.className =
        'nova-chat-actions';

      const deleteButton =
        document.createElement('button');

      deleteButton.type =
        'button';

      deleteButton.className =
        'nova-chat-delete';

      deleteButton.dataset.deleteChat =
        chat.id;

      deleteButton.setAttribute(
        'aria-label',
        'Chat löschen'
      );

      deleteButton.textContent =
        '×';

      actions.appendChild(
        deleteButton
      );

      item.appendChild(title);
      item.appendChild(actions);

      container.appendChild(item);
    });
  }

  renderMemories(memories = []) {
    const container =
      this.elements.memories;

    if (!container) {
      return;
    }

    container.innerHTML = '';

    if (!memories.length) {
      const empty =
        document.createElement('div');

      empty.className =
        'nova-memory-empty';

      empty.textContent =
        'Noch keine Erinnerungen gespeichert.';

      container.appendChild(empty);

      return;
    }

    memories.forEach(memory => {
      const value =
        typeof memory === 'string'
          ? memory
          : memory?.text;

      if (!value) {
        return;
      }

      const id =
        typeof memory === 'object'
          ? memory.id
          : value;

      const item =
        document.createElement('div');

      item.className =
        'nova-memory-item';

      const text =
        document.createElement('span');

      text.className =
        'nova-memory-text';

      text.textContent =
        value;

      const deleteButton =
        document.createElement('button');

      deleteButton.type =
        'button';

      deleteButton.className =
        'nova-memory-delete';

      deleteButton.dataset.deleteMemory =
        id;

      deleteButton.textContent =
        '×';

      deleteButton.setAttribute(
        'aria-label',
        'Erinnerung löschen'
      );

      item.appendChild(text);
      item.appendChild(deleteButton);

      container.appendChild(item);
    });
  }

  showTyping() {
    const element =
      this.elements.typing;

    if (element) {
      element.hidden = false;
      element.style.display = '';
      element.classList.add(
        'active'
      );
    }

    document.body.classList.add(
      'nova-thinking'
    );

    this.scrollToBottom();
  }

  hideTyping() {
    const element =
      this.elements.typing;

    if (element) {
      element.hidden = true;
      element.classList.remove(
        'active'
      );
    }

    document.body.classList.remove(
      'nova-thinking'
    );
  }

  scrollToBottom() {
    const container =
      this.elements.messages;

    if (!container) {
      return;
    }

    requestAnimationFrame(() => {
      container.scrollTop =
        container.scrollHeight;
    });
  }

  updateElement(id, content) {
    const element =
      document.getElementById(id);

    if (element) {
      element.textContent =
        content;
    }
  }

  showError(message) {
    this.appendMessage(
      'assistant',
      `⚠️ ${message}`
    );
  }
}

const uiRenderer =
  new UIRenderer();

export default uiRenderer;
export { UIRenderer };