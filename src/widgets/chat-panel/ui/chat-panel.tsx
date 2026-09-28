import { AlertCircle, Check, CheckCheck, Clock3, Info, MessageCircle, RefreshCw, Send, Wifi, WifiOff } from 'lucide-react';
import { Fragment, useEffect, useRef, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';

import { useChatMessages, useSendMessage } from '@/entities/chat/model/chat-query';
import type { MessageStatus } from '@/entities/chat/model/types';
import { useSessionStore } from '@/entities/session/model/session-store';
import { formatDate, formatTime } from '@/shared/lib/format';
import { Button } from '@/shared/ui/button';
import { Textarea } from '@/shared/ui/input';

interface ComposerValues {
  message: string;
}

interface ChatPanelProps {
  pollingError?: string | null;
}

function MessageStatusIcon({ status, error }: { status: MessageStatus; error?: string }) {
  if (status === 'pending') {
    return <Clock3 size={14} className="message-meta__check" aria-label="Отправляется" />;
  }

  if (status === 'sent') {
    return <Check size={14} className="message-meta__check" aria-label="Отправлено" />;
  }

  if (status === 'delivered' || status === 'read') {
    return <CheckCheck size={14} className="message-meta__check" aria-label={status === 'read' ? 'Прочитано' : 'Доставлено'} />;
  }

  return <AlertCircle size={14} className="message-meta__error" aria-label={error ?? 'Ошибка отправки'} />;
}

export function ChatPanel({ pollingError }: ChatPanelProps) {
  const activeChat = useSessionStore((state) => state.activeChat);
  const credentials = useSessionStore((state) => state.credentials);
  const { data: messages = [] } = useChatMessages(activeChat?.id);
  const sendMessage = useSendMessage();
  const [sendError, setSendError] = useState<{ chatId: string; message: string } | null>(null);
  const endOfMessagesRef = useRef<HTMLDivElement>(null);
  const { control, register, handleSubmit, reset } = useForm<ComposerValues>({ defaultValues: { message: '' } });
  const draft = useWatch({ control, name: 'message', defaultValue: '' });

  useEffect(() => {
    endOfMessagesRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const onSubmit = async ({ message }: ComposerValues) => {
    const text = message.trim();

    if (!text || !activeChat) {
      return;
    }

    setSendError(null);

    const targetChatId = activeChat.id;
    const scope = credentials ? `${credentials.apiUrl}|${credentials.idInstance}` : '';

    try {
      await sendMessage.mutateAsync({ chatId: targetChatId, text, scope });
      reset();
    } catch (error) {
      setSendError({
        chatId: targetChatId,
        message: error instanceof Error ? error.message : 'Не удалось отправить сообщение.',
      });
    }
  };

  if (!activeChat) {
    return (
      <section className="chat-panel chat-panel--empty">
        <div className="welcome-state">
          {pollingError && <div className="inline-alert"><AlertCircle size={16} /> {pollingError}</div>}
          <div className="welcome-state__icon"><MessageCircle size={28} /></div>
          <h1>Начните диалог</h1>
          <p>Введите номер телефона слева, чтобы создать чат и отправить первое сообщение в WhatsApp.</p>
          <div className="welcome-state__tip"><Info size={16} /> Сообщения загружаются через HTTP API GREEN-API</div>
        </div>
      </section>
    );
  }

  return (
    <section className="chat-panel">
      <header className="chat-header">
        <div className="chat-header__identity">
          <div className="avatar avatar--large">{activeChat.title.slice(1, 3)}</div>
          <div>
            <h1>{activeChat.title}</h1>
            <p><span className="status-dot status-dot--online" /> Личный чат WhatsApp</p>
          </div>
        </div>
        <div className="chat-header__status">
          {pollingError ? <><WifiOff size={15} /> Пауза получения</> : <><Wifi size={15} /> Приём включён</>}
        </div>
      </header>

      <div className="message-area" aria-live="polite">
        {pollingError && (
          <div className="inline-alert"><AlertCircle size={16} /> {pollingError}</div>
        )}
        {sendError?.chatId === activeChat.id && (
          <div className="inline-alert"><AlertCircle size={16} /> {sendError.message}</div>
        )}
        {messages.length === 0 ? (
          <div className="conversation-empty">
            <div className="conversation-empty__icon"><MessageCircle size={21} /></div>
            <strong>Здесь пока пусто</strong>
            <span>Напишите сообщение, чтобы начать диалог.</span>
          </div>
        ) : (
          <div className="message-list">
            {messages.map((message, index) => {
              const dateKey = new Date(message.timestamp).toDateString();
              const previousDateKey = index > 0 ? new Date(messages[index - 1].timestamp).toDateString() : null;

              return (
                <Fragment key={message.id}>
                  {dateKey !== previousDateKey && <div className="date-divider"><span>{formatDate(message.timestamp)}</span></div>}
                  <article className={`message-row message-row--${message.direction}`}>
                    <div className="message-bubble">
                      <p>{message.text}</p>
                      <span className="message-meta">
                        {formatTime(message.timestamp)}
                        {message.direction === 'outgoing' && <MessageStatusIcon status={message.status} error={message.error} />}
                      </span>
                    </div>
                  </article>
                </Fragment>
              );
            })}
            <div ref={endOfMessagesRef} />
          </div>
        )}
      </div>

      <form className="composer" onSubmit={handleSubmit(onSubmit)}>
        <div className="composer__input-wrap">
          <Textarea
            {...register('message', { maxLength: 20000 })}
            placeholder="Напишите сообщение…"
            rows={1}
            maxLength={20000}
            disabled={sendMessage.isPending}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                void handleSubmit(onSubmit)();
              }
            }}
          />
          <span className="composer__counter">{draft.length}/20000</span>
        </div>
        <Button type="submit" size="icon" aria-label="Отправить сообщение" title="Отправить сообщение" disabled={!draft.trim() || sendMessage.isPending}>
          {sendMessage.isPending ? <RefreshCw size={18} className="spin" /> : <Send size={18} />}
        </Button>
      </form>
    </section>
  );
}
