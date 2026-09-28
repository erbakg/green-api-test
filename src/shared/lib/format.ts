export function formatTime(timestamp: number) {
  return new Intl.DateTimeFormat('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(timestamp);
}

export function formatDate(timestamp: number) {
  const date = new Date(timestamp);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  if (date.toDateString() === today.toDateString()) {
    return 'Сегодня';
  }

  if (date.toDateString() === yesterday.toDateString()) {
    return 'Вчера';
  }

  return new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

export function formatChatId(chatId: string) {
  const digits = chatId.replace(/\D/g, '');

  if (!digits) {
    return chatId;
  }

  return `+${digits}`;
}

export function normalizeChatId(value: string) {
  const trimmed = value.trim();

  if (trimmed.includes('@')) {
    return trimmed;
  }

  const digits = trimmed.replace(/\D/g, '');
  return digits ? `${digits}@c.us` : '';
}

export function normalizePhone(value: string) {
  return value.replace(/\D/g, '');
}

export function getPhoneFromChatId(chatId: string) {
  const [value, suffix] = chatId.split('@');

  return suffix?.toLowerCase() === 'c.us' ? normalizePhone(value) : '';
}
