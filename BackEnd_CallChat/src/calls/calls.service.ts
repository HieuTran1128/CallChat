import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ContactsService } from '../contacts/contacts.service';
import {
  Call,
  CallDocument,
  CallStatus,
  CallType,
} from './schemas/call.schema';

@Injectable()
export class CallsService {
  constructor(
    @InjectModel(Call.name) private readonly callModel: Model<Call>,
    private readonly contactsService: ContactsService,
  ) {}

  async create(callerId: string, receiverId: string, type: CallType) {
    await this.contactsService.assertCanChat(callerId, receiverId);
    const active = await this.callModel.exists({
      $or: [
        { callerId: new Types.ObjectId(callerId) },
        { receiverId: new Types.ObjectId(callerId) },
      ],
      status: { $in: [CallStatus.RINGING, CallStatus.ONGOING] },
    });
    if (active) throw new ConflictException('Bạn đang có một cuộc gọi khác');
    const call = await this.callModel.create({ callerId, receiverId, type });
    return this.populate(call);
  }

  async accept(callId: string, userId: string) {
    const call = await this.requireCall(callId);
    if (String(call.receiverId) !== userId)
      throw new ForbiddenException('Bạn không thể nhận cuộc gọi này');
    if (call.status !== CallStatus.RINGING)
      throw new ConflictException('Cuộc gọi không còn chờ trả lời');
    await this.contactsService.assertCanChat(
      String(call.callerId),
      String(call.receiverId),
    );
    call.status = CallStatus.ONGOING;
    call.answeredAt = new Date();
    return this.populate(await call.save());
  }

  async reject(callId: string, userId: string) {
    const call = await this.requireParticipant(callId, userId);
    if (call.status !== CallStatus.RINGING)
      throw new ConflictException('Cuộc gọi không còn chờ trả lời');
    call.status = CallStatus.REJECTED;
    call.endedAt = new Date();
    return this.populate(await call.save());
  }

  async end(callId: string, userId: string) {
    const call = await this.requireParticipant(callId, userId);
    if (![CallStatus.RINGING, CallStatus.ONGOING].includes(call.status))
      return this.populate(call);
    call.status =
      call.status === CallStatus.RINGING ? CallStatus.MISSED : CallStatus.ENDED;
    call.endedAt = new Date();
    call.durationSeconds = call.answeredAt
      ? Math.max(
          0,
          Math.floor(
            (call.endedAt.getTime() - call.answeredAt.getTime()) / 1000,
          ),
        )
      : 0;
    return this.populate(await call.save());
  }

  async requireSignalAccess(callId: string, userId: string) {
    const call = await this.requireParticipant(callId, userId);
    if (![CallStatus.RINGING, CallStatus.ONGOING].includes(call.status))
      throw new ConflictException('Cuộc gọi đã kết thúc');
    return call;
  }

  list(userId: string, limit = 30) {
    return this.callModel
      .find({
        $or: [
          { callerId: new Types.ObjectId(userId) },
          { receiverId: new Types.ObjectId(userId) },
        ],
      })
      .populate('callerId receiverId', 'username displayName avatarUrl status')
      .sort({ createdAt: -1 })
      .limit(Math.min(Math.max(limit, 1), 100))
      .lean()
      .exec();
  }

  otherUserId(call: CallDocument, userId: string): string {
    return String(call.callerId) === userId
      ? String(call.receiverId)
      : String(call.callerId);
  }

  private async requireParticipant(callId: string, userId: string) {
    const call = await this.requireCall(callId);
    if (![String(call.callerId), String(call.receiverId)].includes(userId))
      throw new ForbiddenException('Bạn không thuộc cuộc gọi này');
    return call;
  }

  private async requireCall(callId: string) {
    const call = await this.callModel.findById(callId).exec();
    if (!call) throw new NotFoundException('Không tìm thấy cuộc gọi');
    return call;
  }

  private populate(call: CallDocument) {
    return call.populate(
      'callerId receiverId',
      'username displayName avatarUrl status',
    );
  }
}
