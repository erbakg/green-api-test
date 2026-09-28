import { AlertCircle, Info, LogOut, MessageSquareText, Radio, ShieldCheck, WifiOff } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';

import { chatKeys, useNotificationAudit } from '@/entities/chat/model/chat-query';
import { useSessionStore } from '@/entities/session/model/session-store';
import { CreateChatForm } from '@/features/create-chat/ui/create-chat-form';
import { Button } from '@/shared/ui/button';
import { clearSessionCache } from '@/shared/lib/session-cache';
import { formatTime } from '@/shared/lib/format';

interface ChatSidebarProps {
  connectionError?: string | null;
}

export function ChatSidebar({ connectionError }: ChatSidebarProps) {
  const activeChat = useSessionStore((state) => state.activeChat);
  const chats = useSessionStore((state) => state.chats);
  const setActiveChat = useSessionStore((state) => state.setActiveChat);
  const clearSession = useSessionStore((state) => state.clearSession);
  const queryClient = useQueryClient();
  const { data: audit = [] } = useNotificationAudit();

  const handleLogout = () => {
    clearSession();
    clearSessionCache();
    queryClient.removeQueries({ queryKey: chatKeys.all });
  };

  return (
    <aside className="sidebar">
      <div className="sidebar__top">
        <div className="brand">
          <span className="brand__mark"><MessageSquareText size={17} strokeWidth={2.5} /></span>
          <span>WhatsApp Desk</span>
        </div>
        <div className={`connection-pill${connectionError ? ' connection-pill--error' : ''}`}>
          <span className={`status-dot ${connectionError ? 'status-dot--error' : 'status-dot--online'}`} />
          {connectionError ? <><WifiOff size={13} /> Ошибка подключения</> : 'Подключено'}
        </div>
      </div>

      <CreateChatForm />

      <div className="sidebar__section">
        <div className="section-heading">
          <span className="section-heading__title">Чаты</span>
          <span className="section-heading__count">{chats.length}</span>
        </div>
        {chats.length > 0 ? (
          chats.map((chat) => (
            <button
              className={`chat-list-item${activeChat?.id === chat.id ? ' chat-list-item--active' : ''}`}
              key={chat.id}
              type="button"
              onClick={() => setActiveChat(chat)}
            >
              <div className="avatar">{chat.title.replace('+', '').slice(0, 2)}</div>
              <div className="chat-list-item__content">
                <strong>{chat.title}</strong>
                <span>Текстовый чат WhatsApp</span>
              </div>
              {activeChat?.id === chat.id && <Radio size={15} className="chat-list-item__icon" />}
            </button>
          ))
        ) : (
          <div className="empty-sidebar"><MessageSquareText size={19} /><span>Создайте чат по номеру</span></div>
        )}
      </div>

      <div className="sidebar__footer">
        {connectionError && <div className="security-note security-note--error"><AlertCircle size={16} /><span>{connectionError}</span></div>}
        {audit.length > 0 && (
          <details className="notification-audit">
            <summary><Info size={15} /> Системные события ({audit.length})</summary>
            <ul>
              {audit.slice(0, 5).map((entry) => (
                <li key={entry.id}>{entry.type} · {formatTime(entry.timestamp)}</li>
              ))}
            </ul>
          </details>
        )}
        <div className="security-note"><ShieldCheck size={16} /><span>Сессия хранится только в памяти вкладки</span></div>
        <Button variant="ghost" size="sm" className="logout-button" onClick={handleLogout}>
          <LogOut size={15} /> Выйти
        </Button>
      </div>
    </aside>
  );
}
