import { zodResolver } from '@hookform/resolvers/zod';
import { KeyRound, LockKeyhole, PlugZap, Server } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { createGreenApiClient, GreenApiError } from '@/entities/chat/api/chat-api';
import { useSessionStore } from '@/entities/session/model/session-store';
import { env } from '@/shared/config/env';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';

const schema = z.object({
  apiUrl: z.url('Введите корректный URL').refine((value) => new URL(value).protocol === 'https:', 'Используйте HTTPS URL'),
  idInstance: z.string().trim().regex(/^\d+$/, 'Только цифры'),
  apiTokenInstance: z.string().trim().min(10, 'Токен слишком короткий'),
});

type FormValues = z.infer<typeof schema>;

export function AuthenticateForm() {
  const setCredentials = useSessionStore((state) => state.setCredentials);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      apiUrl: env.greenApiUrl,
      idInstance: '',
      apiTokenInstance: '',
    },
  });

  const onSubmit = async (values: FormValues) => {
    setSubmitError(null);

    try {
      const credentials = {
        apiUrl: values.apiUrl.replace(/\/+$/, ''),
        idInstance: values.idInstance,
        apiTokenInstance: values.apiTokenInstance,
      };

      const state = await createGreenApiClient(credentials).getStateInstance();

      if (state.stateInstance !== 'authorized') {
        throw new GreenApiError(`Инстанс не авторизован: ${state.stateInstance ?? 'неизвестное состояние'}`);
      }

      setCredentials(credentials);
    } catch (error) {
      setSubmitError(error instanceof GreenApiError ? error.message : 'Не удалось проверить учётные данные.');
    }
  };

  return (
    <main className="auth-screen">
      <section className="auth-card" aria-labelledby="auth-title">
        <div className="brand brand--large">
          <span className="brand__mark"><PlugZap size={20} strokeWidth={2.5} /></span>
          <span>WhatsApp Desk</span>
        </div>
        <div className="auth-card__intro">
          <p className="eyebrow">GREEN-API · WHATSAPP</p>
          <h1 id="auth-title">Подключите рабочий инстанс</h1>
          <p>Данные нужны только для прямого подключения к GREEN-API из браузера.</p>
        </div>

        <form className="form-stack" onSubmit={handleSubmit(onSubmit)}>
          <label className="field">
            <span className="field__label"><Server size={15} /> API URL</span>
            <Input {...register('apiUrl')} error={Boolean(errors.apiUrl)} placeholder="https://api.green-api.com" />
            {errors.apiUrl && <span className="field__error">{errors.apiUrl.message}</span>}
          </label>
          <label className="field">
            <span className="field__label"><KeyRound size={15} /> ID инстанса</span>
            <Input {...register('idInstance')} error={Boolean(errors.idInstance)} placeholder="1101000001" inputMode="numeric" />
            {errors.idInstance && <span className="field__error">{errors.idInstance.message}</span>}
          </label>
          <label className="field">
            <span className="field__label"><LockKeyhole size={15} /> API token instance</span>
            <Input {...register('apiTokenInstance')} error={Boolean(errors.apiTokenInstance)} placeholder="Ваш токен GREEN-API" type="password" />
            {errors.apiTokenInstance && <span className="field__error">{errors.apiTokenInstance.message}</span>}
          </label>

          {submitError && <div className="form-alert form-alert--error">{submitError}</div>}
          <Button type="submit" className="button--wide" disabled={isSubmitting}>
            {isSubmitting ? 'Проверяем подключение…' : 'Подключиться'}
          </Button>
        </form>
        <p className="auth-card__note">Для получения сообщений WhatsApp-инстанс должен быть настроен на HTTP API: webhook URL должен быть пустым.</p>
      </section>
    </main>
  );
}
