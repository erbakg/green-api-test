import { afterEach, describe, expect, it, vi } from 'vitest';

import { clearSessionCache, readSessionCache, writeSessionCache } from '@/shared/lib/session-cache';

function createStorage() {
  const values = new Map<string, string>();

  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  };
}

describe('session-cache', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('stores messages without credentials and isolates cache by instance scope', () => {
    vi.stubGlobal('sessionStorage', createStorage());
    const cache = {
      scope: 'https://7107.api.greenapi.com|710722748936',
      chats: [{ id: 'chat@c.us', phone: '996705522442', title: '+996705522442' }],
      messages: {
        'chat@c.us': [{
          id: 'message-1',
          chatId: 'chat@c.us',
          text: 'Привет',
          direction: 'outgoing' as const,
          timestamp: 1,
          status: 'sent' as const,
        }],
      },
      audit: [],
    };

    writeSessionCache(cache);

    expect(readSessionCache(cache.scope)).toMatchObject(cache);
    expect(readSessionCache('https://other.api.greenapi.com|other')).toEqual({
      scope: 'https://other.api.greenapi.com|other',
      savedAt: expect.any(Number),
      chats: [],
      messages: {},
      audit: [],
    });

    clearSessionCache();
    expect(readSessionCache(cache.scope).chats).toHaveLength(0);
  });
});
