import { create } from 'zustand';

import type { Chat } from '@/entities/chat/model/types';

export interface SessionCredentials {
  apiUrl: string;
  idInstance: string;
  apiTokenInstance: string;
}

interface SessionState {
  credentials: SessionCredentials | null;
  activeChat: Chat | null;
  chats: Chat[];
  setCredentials: (credentials: SessionCredentials) => void;
  setActiveChat: (chat: Chat | null) => void;
  addChat: (chat: Chat) => void;
  hydrateChats: (chats: Chat[]) => void;
  clearSession: () => void;
}

export const useSessionStore = create<SessionState>((set) => ({
  credentials: null,
  activeChat: null,
  chats: [],
  setCredentials: (credentials) => set({ credentials }),
  setActiveChat: (activeChat) => set((state) => ({
    activeChat,
    chats: activeChat
      ? state.chats.some((chat) => chat.id === activeChat.id)
        ? state.chats.map((chat) => chat.id === activeChat.id ? activeChat : chat)
        : [...state.chats, activeChat]
      : state.chats,
  })),
  addChat: (chat) => set((state) => ({
    chats: state.chats.some((item) => item.id === chat.id)
      ? state.chats.map((item) => item.id === chat.id ? chat : item)
      : [...state.chats, chat],
  })),
  hydrateChats: (chats) => set((state) => ({
    chats: chats.reduce<Chat[]>((result, chat) => {
      const existing = result.findIndex((item) => item.id === chat.id);
      if (existing === -1) {
        return [...result, chat];
      }
      result[existing] = chat;
      return result;
    }, [...state.chats]),
  })),
  clearSession: () => set({ credentials: null, activeChat: null, chats: [] }),
}));
