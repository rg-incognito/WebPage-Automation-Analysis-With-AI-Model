import { openDB, DBSchema } from 'idb';
import { ChatHistory } from '@/interface/chatHistory';

interface ChatDB extends DBSchema {
  chatSessions: {
    key: string;
    value: {id: string, screenshot: string; chatHistory: ChatHistory[] };
  };
}

const dbPromise = openDB<ChatDB>('chat-db', 1, {
  upgrade(db) {
    db.createObjectStore('chatSessions', { keyPath: 'id' }); // Use 'id' as keyPath
  },
});


export const createChatSession = async (screenshot: string) => {
  const db = await dbPromise;
  const id = crypto.randomUUID();  // Generate a unique ID
  await db.add('chatSessions', { id, screenshot, chatHistory: [] });
  return id;
};

export const saveChatHistory = async (sessionId: string, history: ChatHistory[]) => {
  const db = await dbPromise;
  const tx = db.transaction('chatSessions', 'readwrite');
  const store = tx.objectStore('chatSessions');
  const sessionData = await store.get(sessionId);

  if (sessionData) {
    sessionData.chatHistory = history; // Update chat history
    await store.put(sessionData);
  }
  return tx.done;
};

export const getChatHistory = async (sessionId: string, limit: number, offset: number) => {
  const db = await dbPromise;
  const sessionData = await db.get('chatSessions', sessionId);

  if (!sessionData) return { totalMessageCount: 0, chatHistory: [], allChatHistory: [], screenshot: null };


  const { chatHistory, screenshot } = sessionData;
  const totalMessageCount = chatHistory.length;

  const slicedHistory = chatHistory.slice(
    Math.max(totalMessageCount - offset - limit, 0),
    totalMessageCount - offset,
  );

  return {
    totalMessageCount,
    chatHistory: slicedHistory,
    allChatHistory: chatHistory,
    screenshot
  };
};


export const clearChatHistory = async (sessionId: string) => {
  const db = await dbPromise;
  await db.delete('chatSessions', sessionId);
};