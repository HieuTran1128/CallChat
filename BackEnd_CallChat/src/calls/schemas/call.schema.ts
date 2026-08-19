import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';

export enum CallType {
  AUDIO = 'AUDIO',
  VIDEO = 'VIDEO',
}

export enum CallStatus {
  RINGING = 'RINGING',
  ONGOING = 'ONGOING',
  REJECTED = 'REJECTED',
  ENDED = 'ENDED',
  MISSED = 'MISSED',
}

export type CallDocument = HydratedDocument<Call>;

@Schema({ timestamps: true, collection: 'calls' })
export class Call {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  callerId!: Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  receiverId!: Types.ObjectId;

  @Prop({ type: String, enum: CallType, required: true })
  type!: CallType;

  @Prop({ type: String, enum: CallStatus, default: CallStatus.RINGING })
  status!: CallStatus;

  @Prop({ type: Date })
  answeredAt?: Date;

  @Prop({ type: Date })
  endedAt?: Date;

  @Prop({ type: Number, default: 0 })
  durationSeconds!: number;
}

export const CallSchema = SchemaFactory.createForClass(Call);
CallSchema.index({ callerId: 1, createdAt: -1 });
CallSchema.index({ receiverId: 1, createdAt: -1 });
