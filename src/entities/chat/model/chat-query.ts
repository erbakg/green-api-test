import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { createGreenApiClient } from '@/entities/chat/api/chat-api';
import type { ChatMessage, MessageStatusEvent, NotificationAudit } from '@/entities/chat/model/types';
import { mergeMessages } from '@/entities/chat/model/message-utils';
import { useSessionStore } from '@/entities/session/model/session-store';

const chatRootKey = ['chat'] as const;

export const chatKeys = {
  all: chatRootKey,
  messages: (chatId: string) => [...chatRootKey, 'messages', chatId] as const,
  statuses: (chatId: string) => [...chatRootKey, 'statuses', chatId] as const,
  audit: [...chatRootKey, 'notification-audit'] as const,
};

export interface SendMessageVariables {
  chatId: string;
  text: string;
  scope: string;
}

export function useNotificationAudit() {
  return useQuery({
    queryKey: chatKeys.audit,
    queryFn: async (): Promise<NotificationAudit[]> => [],
    initialData: [],
    staleTime: Infinity,
    gcTime: Infinity,
  });
}

export function useChatMessages(chatId: string | undefined) {
  return useQuery({
    queryKey: chatKeys.messages(chatId ?? 'empty'),
    queryFn: async (): Promise<ChatMessage[]> => [],
    enabled: Boolean(chatId),
    initialData: [],
    staleTime: Infinity,
    gcTime: Infinity,
  });
}

export function useSendMessage() {
  const credentials = useSessionStore((state) => state.credentials);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ chatId: targetChatId, text }: SendMessageVariables) => {
      if (!credentials || !targetChatId) {
        throw new Error('Сначала подключите GREEN-API и создайте чат.');
      }

      return createGreenApiClient(credentials).sendMessage(targetChatId, text);
    },
    onSuccess: (response, { chatId: targetChatId, text, scope }) => {
      const currentCredentials = useSessionStore.getState().credentials;
      const currentScope = currentCredentials ? `${currentCredentials.apiUrl}|${currentCredentials.idInstance}` : '';

      if (!targetChatId || !currentCredentials || currentScope !== scope) {
        return;
      }

      const cachedStatus = queryClient
        .getQueriesData<Record<string, MessageStatusEvent>>({ queryKey: chatKeys.all })
        .find(([key, statuses]) => key[1] === 'statuses' && statuses?.[response.idMessage!])?.[1]?.[response.idMessage!];

      const message: ChatMessage = {
        id: response.idMessage!,
        chatId: targetChatId,
        text,
        direction: 'outgoing',
        timestamp: Date.now(),
        status: cachedStatus?.status ?? 'sent',
      };

      queryClient.setQueryData<ChatMessage[]>(chatKeys.messages(targetChatId), (current = []) => mergeMessages(current, message));
    },
  });
}
