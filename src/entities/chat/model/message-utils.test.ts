import { describe, expect, it } from 'vitest';

import {
  getMessageFromNotification,
  getMessageStatusFromNotification,
  mergeMessages,
  updateMessageStatus,
} from '@/entities/chat/model/message-utils';

describe('message-utils', () => {
  it('parses a text notification from GREEN-API', () => {
    const message = getMessageFromNotification({
      typeWebhook: 'incomingMessageReceived',
      idMessage: 'message-1',
      timestamp: 1_700_000_000,
      senderData: { chatId: '79990000000@c.us' },
      messageData: {
        typeMessage: 'textMessage',
        textMessageData: { textMessage: 'Привет' },
      },
    });

    expect(message).toMatchObject({
      id: 'message-1',
      chatId: '79990000000@c.us',
      text: 'Привет',
      direction: 'incoming',
      status: 'sent',
    });
  });

  it('uses the chat id from the notification when sender data is absent', () => {
    const message = getMessageFromNotification({
      typeWebhook: 'incomingMessageReceived',
      chatId: '97491630440536@lid',
      messageData: {
        typeMessage: 'textMessage',
        textMessageData: { textMessage: 'Сообщение' },
      },
    });

    expect(message?.chatId).toBe('97491630440536@lid');
  });

  it('keeps media notifications visible as text placeholders', () => {
    const message = getMessageFromNotification({
      typeWebhook: 'incomingMessageReceived',
      chatId: 'chat@c.us',
      messageData: { typeMessage: 'imageMessage' },
    });

    expect(message?.text).toBe('Изображение');
  });

  it('does not add duplicate messages', () => {
    const current = [{
      id: 'message-1',
      chatId: 'chat',
      text: 'hello',
      direction: 'incoming' as const,
      timestamp: 1,
      status: 'sent' as const,
    }];

    expect(mergeMessages(current, current[0])).toHaveLength(1);
  });

  it('updates an outgoing message status from a GREEN-API status notification', () => {
    const current = [{
      id: 'message-1',
      chatId: 'chat@c.us',
      text: 'hello',
      direction: 'outgoing' as const,
      timestamp: 1,
      status: 'pending' as const,
    }];
    const event = getMessageStatusFromNotification({
      typeWebhook: 'outgoingMessageStatus',
      idMessage: 'message-1',
      chatId: 'chat@c.us',
      status: 'delivered',
    });

    expect(event).not.toBeNull();
    expect(updateMessageStatus(current, event!)[0].status).toBe('delivered');
  });
});
