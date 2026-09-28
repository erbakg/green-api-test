import type { ChatMessage, MessageStatus, MessageStatusEvent, NotificationBody } from '@/entities/chat/model/types';

const messageTypeLabels: Record<string, string> = {
  audioMessage: 'Аудиосообщение',
  contactMessage: 'Контакт',
  documentMessage: 'Документ',
  imageMessage: 'Изображение',
  locationMessage: 'Геолокация',
  stickerMessage: 'Стикер',
  videoMessage: 'Видео',
};

export function getMessageFromNotification(body: NotificationBody): ChatMessage | null {
  const chatId = body.senderData?.chatId ?? body.chatId;
  const messageType = body.messageData?.typeMessage;
  const text = body.messageData?.textMessageData?.textMessage
    ?? body.messageData?.extendedTextMessageData?.text
    ?? (messageType ? messageTypeLabels[messageType] ?? 'Неподдерживаемое сообщение' : undefined);

  if (!chatId || !text || !body.typeWebhook) {
    return null;
  }

  const isIncoming = body.typeWebhook === 'incomingMessageReceived';
  const isOutgoing = body.typeWebhook === 'outgoingAPIMessageReceived' || body.typeWebhook === 'outgoingMessageReceived';

  if (!isIncoming && !isOutgoing) {
    return null;
  }

  return {
    id: body.idMessage ?? `notification-${body.timestamp ?? Date.now()}-${text.slice(0, 8)}`,
    chatId,
    text,
    direction: isIncoming ? 'incoming' : 'outgoing',
    timestamp: (body.timestamp ?? Math.floor(Date.now() / 1000)) * 1000,
    status: 'sent',
    phone: body.senderData?.senderPhoneNumber ? String(body.senderData.senderPhoneNumber) : undefined,
  };
}

const statusMap: Record<string, MessageStatus> = {
  pending: 'pending',
  sent: 'sent',
  delivered: 'delivered',
  read: 'read',
  failed: 'failed',
  suspended: 'suspended',
  yellowcard: 'suspended',
  noaccount: 'noAccount',
  notingroup: 'notInGroup',
};

export function getMessageStatusFromNotification(body: NotificationBody): MessageStatusEvent | null {
  if (body.typeWebhook !== 'outgoingMessageStatus' || !body.idMessage || !body.status) {
    return null;
  }

  const chatId = body.chatId ?? body.senderData?.chatId;
  const status = statusMap[body.status.toLowerCase()];

  if (!chatId || !status) {
    return null;
  }

  return {
    id: body.idMessage,
    chatId,
    status,
    timestamp: (body.timestamp ?? Math.floor(Date.now() / 1000)) * 1000,
    description: body.description,
    phone: body.senderData?.senderPhoneNumber ? String(body.senderData.senderPhoneNumber) : undefined,
  };
}

const statusRank: Record<MessageStatus, number> = {
  pending: 0,
  sent: 1,
  delivered: 2,
  read: 3,
  failed: 4,
  suspended: 4,
  noAccount: 4,
  notInGroup: 4,
};

function getPreferredStatus(current: MessageStatus, incoming: MessageStatus) {
  return statusRank[incoming] >= statusRank[current] ? incoming : current;
}

export function mergeMessages(current: ChatMessage[], incoming: ChatMessage) {
  const existing = current.find((message) => message.id === incoming.id);

  if (existing) {
    return current
      .map((message) => message.id === incoming.id
        ? {
            ...message,
            ...incoming,
            phone: incoming.phone ?? message.phone,
            status: getPreferredStatus(message.status, incoming.status),
          }
        : message)
      .sort((a, b) => a.timestamp - b.timestamp);
  }

  return [...current, incoming].sort((a, b) => a.timestamp - b.timestamp);
}

export function updateMessageStatus(current: ChatMessage[], event: MessageStatusEvent) {
  return current.map((message) => message.id === event.id
    ? { ...message, status: getPreferredStatus(message.status, event.status), error: event.description ?? message.error }
    : message);
}
