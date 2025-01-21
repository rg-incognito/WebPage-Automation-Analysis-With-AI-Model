import { clearChatHistory, getChatHistory, saveChatHistory, createChatSession } from '@/lib/indexedDB';

export const useIndexDB = () => {
  return {
    createChatSession, // Export the createChatSession function
    saveChatHistory,
    fetchChatHistory: getChatHistory, // Rename for consistency
    clearChatHistory,
  };
};