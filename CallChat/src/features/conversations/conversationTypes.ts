import type { ContactUser } from '../contacts/contactsTypes'

export interface LastMessagePreview { id: string; senderId: string; content: string; type: 'TEXT' | 'IMAGE' | 'FILE'; createdAt: string }

export interface Conversation {
  id: string
  type: 'DIRECT'
  participants: ContactUser[]
  createdAt: string
  updatedAt: string
  unreadCount: number
  lastMessage: LastMessagePreview | null
}
