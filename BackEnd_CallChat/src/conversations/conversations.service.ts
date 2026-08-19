import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { MongoServerError } from 'mongodb';
import { Model, Types } from 'mongoose';
import { Message } from '../messages/schemas/message.schema';
import { ContactsService } from '../contacts/contacts.service';
import {
  Conversation,
  ConversationDocument,
  ConversationType,
} from './schemas/conversation.schema';

@Injectable()
export class ConversationsService {
  constructor(
    @InjectModel(Conversation.name)
    private readonly conversationModel: Model<Conversation>,
    private readonly contactsService: ContactsService,
    @InjectModel(Message.name) private readonly messageModel: Model<Message>,
  ) {}

  async getOrCreateDirect(currentUserId: string, targetUserId: string) {
    await this.contactsService.assertCanChat(currentUserId, targetUserId);
    const directKey = this.createDirectKey(currentUserId, targetUserId);
    const existing = await this.conversationModel.findOne({ directKey }).exec();
    if (existing) return this.populateConversation(existing);

    try {
      const conversation = await this.conversationModel.create({
        type: ConversationType.DIRECT,
        participants: directKey.split(':').map((id) => new Types.ObjectId(id)),
        directKey,
        readStates: directKey.split(':').map((id) => ({
          userId: new Types.ObjectId(id),
          lastReadAt: new Date(),
        })),
      });
      return this.populateConversation(conversation);
    } catch (error) {
      if (!(error instanceof MongoServerError) || error.code !== 11000)
        throw error;

      const conversation = await this.conversationModel
        .findOne({ directKey })
        .exec();
      if (!conversation) throw error;
      return this.populateConversation(conversation);
    }
  }

  async list(currentUserId: string) {
    const friendIds = await this.contactsService.listFriendIds(currentUserId);
    if (friendIds.length === 0) return [];

    const conversations = await this.conversationModel
      .find({
        type: ConversationType.DIRECT,
        $and: [
          { participants: new Types.ObjectId(currentUserId) },
          {
            participants: {
              $in: friendIds.map((id) => new Types.ObjectId(id)),
            },
          },
        ],
      })
      .populate(
        'participants',
        'username displayName avatarUrl status lastSeenAt',
      )
      .sort({ updatedAt: -1 })
      .lean()
      .exec();

    return Promise.all(
      conversations.map(async (conversation) => {
        const readState = conversation.readStates?.find(
          (state) => String(state.userId) === currentUserId,
        );
        const [unreadCount, lastMessage] = await Promise.all([
          this.messageModel.countDocuments({
            conversationId: conversation._id,
            senderId: { $ne: new Types.ObjectId(currentUserId) },
            createdAt: { $gt: readState?.lastReadAt ?? new Date(0) },
          }),
          this.messageModel
            .findOne({
              conversationId: conversation._id,
              deletedFor: { $ne: new Types.ObjectId(currentUserId) },
            })
            .sort({ createdAt: -1, _id: -1 })
            .select(
              'senderId content type attachments deliveredTo readBy createdAt',
            )
            .lean()
            .exec(),
        ]);
        return { ...conversation, unreadCount, lastMessage };
      }),
    );
  }

  async requireAvailableConversation(
    conversationId: string,
    currentUserId: string,
  ): Promise<ConversationDocument> {
    const conversation = await this.conversationModel
      .findById(conversationId)
      .exec();
    if (
      !conversation ||
      !conversation.participants.some((id) => String(id) === currentUserId)
    )
      throw new NotFoundException('Không tìm thấy cuộc trò chuyện');

    const targetUserId = conversation.participants
      .map(String)
      .find((id) => id !== currentUserId);
    if (!targetUserId)
      throw new NotFoundException('Cuộc trò chuyện không hợp lệ');

    await this.contactsService.assertCanChat(currentUserId, targetUserId);
    return conversation;
  }

  async touch(conversationId: string): Promise<void> {
    await this.conversationModel
      .updateOne({ _id: conversationId }, { $currentDate: { updatedAt: true } })
      .exec();
  }

  async markRead(conversationId: string, userId: string): Promise<void> {
    const userObjectId = new Types.ObjectId(userId);
    await this.conversationModel
      .updateOne(
        { _id: conversationId, participants: userObjectId },
        [
          {
            $set: {
              readStates: {
                $concatArrays: [
                  {
                    $filter: {
                      input: { $ifNull: ['$readStates', []] },
                      as: 'state',
                      cond: { $ne: ['$$state.userId', userObjectId] },
                    },
                  },
                  [{ userId: userObjectId, lastReadAt: '$$NOW' }],
                ],
              },
            },
          },
        ],
        { updatePipeline: true },
      )
      .exec();
  }

  private createDirectKey(firstId: string, secondId: string): string {
    return [firstId, secondId].sort().join(':');
  }

  private populateConversation(conversation: ConversationDocument) {
    return conversation.populate(
      'participants',
      'username displayName avatarUrl status lastSeenAt',
    );
  }
}
