import { afterEach, describe, expect, it, vi } from 'vitest';

import { createGreenApiClient, GreenApiError } from '@/entities/chat/api/chat-api';

const client = createGreenApiClient({
  apiUrl: 'https://7107.api.greenapi.com',
  idInstance: '1234567890',
  apiTokenInstance: 'token-value',
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('green-api client', () => {
  it('converts a successful HTTP response with a failed API payload into GreenApiError', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ status: false, message: 'Инстанс не авторизован' }),
    }));

    await expect(client.checkWhatsapp(996705522442)).rejects.toEqual(
      new GreenApiError('Инстанс не авторизован', 200),
    );
  });

  it('marks a notification with an invalid body so the queue can still acknowledge it', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ receiptId: 42, body: {} }),
    }));

    await expect(client.receiveNotification()).resolves.toMatchObject({
      receiptId: 42,
      malformed: true,
      body: {},
    });
  });

  it('rejects a send response without a message id', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ result: true }),
    }));

    await expect(client.sendMessage('123@c.us', 'Привет')).rejects.toThrow('идентификатор');
  });
});
