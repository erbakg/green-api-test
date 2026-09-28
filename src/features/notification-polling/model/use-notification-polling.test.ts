import { QueryClient } from '@tanstack/react-query';
import { describe, expect, it } from 'vitest';

import { chatKeys } from '@/entities/chat/model/chat-query';
import type { ChatMessage } from '@/entities/chat/model/types';
import { resolveChatId } from '@/features/notification-polling/model/use-notification-polling';

describe('notification routing', () => {
  it('resolves a c.us notification to a known lid chat by phone', () => {
    const queryClient = new QueryClient();

    expect(resolveChatId(
      '996705522442@c.us',
      undefined,
      undefined,
      [{ id: '97491630440536@lid', phone: '996705522442', title: '+996705522442' }],
      queryClient,
    )).toBe('97491630440536@lid');
  });

  it('resolves a status notification to a known chat by message id', () => {
    const queryClient = new QueryClient();
    const chat = { id: '97491630440536@lid', phone: '996705522442', title: '+996705522442' };
    const message: ChatMessage = {
      id: 'message-1',
      chatId: chat.id,
      text: 'Привет',
      direction: 'outgoing',
      timestamp: 1,
      status: 'sent',
    };

    queryClient.setQueryData(chatKeys.messages(chat.id), [message]);

    expect(resolveChatId('996705522442@c.us', undefined, 'message-1', [chat], queryClient)).toBe(chat.id);
  });
});
