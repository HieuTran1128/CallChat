import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { MongoServerError } from 'mongodb';
import { UsersService } from '../users/users.service';
import {
  Contact,
  ContactDocument,
  ContactStatus,
} from './schemas/contact.schema';

@Injectable()
export class ContactsService {
  constructor(
    @InjectModel(Contact.name) private readonly contactModel: Model<Contact>,
    private readonly usersService: UsersService,
  ) {}

  async sendRequest(currentUserId: string, targetUserId: string) {
    this.ensureDifferentUsers(currentUserId, targetUserId);
    await this.usersService.getProfile(targetUserId);
    const pairKey = this.createPairKey(currentUserId, targetUserId);
    const existing = await this.contactModel.findOne({ pairKey }).exec();
    if (existing?.status === ContactStatus.BLOCKED)
      throw new ForbiddenException('Không thể gửi lời mời cho người dùng này');
    if (existing?.status === ContactStatus.PENDING)
      throw new ConflictException('Lời mời kết bạn đang chờ xử lý');
    if (existing?.status === ContactStatus.ACCEPTED)
      throw new ConflictException('Hai người đã là bạn bè');

    if (existing) {
      existing.requestedBy = new Types.ObjectId(currentUserId);
      existing.status = ContactStatus.PENDING;
      existing.rejectedAt = undefined;
      return this.populateContact(await existing.save());
    }

    try {
      const contact = await this.contactModel.create({
        participants: pairKey.split(':').map((id) => new Types.ObjectId(id)),
        pairKey,
        requestedBy: new Types.ObjectId(currentUserId),
        status: ContactStatus.PENDING,
      });
      return this.populateContact(contact);
    } catch (error) {
      if (error instanceof MongoServerError && error.code === 11000)
        throw new ConflictException('Quan hệ giữa hai người dùng đã tồn tại');
      throw error;
    }
  }

  acceptRequest(contactId: string, currentUserId: string) {
    return this.resolveRequest(contactId, currentUserId, true);
  }

  rejectRequest(contactId: string, currentUserId: string) {
    return this.resolveRequest(contactId, currentUserId, false);
  }

  async cancelRequest(contactId: string, currentUserId: string): Promise<void> {
    const contact = await this.requireContact(contactId);
    if (
      contact.status !== ContactStatus.PENDING ||
      String(contact.requestedBy) !== currentUserId
    )
      throw new ForbiddenException('Bạn không thể hủy lời mời này');
    await contact.deleteOne();
  }

  listFriends(currentUserId: string) {
    return this.contactModel
      .find({
        participants: new Types.ObjectId(currentUserId),
        status: ContactStatus.ACCEPTED,
      })
      .populate('participants', 'username displayName avatarUrl status')
      .sort({ updatedAt: -1 })
      .lean()
      .exec();
  }

  async assertCanChat(
    currentUserId: string,
    targetUserId: string,
  ): Promise<void> {
    this.ensureDifferentUsers(currentUserId, targetUserId);
    const contact = await this.contactModel
      .findOne({ pairKey: this.createPairKey(currentUserId, targetUserId) })
      .select('status')
      .lean()
      .exec();

    if (contact?.status === ContactStatus.BLOCKED)
      throw new ForbiddenException('Không thể trò chuyện với người đã bị chặn');
    if (contact?.status !== ContactStatus.ACCEPTED)
      throw new ForbiddenException('Chỉ có thể trò chuyện với bạn bè');
  }

  async listFriendIds(currentUserId: string): Promise<string[]> {
    const contacts = await this.contactModel
      .find({
        participants: new Types.ObjectId(currentUserId),
        status: ContactStatus.ACCEPTED,
      })
      .select('participants')
      .lean()
      .exec();

    return contacts.flatMap((contact) =>
      contact.participants
        .map(String)
        .filter((participantId) => participantId !== currentUserId),
    );
  }

  listIncoming(currentUserId: string) {
    return this.contactModel
      .find({
        participants: new Types.ObjectId(currentUserId),
        requestedBy: { $ne: new Types.ObjectId(currentUserId) },
        status: ContactStatus.PENDING,
      })
      .populate(
        'participants requestedBy',
        'username displayName avatarUrl status',
      )
      .sort({ createdAt: -1 })
      .lean()
      .exec();
  }

  listOutgoing(currentUserId: string) {
    return this.contactModel
      .find({
        requestedBy: new Types.ObjectId(currentUserId),
        status: ContactStatus.PENDING,
      })
      .populate('participants', 'username displayName avatarUrl status')
      .sort({ createdAt: -1 })
      .lean()
      .exec();
  }

  async removeFriend(currentUserId: string, friendId: string): Promise<void> {
    const contact = await this.contactModel
      .findOne({
        pairKey: this.createPairKey(currentUserId, friendId),
        status: ContactStatus.ACCEPTED,
      })
      .exec();
    if (!contact) throw new NotFoundException('Quan hệ bạn bè không tồn tại');
    await contact.deleteOne();
  }

  async block(currentUserId: string, targetUserId: string) {
    this.ensureDifferentUsers(currentUserId, targetUserId);
    await this.usersService.getProfile(targetUserId);
    const pairKey = this.createPairKey(currentUserId, targetUserId);
    let contact = await this.contactModel.findOne({ pairKey }).exec();
    if (contact?.status === ContactStatus.BLOCKED) {
      if (String(contact.blockedBy) === currentUserId)
        throw new ConflictException('Bạn đã chặn người dùng này');
      throw new ForbiddenException('Không thể thực hiện thao tác này');
    }
    contact ??= new this.contactModel({
      participants: pairKey.split(':').map((id) => new Types.ObjectId(id)),
      pairKey,
      requestedBy: new Types.ObjectId(currentUserId),
    });
    contact.status = ContactStatus.BLOCKED;
    contact.blockedBy = new Types.ObjectId(currentUserId);
    contact.blockedAt = new Date();
    contact.acceptedAt = undefined;
    contact.rejectedAt = undefined;
    return this.populateContact(await contact.save());
  }

  async unblock(currentUserId: string, targetUserId: string): Promise<void> {
    const contact = await this.contactModel
      .findOne({
        pairKey: this.createPairKey(currentUserId, targetUserId),
        status: ContactStatus.BLOCKED,
      })
      .exec();
    if (!contact) throw new NotFoundException('Không tìm thấy quan hệ chặn');
    if (String(contact.blockedBy) !== currentUserId)
      throw new ForbiddenException('Chỉ người đã chặn mới có thể bỏ chặn');
    await contact.deleteOne();
  }

  listBlocked(currentUserId: string) {
    return this.contactModel
      .find({
        blockedBy: new Types.ObjectId(currentUserId),
        status: ContactStatus.BLOCKED,
      })
      .populate('participants', 'username displayName avatarUrl status')
      .sort({ blockedAt: -1 })
      .lean()
      .exec();
  }

  private async resolveRequest(
    contactId: string,
    currentUserId: string,
    accept: boolean,
  ) {
    const contact = await this.requireContact(contactId);
    if (contact.status !== ContactStatus.PENDING)
      throw new ConflictException('Lời mời không còn ở trạng thái chờ');
    if (
      String(contact.requestedBy) === currentUserId ||
      !contact.participants.some((id) => String(id) === currentUserId)
    )
      throw new ForbiddenException('Bạn không thể xử lý lời mời này');
    contact.status = accept ? ContactStatus.ACCEPTED : ContactStatus.REJECTED;
    contact.acceptedAt = accept ? new Date() : undefined;
    contact.rejectedAt = accept ? undefined : new Date();
    return this.populateContact(await contact.save());
  }

  private async requireContact(id: string): Promise<ContactDocument> {
    const contact = await this.contactModel.findById(id).exec();
    if (!contact) throw new NotFoundException('Không tìm thấy liên hệ');
    return contact;
  }

  private createPairKey(firstId: string, secondId: string): string {
    return [firstId, secondId].sort().join(':');
  }

  private ensureDifferentUsers(firstId: string, secondId: string): void {
    if (firstId === secondId)
      throw new ConflictException('Không thể thao tác với chính mình');
  }

  private populateContact(contact: ContactDocument) {
    return contact.populate(
      'participants requestedBy blockedBy',
      'username displayName avatarUrl status',
    );
  }
}
