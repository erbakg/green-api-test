export type PersistedMessageStatus = 'pending' | 'sent' | 'delivered' | 'read' | 'failed' | 'suspended' | 'noAccount' | 'notInGroup';

export interface PersistedChat {
  id: string;
  phone: string;
  title: string;
}

export interface PersistedMessage {
  id: string;
  chatId: string;
  text: string;
  direction: 'incoming' | 'outgoing';
  timestamp: number;
  status: PersistedMessageStatus;
  phone?: string;
  error?: string;
}

export interface PersistedNotificationAudit {
  id: string;
  receiptId: number;
  type: string;
  timestamp: number;
  description?: string;
}

export interface SessionCache {
  scope: string;
  savedAt: number;
  chats: PersistedChat[];
  messages: Record<string, PersistedMessage[]>;
  audit: PersistedNotificationAudit[];
}

const storageKey = 'whatsapp-desk-session-v1';
const maxChats = 50;
const maxMessagesPerChat = 200;
const maxAuditEntries = 50;
const cacheTtlMs = 7 * 24 * 60 * 60 * 1000;
const statuses: PersistedMessageStatus[] = ['pending', 'sent', 'delivered', 'read', 'failed', 'suspended', 'noAccount', 'notInGroup'];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isChat(value: unknown): value is PersistedChat {
  return isRecord(value)
    && typeof value.id === 'string'
    && typeof value.phone === 'string'
    && typeof value.title === 'string';
}

function isMessage(value: unknown): value is PersistedMessage {
  return isRecord(value)
    && typeof value.id === 'string'
    && typeof value.chatId === 'string'
    && typeof value.text === 'string'
    && (value.direction === 'incoming' || value.direction === 'outgoing')
    && typeof value.timestamp === 'number'
    && typeof value.status === 'string'
    && statuses.includes(value.status as PersistedMessageStatus);
}

function isAudit(value: unknown): value is PersistedNotificationAudit {
  return isRecord(value)
    && typeof value.id === 'string'
    && typeof value.receiptId === 'number'
    && typeof value.type === 'string'
    && typeof value.timestamp === 'number'
    && (value.description === undefined || typeof value.description === 'string');
}

function getStorage() {
  try {
    return globalThis.sessionStorage;
  } catch {
    return null;
  }
}

export function readSessionCache(scope: string): SessionCache {
  const storage = getStorage();

  if (!storage) {
    return { scope, savedAt: Date.now(), chats: [], messages: {}, audit: [] };
  }

  try {
    const raw = storage.getItem(storageKey);
    const parsed: unknown = raw ? JSON.parse(raw) : null;

    if (!isRecord(parsed) || parsed.scope !== scope || typeof parsed.savedAt !== 'number' || Date.now() - parsed.savedAt > cacheTtlMs) {
      return { scope, savedAt: Date.now(), chats: [], messages: {}, audit: [] };
    }

    const chats = Array.isArray(parsed.chats) ? parsed.chats.filter(isChat).slice(0, maxChats) : [];
    const messages: Record<string, PersistedMessage[]> = {};
    const audit = Array.isArray(parsed.audit) ? parsed.audit.filter(isAudit).slice(0, maxAuditEntries) : [];

    if (isRecord(parsed.messages)) {
      for (const [chatId, value] of Object.entries(parsed.messages)) {
        if (Array.isArray(value)) {
          messages[chatId] = value.filter(isMessage).slice(-maxMessagesPerChat);
        }
      }
    }

    return { scope, savedAt: parsed.savedAt, chats, messages, audit };
  } catch {
    return { scope, savedAt: Date.now(), chats: [], messages: {}, audit: [] };
  }
}

export function writeSessionCache(cache: Omit<SessionCache, 'savedAt'>) {
  const storage = getStorage();

  if (!storage) {
    return;
  }

  try {
    const messages = Object.fromEntries(
      Object.entries(cache.messages).map(([chatId, items]) => [chatId, items.slice(-maxMessagesPerChat)]),
    );
    storage.setItem(storageKey, JSON.stringify({
      ...cache,
      savedAt: Date.now(),
      chats: cache.chats.slice(0, maxChats),
      messages,
      audit: cache.audit.slice(0, maxAuditEntries),
    }));
  } catch {
    // Storage can be unavailable or full; the in-memory cache remains usable.
  }
}

export function clearSessionCache() {
  const storage = getStorage();

  try {
    storage?.removeItem(storageKey);
  } catch {
    // Ignore storage failures during logout.
  }
}
