import { z } from 'zod';

import type { SessionCredentials } from '@/entities/session/model/session-store';
import type { CheckWhatsappResponse, NotificationEnvelope, SendMessageResponse } from '@/entities/chat/model/types';

export class GreenApiError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = 'GreenApiError';
  }
}

function getPayloadMessage(data: unknown) {
  if (typeof data !== 'object' || data === null) {
    return undefined;
  }

  const payload = data as Record<string, unknown>;

  for (const key of ['message', 'reason', 'error', 'code']) {
    const value = payload[key];

    if (typeof value === 'string' && value.trim()) {
      return value;
    }
  }

  return undefined;
}

function isFailedPayload(data: unknown) {
  if (typeof data !== 'object' || data === null) {
    return false;
  }

  const payload = data as { status?: unknown; result?: unknown };
  return payload.status === false || payload.status === 'error' || payload.result === false;
}

function createEndpoint(credentials: SessionCredentials, method: string) {
  return `${credentials.apiUrl}/waInstance${encodeURIComponent(credentials.idInstance)}/${method}/${encodeURIComponent(credentials.apiTokenInstance)}`;
}

const stateInstanceSchema = z.object({ stateInstance: z.string() }).passthrough();
const checkWhatsappSchema = z.object({
  existsWhatsapp: z.boolean().optional(),
  chatId: z.string().optional(),
  status: z.boolean().optional(),
  reason: z.string().optional(),
}).passthrough();
const sendMessageSchema = z.object({ idMessage: z.string().optional() }).passthrough();
const deleteNotificationSchema = z.object({ result: z.boolean().optional() }).passthrough();
const notificationEnvelopeSchema = z.object({
  receiptId: z.coerce.number().int().nonnegative(),
  body: z.unknown(),
}).passthrough();
const notificationBodySchema = z.object({
  typeWebhook: z.string().min(1),
  idMessage: z.string().optional(),
  timestamp: z.number().optional(),
  chatId: z.string().optional(),
  status: z.string().optional(),
  description: z.string().optional(),
  sendByApi: z.boolean().optional(),
  senderData: z.object({
    chatId: z.string().optional(),
    chatName: z.string().optional(),
    senderName: z.string().optional(),
    senderPhoneNumber: z.union([z.number(), z.string()]).optional(),
  }).passthrough().optional(),
  messageData: z.object({
    typeMessage: z.string().optional(),
    textMessageData: z.object({ textMessage: z.string().optional() }).passthrough().optional(),
    extendedTextMessageData: z.object({ text: z.string().optional() }).passthrough().optional(),
  }).passthrough().optional(),
}).passthrough();

const defaultRequestTimeout = 15_000;

function parseResponse<T>(data: unknown, schema: z.ZodType<T>) {
  const result = schema.safeParse(data);

  if (!result.success) {
    throw new GreenApiError('GREEN-API вернул некорректный ответ.');
  }

  return result.data;
}

async function request<T>(url: string, init: RequestInit | undefined, schema: z.ZodType<T>, timeout = defaultRequestTimeout): Promise<T> {
  const controller = new AbortController();
  const sourceSignal = init?.signal;
  let timedOut = false;
  const timeoutId = globalThis.setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeout);

  const abortFromSource = () => controller.abort();
  sourceSignal?.addEventListener('abort', abortFromSource, { once: true });

  try {
    const response = await fetch(url, {
      ...init,
      credentials: 'omit',
      cache: 'no-store',
      referrerPolicy: 'no-referrer',
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
        ...init?.headers,
      },
    });
    const raw = await response.text();
    let data: unknown = null;

    if (raw) {
      try {
        data = JSON.parse(raw) as unknown;
      } catch {
        data = raw;
      }
    }

    if (!response.ok || isFailedPayload(data)) {
      const message = getPayloadMessage(data) ?? `GREEN-API вернул ошибку ${response.status}`;
      throw new GreenApiError(message, response.status);
    }

    return parseResponse(data, schema);
  } catch (error) {
    if (sourceSignal?.aborted) {
      throw error;
    }

    if (timedOut) {
      throw new GreenApiError('GREEN-API не ответил вовремя. Проверьте соединение.');
    }

    if (error instanceof GreenApiError) {
      throw error;
    }

    throw new GreenApiError('Не удалось подключиться к GREEN-API. Проверьте сеть и API URL.');
  } finally {
    globalThis.clearTimeout(timeoutId);
    sourceSignal?.removeEventListener('abort', abortFromSource);
  }
}

export function createGreenApiClient(credentials: SessionCredentials) {
  return {
    getStateInstance: (signal?: AbortSignal) => request<{ stateInstance: string }>(
      createEndpoint(credentials, 'getStateInstance'),
      { signal },
      stateInstanceSchema,
    ),

    checkWhatsapp: (phoneNumber: number) =>
      request<CheckWhatsappResponse>(
        createEndpoint(credentials, 'checkWhatsapp'),
        {
          method: 'POST',
          body: JSON.stringify({ phoneNumber }),
        },
        checkWhatsappSchema,
      ),

    sendMessage: async (chatId: string, message: string) => {
      const response = await request<SendMessageResponse>(
        createEndpoint(credentials, 'sendMessage'),
        {
          method: 'POST',
          body: JSON.stringify({ chatId, message }),
        },
        sendMessageSchema,
      );

      if (!response?.idMessage) {
        throw new GreenApiError('GREEN-API не вернул идентификатор отправленного сообщения.');
      }

      return response;
    },

    receiveNotification: async (receiveTimeout = 5, signal?: AbortSignal) => {
      const data = await request<unknown>(
        `${createEndpoint(credentials, 'receiveNotification')}?receiveTimeout=${receiveTimeout}`,
        { signal },
        z.unknown(),
      );

      if (data === null) {
        return null;
      }

      const envelope = parseResponse(data, notificationEnvelopeSchema);
      const body = notificationBodySchema.safeParse(envelope.body);

      return {
        receiptId: envelope.receiptId,
        body: body.success ? body.data : {},
        malformed: !body.success,
      } satisfies NotificationEnvelope;
    },

    deleteNotification: (receiptId: number, signal?: AbortSignal) =>
      request<{ result?: boolean }>(
        `${createEndpoint(credentials, 'deleteNotification')}/${receiptId}`,
        { method: 'DELETE', signal },
        deleteNotificationSchema,
      ),
  };
}
