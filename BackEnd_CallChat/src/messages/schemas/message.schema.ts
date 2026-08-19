import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';

export enum MessageType {
  TEXT = 'TEXT',
  IMAGE = 'IMAGE',
  FILE = 'FILE',
}

@Schema({ _id: false })
export class MessageAttachment {
  @Prop({ required: true }) url!: string;
  @Prop({ required: true }) publicId!: string;
  @Prop({ required: true }) name!: string;
  @Prop({ required: true }) size!: number;
  @Prop({ required: true }) mimeType!: string;
  @Prop({ type: String, enum: ['image', 'raw'], required: true })
  resourceType!: 'image' | 'raw';
}
const MessageAttachmentSchema = SchemaFactory.createForClass(MessageAttachment);

@Schema({ _id: false })
export class MessageReaction {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  userId!: Types.ObjectId;
  @Prop({ required: true }) emoji!: string;
}
const MessageReactionSchema = SchemaFactory.createForClass(MessageReaction);

@Schema({ _id: false })
export class ReplyPreview {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  senderId!: Types.ObjectId;
  @Prop({ default: '' }) content!: string;
  @Prop({ type: String, enum: MessageType, required: true }) type!: MessageType;
}
const ReplyPreviewSchema = SchemaFactory.createForClass(ReplyPreview);

export type MessageDocument = HydratedDocument<Message>;

@Schema({ timestamps: true, collection: 'messages' })
export class Message {
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'Conversation',
    required: true,
  })
  conversationId!: Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  senderId!: Types.ObjectId;

  @Prop({ type: String, default: '', trim: true, maxlength: 5000 })
  content!: string;

  @Prop({ type: String, enum: MessageType, default: MessageType.TEXT })
  type!: MessageType;

  @Prop({ type: [MessageAttachmentSchema], default: [] })
  attachments!: MessageAttachment[];

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Message' })
  replyTo?: Types.ObjectId;

  @Prop({ type: ReplyPreviewSchema })
  replyPreview?: ReplyPreview;

  @Prop({ default: false })
  replyUnavailable!: boolean;

  @Prop({ type: [MessageReactionSchema], default: [] })
  reactions!: MessageReaction[];

  @Prop({ type: [MongooseSchema.Types.ObjectId], ref: 'User', default: [] })
  deletedFor!: Types.ObjectId[];

  @Prop({ type: Date })
  editedAt?: Date;

  @Prop({ type: [MongooseSchema.Types.ObjectId], ref: 'User', default: [] })
  deliveredTo!: Types.ObjectId[];

  @Prop({ type: [MongooseSchema.Types.ObjectId], ref: 'User', default: [] })
  readBy!: Types.ObjectId[];

  createdAt!: Date;
  updatedAt!: Date;
}

export const MessageSchema = SchemaFactory.createForClass(Message);
MessageSchema.index({ conversationId: 1, createdAt: -1, _id: -1 });
