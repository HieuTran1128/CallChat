import { apiRequest } from '../../shared/services/api'
import type { ChatMessage, MessageAttachment } from './messageTypes'

export type ApiMessage = Omit<ChatMessage, 'id' | 'conversationId' | 'senderId'> & { _id?: string; id?: string; conversationId: string | { _id: string }; senderId: string | { _id: string } }
interface Page { items: ApiMessage[]; pagination: { page: number; limit: number; total: number; totalPages: number } }
export const normalizeMessage = (message: ApiMessage): ChatMessage => ({
  ...message,
  id: message.id ?? message._id ?? '',
  conversationId: typeof message.conversationId === 'string' ? message.conversationId : message.conversationId._id,
  senderId: typeof message.senderId === 'string' ? message.senderId : message.senderId._id,
  deliveredTo: (message.deliveredTo ?? []).map(String),
  readBy: (message.readBy ?? []).map(String),
  attachments: message.attachments ?? [],
  replyTo: message.replyTo ? String(message.replyTo) : undefined,
  replyPreview: message.replyPreview ? { ...message.replyPreview, senderId: String(message.replyPreview.senderId) } : undefined,
  replyUnavailable: message.replyUnavailable ?? false,
  reactions: (message.reactions ?? []).map((reaction) => ({ ...reaction, userId: String(reaction.userId) })),
})
export const messagesService = {
  list: (conversationId: string, page = 1) => apiRequest<Page>(`/conversations/${conversationId}/messages?page=${page}&limit=30`).then((result) => ({ ...result, items: result.items.map(normalizeMessage) })),
  uploadAttachments: (conversationId: string, files: File[]) => {
    const form = new FormData()
    files.forEach((file) => form.append('files', file))
    return apiRequest<MessageAttachment[]>(`/conversations/${conversationId}/messages/attachments`, { method: 'POST', body: form })
  },
}
