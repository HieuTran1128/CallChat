import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  ConnectedSocket,
  MessageBody,
  WsException,
} from '@nestjs/websockets';
import { JwtService } from '@nestjs/jwt';
import { ExtendedError, Namespace, Socket } from 'socket.io';
import { JwtPayload } from '../auth/auth.types';
import { UsersService } from '../users/users.service';
import { SocketService } from './socket.service';
import { ConversationsService } from '../conversations/conversations.service';
import { MessagesService } from '../messages/messages.service';
import { Types } from 'mongoose';
import { MessageAttachment } from '../messages/schemas/message.schema';
import { CallsService } from '../calls/calls.service';
import { CallType } from '../calls/schemas/call.schema';

type PresenceSocket = Socket<
  Record<string, never>,
  Record<string, never>,
  Record<string, never>,
  { userId?: string }
>;

@WebSocketGateway({
  namespace: 'presence',
  cors: { origin: true, credentials: true },
})
export class SocketGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  private server!: Namespace;

  constructor(
    private readonly jwtService: JwtService,
    private readonly usersService: UsersService,
    private readonly socketService: SocketService,
    private readonly conversationsService: ConversationsService,
    private readonly messagesService: MessagesService,
    private readonly callsService: CallsService,
  ) {}

  @SubscribeMessage('call:initiate')
  async initiateCall(
    @ConnectedSocket() client: PresenceSocket,
    @MessageBody() payload: unknown,
  ) {
    const userId = this.requireUserId(client);
    const receiverId = this.requireObjectId(payload, 'receiverId');
    const type = this.requireCallType(payload);
    const call = await this.callsService.create(userId, receiverId, type);
    this.server.to(this.userRoom(receiverId)).emit('call:incoming', call);
    return { ok: true, call };
  }

  @SubscribeMessage('call:accept')
  async acceptCall(
    @ConnectedSocket() client: PresenceSocket,
    @MessageBody() payload: unknown,
  ) {
    const userId = this.requireUserId(client);
    const call = await this.callsService.accept(
      this.requireObjectId(payload, 'callId'),
      userId,
    );
    this.server
      .to(this.userRoom(this.idOfPopulated(call.callerId)))
      .to(this.userRoom(this.idOfPopulated(call.receiverId)))
      .emit('call:accepted', call);
    return { ok: true, call };
  }

  @SubscribeMessage('call:reject')
  async rejectCall(
    @ConnectedSocket() client: PresenceSocket,
    @MessageBody() payload: unknown,
  ) {
    return this.finishCall(client, payload, true);
  }

  @SubscribeMessage('call:end')
  async endCall(
    @ConnectedSocket() client: PresenceSocket,
    @MessageBody() payload: unknown,
  ) {
    return this.finishCall(client, payload, false);
  }

  @SubscribeMessage('call:offer')
  forwardOffer(
    @ConnectedSocket() client: PresenceSocket,
    @MessageBody() payload: unknown,
  ) {
    return this.forwardSignal(client, payload, 'call:offer', 'offer');
  }

  @SubscribeMessage('call:answer')
  forwardAnswer(
    @ConnectedSocket() client: PresenceSocket,
    @MessageBody() payload: unknown,
  ) {
    return this.forwardSignal(client, payload, 'call:answer', 'answer');
  }

  @SubscribeMessage('call:ice-candidate')
  forwardIce(
    @ConnectedSocket() client: PresenceSocket,
    @MessageBody() payload: unknown,
  ) {
    return this.forwardSignal(
      client,
      payload,
      'call:ice-candidate',
      'candidate',
    );
  }

  afterInit(server: Namespace): void {
    server.use((client: PresenceSocket, next) => {
      void this.authenticate(client, next);
    });
  }

  private async authenticate(
    client: PresenceSocket,
    next: (error?: ExtendedError) => void,
  ): Promise<void> {
    const auth: unknown = client.handshake.auth;
    const token =
      typeof auth === 'object' && auth !== null && 'token' in auth
        ? (auth as { token?: unknown }).token
        : undefined;
    if (typeof token !== 'string') {
      next(new Error('Unauthorized'));
      return;
    }

    try {
      const payload = await this.jwtService.verifyAsync<JwtPayload>(token);
      const user = await this.usersService.findById(payload.sub);
      if (!user?.isActive) {
        next(new Error('Unauthorized'));
        return;
      }
      client.data.userId = payload.sub;
      next();
    } catch {
      next(new Error('Unauthorized'));
    }
  }

  async handleConnection(client: PresenceSocket): Promise<void> {
    const userId = client.data.userId;
    if (!userId) {
      client.disconnect(true);
      return;
    }

    if (await this.socketService.connect(userId, client.id)) {
      this.server.emit('presence:update', { userId, status: 'ONLINE' });
    }
    await client.join(this.userRoom(userId));
  }

  async handleDisconnect(client: PresenceSocket): Promise<void> {
    const userId = client.data.userId;
    if (!userId) return;

    if (await this.socketService.disconnect(userId, client.id)) {
      this.server.emit('presence:update', {
        userId,
        status: 'OFFLINE',
        lastSeenAt: new Date().toISOString(),
      });
    }
  }

  @SubscribeMessage('conversation:join')
  async joinConversation(
    @ConnectedSocket() client: PresenceSocket,
    @MessageBody() payload: unknown,
  ) {
    const userId = this.requireUserId(client);
    const conversationId = this.requireConversationId(payload);
    await this.conversationsService.requireAvailableConversation(
      conversationId,
      userId,
    );
    await client.join(this.conversationRoom(conversationId));
    await this.messagesService.markConversationRead(conversationId, userId);
    this.server
      .to(this.conversationRoom(conversationId))
      .emit('message:receipt', {
        conversationId,
        userId,
        status: 'READ',
      });
    return { ok: true, conversationId };
  }

  @SubscribeMessage('message:send')
  async sendMessage(
    @ConnectedSocket() client: PresenceSocket,
    @MessageBody() payload: unknown,
  ) {
    const userId = this.requireUserId(client);
    const data = this.requireMessagePayload(payload);
    const conversation =
      await this.conversationsService.requireAvailableConversation(
        data.conversationId,
        userId,
      );
    const createdMessage = data.attachments.length
      ? await this.messagesService.createWithAttachments(
          data.conversationId,
          userId,
          data.content,
          data.attachments,
          data.replyToId,
        )
      : await this.messagesService.create(
          data.conversationId,
          userId,
          {
            content: data.content,
          },
          data.replyToId,
        );
    let message: unknown = createdMessage;
    const receiverId = conversation.participants
      .map(String)
      .find((id) => id !== userId);
    if (receiverId && this.socketService.isOnline(receiverId)) {
      message =
        (await this.messagesService.markDelivered(
          String(createdMessage._id),
          receiverId,
        )) ?? message;
    }

    this.server
      .to(this.conversationRoom(data.conversationId))
      .to(receiverId ? this.userRoom(receiverId) : '')
      .to(this.userRoom(userId))
      .emit('message:new', message);
    return { ok: true, message };
  }

  @SubscribeMessage('typing:start')
  async startTyping(
    @ConnectedSocket() client: PresenceSocket,
    @MessageBody() payload: unknown,
  ): Promise<void> {
    await this.emitTyping(client, payload, true);
  }

  @SubscribeMessage('message:edit')
  async editMessage(
    @ConnectedSocket() client: PresenceSocket,
    @MessageBody() payload: unknown,
  ) {
    const userId = this.requireUserId(client);
    const messageId = this.requireMessageId(payload);
    const content = this.requireText(payload);
    const message = await this.messagesService.edit(messageId, userId, content);
    this.server
      .to(this.conversationRoom(String(message.conversationId)))
      .emit('message:updated', message);
    return { ok: true, message };
  }

  @SubscribeMessage('message:remove')
  async removeMessage(
    @ConnectedSocket() client: PresenceSocket,
    @MessageBody() payload: unknown,
  ) {
    const result = await this.messagesService.removeForEveryone(
      this.requireMessageId(payload),
      this.requireUserId(client),
    );
    this.server
      .to(this.conversationRoom(result.conversationId))
      .emit('message:removed', result);
    return { ok: true };
  }

  @SubscribeMessage('message:delete-for-me')
  async deleteMessageForMe(
    @ConnectedSocket() client: PresenceSocket,
    @MessageBody() payload: unknown,
  ) {
    const userId = this.requireUserId(client);
    const result = await this.messagesService.deleteForMe(
      this.requireMessageId(payload),
      userId,
    );
    this.server
      .to(this.userRoom(userId))
      .emit('message:deleted-for-me', result);
    return { ok: true };
  }

  @SubscribeMessage('message:react')
  async reactToMessage(
    @ConnectedSocket() client: PresenceSocket,
    @MessageBody() payload: unknown,
  ) {
    const userId = this.requireUserId(client);
    const messageId = this.requireMessageId(payload);
    if (
      typeof payload !== 'object' ||
      payload === null ||
      !('emoji' in payload) ||
      typeof payload.emoji !== 'string' ||
      !['👍', '❤️', '😂', '😮', '😢', '🙏'].includes(payload.emoji)
    )
      throw new WsException('Emoji không hợp lệ');
    const message = await this.messagesService.react(
      messageId,
      userId,
      payload.emoji,
    );
    this.server
      .to(this.conversationRoom(String(message.conversationId)))
      .emit('message:updated', message);
    return { ok: true, message };
  }

  @SubscribeMessage('typing:stop')
  async stopTyping(
    @ConnectedSocket() client: PresenceSocket,
    @MessageBody() payload: unknown,
  ): Promise<void> {
    await this.emitTyping(client, payload, false);
  }

  @SubscribeMessage('message:read')
  async readMessages(
    @ConnectedSocket() client: PresenceSocket,
    @MessageBody() payload: unknown,
  ): Promise<void> {
    const userId = this.requireUserId(client);
    const conversationId = this.requireConversationId(payload);
    const conversation =
      await this.conversationsService.requireAvailableConversation(
        conversationId,
        userId,
      );
    await this.messagesService.markConversationRead(conversationId, userId);
    const rooms = conversation.participants.map((id) =>
      this.userRoom(String(id)),
    );
    let target = this.server.to(this.conversationRoom(conversationId));
    rooms.forEach((room) => {
      target = target.to(room);
    });
    target.emit('message:receipt', { conversationId, userId, status: 'READ' });
  }

  private async emitTyping(
    client: PresenceSocket,
    payload: unknown,
    isTyping: boolean,
  ): Promise<void> {
    const userId = this.requireUserId(client);
    const conversationId = this.requireConversationId(payload);
    await this.conversationsService.requireAvailableConversation(
      conversationId,
      userId,
    );
    client.to(this.conversationRoom(conversationId)).emit('typing:update', {
      conversationId,
      userId,
      isTyping,
    });
  }

  private requireUserId(client: PresenceSocket): string {
    if (!client.data.userId) throw new WsException('Unauthorized');
    return client.data.userId;
  }

  private requireConversationId(payload: unknown): string {
    if (
      typeof payload !== 'object' ||
      payload === null ||
      !('conversationId' in payload) ||
      typeof payload.conversationId !== 'string' ||
      !Types.ObjectId.isValid(payload.conversationId)
    )
      throw new WsException('Conversation ID không hợp lệ');
    return payload.conversationId;
  }

  private requireMessagePayload(payload: unknown): {
    conversationId: string;
    content: string;
    attachments: MessageAttachment[];
    replyToId?: string;
  } {
    const conversationId = this.requireConversationId(payload);
    const attachments = this.readAttachments(payload);
    if (typeof payload !== 'object' || payload === null)
      throw new WsException('Nội dung tin nhắn không hợp lệ');
    const rawContent: unknown = 'content' in payload ? payload.content : '';
    if (typeof rawContent !== 'string')
      throw new WsException('Nội dung tin nhắn không hợp lệ');
    const content = rawContent.trim();
    if ((!content && attachments.length === 0) || content.length > 5000)
      throw new WsException('Nội dung tin nhắn không hợp lệ');
    let replyToId: string | undefined;
    if ('replyToId' in payload && payload.replyToId !== undefined) {
      if (
        typeof payload.replyToId !== 'string' ||
        !Types.ObjectId.isValid(payload.replyToId)
      )
        throw new WsException('Tin nhắn trả lời không hợp lệ');
      replyToId = payload.replyToId;
    }
    return { conversationId, content, attachments, replyToId };
  }

  private requireMessageId(payload: unknown): string {
    if (
      typeof payload !== 'object' ||
      payload === null ||
      !('messageId' in payload) ||
      typeof payload.messageId !== 'string' ||
      !Types.ObjectId.isValid(payload.messageId)
    )
      throw new WsException('Message ID không hợp lệ');
    return payload.messageId;
  }

  private requireText(payload: unknown): string {
    if (
      typeof payload !== 'object' ||
      payload === null ||
      !('content' in payload) ||
      typeof payload.content !== 'string' ||
      !payload.content.trim() ||
      payload.content.trim().length > 5000
    )
      throw new WsException('Nội dung không hợp lệ');
    return payload.content.trim();
  }

  private readAttachments(payload: unknown): MessageAttachment[] {
    if (
      typeof payload !== 'object' ||
      payload === null ||
      !('attachments' in payload) ||
      payload.attachments === undefined
    )
      return [];
    const rawAttachments: unknown = payload.attachments;
    if (!Array.isArray(rawAttachments) || rawAttachments.length > 10)
      throw new WsException('Danh sách tệp không hợp lệ');
    return (rawAttachments as unknown[]).map((item) => {
      if (
        typeof item !== 'object' ||
        item === null ||
        !('url' in item) ||
        typeof item.url !== 'string' ||
        !item.url.startsWith('https://res.cloudinary.com/') ||
        !('publicId' in item) ||
        typeof item.publicId !== 'string' ||
        !('name' in item) ||
        typeof item.name !== 'string' ||
        !('size' in item) ||
        typeof item.size !== 'number' ||
        !('mimeType' in item) ||
        typeof item.mimeType !== 'string' ||
        !('resourceType' in item) ||
        (item.resourceType !== 'image' && item.resourceType !== 'raw')
      )
        throw new WsException('Thông tin tệp không hợp lệ');
      const attachment = item as Record<string, unknown>;
      return {
        url: attachment.url as string,
        publicId: attachment.publicId as string,
        name: attachment.name as string,
        size: attachment.size as number,
        mimeType: attachment.mimeType as string,
        resourceType: attachment.resourceType as 'image' | 'raw',
      };
    });
  }

  private async finishCall(
    client: PresenceSocket,
    payload: unknown,
    rejected: boolean,
  ) {
    const userId = this.requireUserId(client);
    const callId = this.requireObjectId(payload, 'callId');
    const call = rejected
      ? await this.callsService.reject(callId, userId)
      : await this.callsService.end(callId, userId);
    const callerId = this.idOfPopulated(call.callerId);
    const receiverId = this.idOfPopulated(call.receiverId);
    this.server
      .to(this.userRoom(callerId))
      .to(this.userRoom(receiverId))
      .emit(rejected ? 'call:rejected' : 'call:ended', call);
    return { ok: true, call };
  }

  private async forwardSignal(
    client: PresenceSocket,
    payload: unknown,
    event: 'call:offer' | 'call:answer' | 'call:ice-candidate',
    field: 'offer' | 'answer' | 'candidate',
  ) {
    const userId = this.requireUserId(client);
    const callId = this.requireObjectId(payload, 'callId');
    if (typeof payload !== 'object' || payload === null || !(field in payload))
      throw new WsException('Dữ liệu signaling không hợp lệ');
    const signalData: unknown = (payload as Record<string, unknown>)[field];
    const call = await this.callsService.requireSignalAccess(callId, userId);
    const receiverId = this.callsService.otherUserId(call, userId);
    this.server.to(this.userRoom(receiverId)).emit(event, {
      callId,
      fromUserId: userId,
      [field]: signalData,
    });
    return { ok: true };
  }

  private requireObjectId(payload: unknown, field: string): string {
    if (
      typeof payload !== 'object' ||
      payload === null ||
      !(field in payload) ||
      typeof payload[field] !== 'string' ||
      !Types.ObjectId.isValid(payload[field])
    )
      throw new WsException(`${field} không hợp lệ`);
    return payload[field];
  }

  private requireCallType(payload: unknown): CallType {
    if (
      typeof payload !== 'object' ||
      payload === null ||
      !('type' in payload) ||
      (payload.type !== CallType.AUDIO && payload.type !== CallType.VIDEO)
    )
      throw new WsException('Loại cuộc gọi không hợp lệ');
    return payload.type;
  }

  private idOfPopulated(value: unknown): string {
    if (typeof value === 'object' && value !== null && '_id' in value)
      return String(value._id);
    return String(value);
  }

  private conversationRoom(conversationId: string): string {
    return `conversation:${conversationId}`;
  }

  private userRoom(userId: string): string {
    return `user:${userId}`;
  }
}
