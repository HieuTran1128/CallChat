import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ConversationsService } from '../conversations/conversations.service';
import { CreateMessageDto } from './dto/create-message.dto';
import { MessagesQueryDto } from './dto/messages-query.dto';
import {
  Message,
  MessageAttachment,
  MessageType,
} from './schemas/message.schema';
import { CloudinaryService } from '../uploads/cloudinary.service';

@Injectable()
export class MessagesService {
  constructor(
    @InjectModel(Message.name) private readonly messageModel: Model<Message>,
    private readonly conversationsService: ConversationsService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  async list(
    conversationId: string,
    currentUserId: string,
    query: MessagesQueryDto,
  ) {
    await this.conversationsService.requireAvailableConversation(
      conversationId,
      currentUserId,
    );

    const filter = {
      conversationId: new Types.ObjectId(conversationId),
      deletedFor: { $ne: new Types.ObjectId(currentUserId) },
    };
    const [newestFirst, total] = await Promise.all([
      this.messageModel
        .find(filter)
        .sort({ createdAt: -1, _id: -1 })
        .skip((query.page - 1) * query.limit)
        .limit(query.limit)
        .lean()
        .exec(),
      this.messageModel.countDocuments(filter).exec(),
    ]);

    const replyIds = newestFirst
      .map((message) => message.replyTo)
      .filter((id): id is Types.ObjectId => Boolean(id));
    if (replyIds.length > 0) {
      const existingReplyIds = new Set(
        (
          await this.messageModel
            .distinct('_id', { _id: { $in: replyIds } })
            .exec()
        ).map(String),
      );
      const unavailableMessageIds: Types.ObjectId[] = [];
      newestFirst.forEach((message) => {
        if (message.replyTo && !existingReplyIds.has(String(message.replyTo))) {
          message.replyUnavailable = true;
          message.replyPreview = undefined;
          unavailableMessageIds.push(message._id);
        }
      });
      if (unavailableMessageIds.length > 0) {
        await this.messageModel
          .updateMany(
            { _id: { $in: unavailableMessageIds } },
            { $set: { replyUnavailable: true }, $unset: { replyPreview: 1 } },
          )
          .exec();
      }
    }

    return {
      items: newestFirst.reverse(),
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  async create(
    conversationId: string,
    currentUserId: string,
    dto: CreateMessageDto,
    replyToId?: string,
  ) {
    await this.conversationsService.requireAvailableConversation(
      conversationId,
      currentUserId,
    );

    const replyPreview = await this.getReplyPreview(conversationId, replyToId);
    const message = await this.messageModel.create({
      conversationId: new Types.ObjectId(conversationId),
      senderId: new Types.ObjectId(currentUserId),
      content: dto.content,
      type: dto.type ?? MessageType.TEXT,
      ...(replyToId && {
        replyTo: new Types.ObjectId(replyToId),
        replyPreview,
      }),
    });
    await this.conversationsService.touch(conversationId);
    return message;
  }

  async uploadAttachments(
    conversationId: string,
    currentUserId: string,
    files: Express.Multer.File[],
  ): Promise<MessageAttachment[]> {
    await this.conversationsService.requireAvailableConversation(
      conversationId,
      currentUserId,
    );
    const uploaded: MessageAttachment[] = [];
    try {
      for (const file of files) {
        const isImage = /^image\/(jpeg|png|webp|gif)$/.test(file.mimetype);
        const result = await this.cloudinaryService.uploadAttachment(
          file.buffer,
          isImage,
        );
        uploaded.push({
          url: result.secure_url,
          publicId: result.public_id,
          name: file.originalname,
          size: file.size,
          mimeType: file.mimetype,
          resourceType: isImage ? 'image' : 'raw',
        });
      }
      return uploaded;
    } catch (error) {
      await Promise.all(
        uploaded.map((file) =>
          this.cloudinaryService.deleteAsset(file.publicId, file.resourceType),
        ),
      );
      throw error;
    }
  }

  async createWithAttachments(
    conversationId: string,
    currentUserId: string,
    content: string,
    attachments: MessageAttachment[],
    replyToId?: string,
  ) {
    await this.conversationsService.requireAvailableConversation(
      conversationId,
      currentUserId,
    );
    const type = attachments.every((file) => file.resourceType === 'image')
      ? MessageType.IMAGE
      : MessageType.FILE;
    const replyPreview = await this.getReplyPreview(conversationId, replyToId);
    const message = await this.messageModel.create({
      conversationId: new Types.ObjectId(conversationId),
      senderId: new Types.ObjectId(currentUserId),
      content,
      type,
      attachments,
      ...(replyToId && {
        replyTo: new Types.ObjectId(replyToId),
        replyPreview,
      }),
    });
    await this.conversationsService.touch(conversationId);
    return message;
  }

  async edit(messageId: string, userId: string, content: string) {
    const message = await this.requireMessageForMember(messageId, userId);
    if (String(message.senderId) !== userId)
      throw new ForbiddenException('Chỉ người gửi mới có thể sửa tin nhắn');
    message.content = content.trim();
    message.editedAt = new Date();
    return message.save();
  }

  async removeForEveryone(messageId: string, userId: string) {
    const message = await this.requireMessageForMember(messageId, userId);
    if (String(message.senderId) !== userId)
      throw new ForbiddenException('Chỉ người gửi mới có thể thu hồi tin nhắn');
    await this.messageModel
      .updateMany(
        { replyTo: message._id },
        { $set: { replyUnavailable: true }, $unset: { replyPreview: 1 } },
      )
      .exec();
    await message.deleteOne();
    await Promise.all(
      message.attachments.map((file) =>
        this.cloudinaryService.deleteAsset(file.publicId, file.resourceType),
      ),
    );
    return { messageId, conversationId: String(message.conversationId) };
  }

  async deleteForMe(messageId: string, userId: string) {
    const message = await this.requireMessageForMember(messageId, userId);
    if (!message.deletedFor.some((id) => String(id) === userId)) {
      message.deletedFor.push(new Types.ObjectId(userId));
      await message.save();
    }
    return { messageId, conversationId: String(message.conversationId) };
  }

  async react(messageId: string, userId: string, emoji: string) {
    const message = await this.requireMessageForMember(messageId, userId);
    const existing = message.reactions.find(
      (reaction) => String(reaction.userId) === userId,
    );
    if (existing?.emoji === emoji) {
      message.reactions = message.reactions.filter(
        (reaction) => String(reaction.userId) !== userId,
      );
    } else if (existing) existing.emoji = emoji;
    else message.reactions.push({ userId: new Types.ObjectId(userId), emoji });
    return message.save();
  }

  private async requireMessageForMember(messageId: string, userId: string) {
    const message = await this.messageModel.findById(messageId).exec();
    if (!message) throw new NotFoundException('Không tìm thấy tin nhắn');
    await this.conversationsService.requireAvailableConversation(
      String(message.conversationId),
      userId,
    );
    return message;
  }

  private async getReplyPreview(conversationId: string, replyToId?: string) {
    if (!replyToId) return undefined;
    const original = await this.messageModel
      .findOne({
        _id: replyToId,
        conversationId: new Types.ObjectId(conversationId),
      })
      .exec();
    if (!original)
      throw new NotFoundException('Tin nhắn trả lời không tồn tại');
    return {
      senderId: original.senderId,
      content: original.content,
      type: original.type,
    };
  }

  async markDelivered(messageId: string, userId: string) {
    return this.messageModel
      .findByIdAndUpdate(
        messageId,
        { $addToSet: { deliveredTo: new Types.ObjectId(userId) } },
        { new: true },
      )
      .lean()
      .exec();
  }

  async markConversationRead(
    conversationId: string,
    userId: string,
  ): Promise<void> {
    await this.messageModel
      .updateMany(
        {
          conversationId: new Types.ObjectId(conversationId),
          senderId: { $ne: new Types.ObjectId(userId) },
        },
        {
          $addToSet: {
            deliveredTo: new Types.ObjectId(userId),
            readBy: new Types.ObjectId(userId),
          },
        },
      )
      .exec();
    await this.conversationsService.markRead(conversationId, userId);
  }
}
