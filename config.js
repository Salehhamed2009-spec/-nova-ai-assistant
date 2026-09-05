const CONFIG = {
  API: {
    CHAT_ENDPOINT: '/api/chat',
    TIMEOUT: 60000
  },

  STORAGE_KEYS: {
    CHATS: 'nova_chats',
    CURRENT_CHAT: 'nova_current_chat',
    MEMORIES: 'nova_memories',
    SETTINGS: 'nova_settings'
  },

  MEMORY_SETTINGS: {
    ENABLED: true,
    MAX_MEMORIES: 100
  }
};

export default CONFIG;