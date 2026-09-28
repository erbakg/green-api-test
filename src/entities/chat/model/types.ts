export interface Chat {
  id: string;
  phone: string;
  title: string;
}

export type MessageDirection = 'incoming' | 'outgoing';
export type MessageStatus = 'pending' | 'sent' | 'delivered' | 'read' | 'failed' | 'suspended' | 'noAccount' | 'notInGroup';

export interface ChatMessage {
  id: string;
  chatId: string;
  text: string;
  direction: MessageDirection;
  timestamp: number;
  status: MessageStatus;
  phone?: string;
  error?: string;
}

export interface MessageStatusEvent {
  id: string;
  chatId: string;
  status: MessageStatus;
  timestamp: number;
  description?: string;
  phone?: string;
}

export interface SendMessageResponse {
  idMessage?: string;
}

export interface CheckWhatsappResponse {
  existsWhatsapp?: boolean;
  chatId?: string;
  status?: boolean;
  reason?: string;
}

export interface NotificationEnvelope {
  receiptId: number;
  body: NotificationBody;
  malformed?: boolean;
}

export interface NotificationAudit {
  id: string;
  receiptId: number;
  type: string;
  timestamp: number;
  description?: string;
}

export interface NotificationBody {
  typeWebhook?: string;
  idMessage?: string;
  timestamp?: number;
  chatId?: string;
  status?: string;
  description?: string;
  sendByApi?: boolean;
  senderData?: {
    chatId?: string;
    chatName?: string;
    senderName?: string;
    senderPhoneNumber?: number | string;
  };
  messageData?: {
    typeMessage?: string;
    textMessageData?: {
      textMessage?: string;
    };
    extendedTextMessageData?: {
      text?: string;
    };
  };
}
