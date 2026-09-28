import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import type { ChatMessage, NotificationAudit } from '@/entities/chat/model/types';
import { chatKeys } from '@/entities/chat/model/chat-query';
import { useSessionStore } from '@/entities/session/model/session-store';
import { readSessionCache, writeSessionCache } from '@/shared/lib/session-cache';
import { ChatSidebar } from '@/widgets/chat-sidebar/ui/chat-sidebar';
import { ChatPanel } from '@/widgets/chat-panel/ui/chat-panel';
import { useNotificationPolling } from '@/features/notification-polling/model/use-notification-polling';

export function ChatLayout() {
  const { error: pollingError } = useNotificationPolling();
  const credentials = useSessionStore((state) => state.credentials);
  const queryClient = useQueryClient();
  const scope = credentials ? `${credentials.apiUrl}|${credentials.idInstance}` : '';

  useEffect(() => {
    if (!scope) {
      return;
    }

    const persisted = readSessionCache(scope);
    const sessionStore = useSessionStore.getState();

    sessionStore.hydrateChats(persisted.chats);

    for (const [chatId, messages] of Object.entries(persisted.messages)) {
      queryClient.setQueryData<ChatMessage[]>(chatKeys.messages(chatId), messages);
    }
    queryClient.setQueryData(chatKeys.audit, persisted.audit);

    const persist = () => {
      const messages = Object.fromEntries(
        queryClient
          .getQueriesData<ChatMessage[]>({ queryKey: chatKeys.all })
          .filter(([key, data]) => key[1] === 'messages' && Boolean(data))
          .map(([key, data]) => [key[2], data]),
      );
      const audit = queryClient.getQueryData<NotificationAudit[]>(chatKeys.audit) ?? [];

      writeSessionCache({
        scope,
        chats: useSessionStore.getState().chats,
        messages,
        audit,
      });
    };

    const unsubscribeQuery = queryClient.getQueryCache().subscribe(persist);
    const unsubscribeStore = useSessionStore.subscribe(persist);
    persist();

    return () => {
      unsubscribeQuery();
      unsubscribeStore();
    };
  }, [queryClient, scope]);

  return (
    <main className="app-shell">
      <ChatSidebar connectionError={pollingError} />
      <ChatPanel pollingError={pollingError} />
    </main>
  );
}
