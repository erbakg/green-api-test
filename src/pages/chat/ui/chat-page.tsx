import { useSessionStore } from '@/entities/session/model/session-store';
import { AuthPanel } from '@/widgets/auth-panel/ui/auth-panel';
import { ChatLayout } from '@/widgets/chat-layout/ui/chat-layout';

export function ChatPage() {
  const credentials = useSessionStore((state) => state.credentials);

  return credentials ? <ChatLayout /> : <AuthPanel />;
}
