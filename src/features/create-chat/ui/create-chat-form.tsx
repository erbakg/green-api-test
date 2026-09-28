import { zodResolver } from '@hookform/resolvers/zod';
import { MessageCirclePlus, Phone } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { createGreenApiClient, GreenApiError } from '@/entities/chat/api/chat-api';
import type { Chat } from '@/entities/chat/model/types';
import { useSessionStore } from '@/entities/session/model/session-store';
import { formatChatId, normalizeChatId } from '@/shared/lib/format';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';

const schema = z.object({
  phone: z.string().trim()
    .min(1, 'Введите номер телефона')
    .refine((value) => {
      if (value.includes('@')) {
        return /^\d+@(c\.us|lid|g\.us)$/i.test(value);
      }

      const digits = value.replace(/\D/g, '');
      return /^\d{11,15}$/.test(digits);
    }, 'Введите номер в международном формате (11–15 цифр)'),
});

type FormValues = z.infer<typeof schema>;

export function CreateChatForm() {
  const credentials = useSessionStore((state) => state.credentials);
  const setActiveChat = useSessionStore((state) => state.setActiveChat);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { phone: '' },
  });

  const onSubmit = async (values: FormValues) => {
    setSubmitError(null);
    const enteredValue = values.phone.trim();
    const enteredChatId = normalizeChatId(enteredValue);

    if (!enteredChatId || !credentials) {
      return;
    }

    try {
      let chatId = enteredChatId;

      if (!enteredValue.includes('@')) {
        const phoneNumber = Number(enteredValue.replace(/\D/g, ''));

        if (!Number.isSafeInteger(phoneNumber)) {
          setSubmitError('Введите номер в международном формате.');
          return;
        }

        const result = await createGreenApiClient(credentials).checkWhatsapp(phoneNumber);

        if (!result.existsWhatsapp || !result.chatId) {
          setSubmitError('На этом номере не найден аккаунт WhatsApp.');
          return;
        }

        chatId = result.chatId;
      }

      const chat: Chat = {
        id: chatId,
        phone: enteredValue,
        title: formatChatId(enteredValue),
      };

      setActiveChat(chat);
      reset();
    } catch (error) {
      setSubmitError(error instanceof GreenApiError ? error.message : 'Не удалось создать чат.');
    }
  };

  return (
    <form className="new-chat" onSubmit={handleSubmit(onSubmit)}>
      <div className="section-heading">
        <span className="section-heading__title">Новый чат</span>
        <MessageCirclePlus size={16} />
      </div>
      <div className="new-chat__row">
        <label className="field field--compact">
          <span className="sr-only">Номер телефона</span>
          <Input {...register('phone')} error={Boolean(errors.phone)} placeholder="Номер телефона" inputMode="tel" />
        </label>
        <Button type="submit" size="icon" aria-label="Создать чат" title="Создать чат" disabled={isSubmitting}><Phone size={17} /></Button>
      </div>
      {errors.phone && <span className="field__error">{errors.phone.message}</span>}
      {submitError && <span className="field__error">{submitError}</span>}
      <p className="new-chat__hint">Номер проверяется через CheckWhatsapp, затем используется chatId.</p>
    </form>
  );
}
