# WhatsApp Desk

Минимальный web-клиент текстового чата WhatsApp на React и GREEN-API.

## Стек

- Vite + React 19 + TypeScript — быстрый dev server, строгая типизация и production build.
- Feature-Sliced Design — разделение по слоям `app`, `pages`, `widgets`, `features`, `entities`, `shared`.
- TanStack Query — server state, query cache, мутация отправки и единая работа с состояниями loading/error.
- Zustand — только локальное состояние сессии и выбранного чата; сообщения остаются в Query cache.
- React Hook Form + Zod — типизированная валидация форм без ручного управления каждым полем.
- Vitest — тесты нормализации уведомлений и дедупликации сообщений.
- Lucide React — лёгкая и единообразная иконография без копирования SVG в компоненты.

## Запуск

```bash
npm install
cp .env.example .env
npm run dev
```

Затем в интерфейсе укажите `idInstance` и `apiTokenInstance` WhatsApp-инстанса из GREEN-API.

## Важные детали интеграции

1. При подключении приложение вызывает `getStateInstance`, чтобы не запускать чат с невалидными учётными данными.
2. При создании чата номер проверяется через WhatsApp-метод `CheckWhatsapp`, после чего приложение использует выданный сервером `chatId`.
3. Отправка выполняется через `POST /waInstance{idInstance}/sendMessage/{apiTokenInstance}`.
4. Получение реализовано единым long polling-циклом: `receiveNotification` → маршрутизация события в cache нужного `chatId` → `deleteNotification`. Polling отменяется через `AbortController` при выходе со страницы.
5. Входящие и исходящие webhook-события приводятся к единой модели `ChatMessage`, а `outgoingMessageStatus` обновляет статус сообщения (`sent`, `delivered`, `read` или ошибка). Повторные события дедуплицируются по `idMessage`; статусы временно буферизуются до появления самого сообщения.
6. Неподдерживаемые медиа-события не теряются молча: в текстовом интерфейсе показывается placeholder (`Изображение`, `Документ` и т. п.).
7. История и список чатов сохраняются только в `sessionStorage`, без credentials, с отдельным scope для `apiUrl` и `idInstance`; при выходе кэш очищается.
8. Токен не сохраняется в `localStorage` или `sessionStorage` и остаётся только в памяти вкладки. Для production-версии с общим аккаунтом нужен backend/BFF, чтобы не выдавать API-токен браузеру.
9. API URL принимается только по HTTPS; перед отправкой и polling ответы GREEN-API проверяются runtime-схемами.

## Команды

```bash
npm run dev       # локальная разработка
npm run build     # typecheck + production build
npm run lint      # ESLint
npm test          # unit-тесты
```
