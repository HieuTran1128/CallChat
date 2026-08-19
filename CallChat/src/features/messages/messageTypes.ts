export interface ChatMessage {
  id: string
  conversationId: string
  senderId: string
  content: string
  type: 'TEXT' | 'IMAGE' | 'FILE'
  attachments: MessageAttachment[]
  replyTo?: string
  replyPreview?: { senderId: string; content: string; type: 'TEXT' | 'IMAGE' | 'FILE' }
  replyUnavailable: boolean
  reactions: { userId: string; emoji: string }[]
  editedAt?: string
  deliveredTo: string[]
  readBy: string[]
  createdAt: string
}
export interface MessageAttachment { url: string; publicId: string; name: string; size: number; mimeType: string; resourceType: 'image' | 'raw' }
export interface MessageReceipt { conversationId: string; userId: string; status: 'READ' }
export interface TypingUpdate { conversationId: string; userId: string; isTyping: boolean }
