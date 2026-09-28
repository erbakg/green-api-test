import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

import { createGreenApiClient, GreenApiError } from '@/entities/chat/api/chat-api';
import { chatKeys } from '@/entities/chat/model/chat-query';
import {
  getMessageFromNotification,
  getMessageStatusFromNotification,
  mergeMessages,
  updateMessageStatus,
} from '@/entities/chat/model/message-utils';
import { useSessionStore } from '@/entities/session/model/session-store';
import type { Chat, ChatMessage, NotificationAudit, NotificationBody } from '@/entities/chat/model/types';
import { formatChatId, getPhoneFromChatId, normalizePhone } from '@/shared/lib/format';
import type { QueryClient } from '@tanstack/react-query';
import { createPollingLock } from '@/shared/lib/polling-lock';

function isAbortError(error: unknown) {
  return error instanceof DOMException && error.name === 'AbortError';
}

export function resolveChatId(
  candidateChatId: string,
  phone: string | undefined,
  messageId: string | undefined,
  knownChats: Chat[],
  queryClient: QueryClient,
) {
  const eventPhone = normalizePhone(phone ?? getPhoneFromChatId(candidateChatId));
  const matchedChat = knownChats.find((chat) => (
    chat.id === candidateChatId
    || (eventPhone && normalizePhone(chat.phone) === eventPhone)
  ));

  if (matchedChat) {
    return matchedChat.id;
  }

  if (messageId) {
    const matchedChatByMessage = knownChats.find((chat) => {
      const messages = queryClient.getQueryData<ChatMessage[]>(chatKeys.messages(chat.id)) ?? [];
      return messages.some((message) => message.id === messageId);
    });

    if (matchedChatByMessage) {
      return matchedChatByMessage.id;
    }
  }

  return candidateChatId;
}

export function useNotificationPolling() {
  const credentials = useSessionStore((state) => state.credentials);
  const addChat = useSessionStore((state) => state.addChat);
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [healthError, setHealthError] = useState<string | null>(null);

  useEffect(() => {
    if (!credentials) {
      return;
    }

    const controller = new AbortController();
    const client = createGreenApiClient(credentials);
    const scope = `${credentials.apiUrl}|${credentials.idInstance}`;
    const lock = createPollingLock(scope);
    let isLeader = false;
    let pollController: AbortController | null = null;

    const checkHealth = async () => {
      try {
        const state = await client.getStateInstance(controller.signal);

        if (state.stateInstance !== 'authorized') {
          setHealthError(`Инстанс не авторизован: ${state.stateInstance}`);
        } else {
          setHealthError(null);
        }
      } catch (healthCheckError) {
        if (!controller.signal.aborted && !isAbortError(healthCheckError)) {
          setHealthError(healthCheckError instanceof GreenApiError ? healthCheckError.message : 'Не удалось проверить состояние инстанса.');
        }
      }
    };

    const poll = async (pollSignal: AbortSignal) => {
      while (!controller.signal.aborted && !pollSignal.aborted) {
        try {
          const notification = await client.receiveNotification(5, pollSignal);

          if (controller.signal.aborted || pollSignal.aborted) {
            return;
          }

          if (notification) {
            const message = notification.malformed ? null : getMessageFromNotification(notification.body);
            const status = notification.malformed ? null : getMessageStatusFromNotification(notification.body);
            const notificationBody: NotificationBody = notification.body;

            if (message) {
              const knownChats = useSessionStore.getState().chats;
              const chatId = resolveChatId(message.chatId, message.phone, message.id, knownChats, queryClient);
              const resolvedMessage = { ...message, chatId };
              const existingChat = knownChats.find((chat) => chat.id === chatId);
              const phone = message.phone || getPhoneFromChatId(message.chatId) || existingChat?.phone;

              addChat({
                id: chatId,
                phone: phone || chatId,
                title: existingChat?.title ?? formatChatId(phone || chatId),
              });

              queryClient.setQueryData<ChatMessage[]>(chatKeys.messages(chatId), (current = []) => mergeMessages(current, resolvedMessage));
            }

            if (status) {
              const knownChats = useSessionStore.getState().chats;
              const chatId = resolveChatId(status.chatId, status.phone, status.id, knownChats, queryClient);
              const resolvedStatus = { ...status, chatId };
              const statusesKey = chatKeys.statuses(chatId);

              queryClient.setQueryData<Record<string, typeof resolvedStatus>>(statusesKey, (current = {}) => ({
                ...current,
                [resolvedStatus.id]: resolvedStatus,
              }));
              queryClient.setQueryData<ChatMessage[]>(chatKeys.messages(chatId), (current = []) => updateMessageStatus(current, resolvedStatus));
            }

            if (!message && !status) {
              const auditEntry: NotificationAudit = {
                id: `receipt-${notification.receiptId}`,
                receiptId: notification.receiptId,
                type: notificationBody.typeWebhook ?? (notification.malformed ? 'malformed' : 'unknown'),
                timestamp: (notificationBody.timestamp ?? Math.floor(Date.now() / 1000)) * 1000,
                description: notificationBody.description,
              };

              queryClient.setQueryData<NotificationAudit[]>(chatKeys.audit, (current = []) => [
                auditEntry,
                ...current.filter((entry) => entry.id !== auditEntry.id),
              ].slice(0, 50));
            }

            await client.deleteNotification(notification.receiptId, pollSignal);
          }

          setError(null);
        } catch (pollingError) {
          if (controller.signal.aborted || pollSignal.aborted || isAbortError(pollingError)) {
            return;
          }

          setError(pollingError instanceof GreenApiError ? pollingError.message : 'Ошибка получения уведомлений.');
          await new Promise((resolve) => window.setTimeout(resolve, 2_000));
        }
      }
    };

    const stopPolling = () => {
      pollController?.abort();
      pollController = null;
    };

    const refreshLeadership = () => {
      const nextLeader = lock.tryAcquire();

      if (nextLeader === isLeader) {
        return;
      }

      isLeader = nextLeader;

      if (isLeader) {
        pollController = new AbortController();
        void poll(pollController.signal);
      } else {
        stopPolling();
        setError(null);
      }
    };

    void checkHealth();
    const healthTimer = globalThis.setInterval(() => void checkHealth(), 30_000);
    const leadershipTimer = globalThis.setInterval(refreshLeadership, 4_000);
    refreshLeadership();

    return () => {
      controller.abort();
      stopPolling();
      globalThis.clearInterval(healthTimer);
      globalThis.clearInterval(leadershipTimer);
      lock.release();
    };
  }, [addChat, credentials, queryClient]);

  return { error: error ?? healthError };
}
