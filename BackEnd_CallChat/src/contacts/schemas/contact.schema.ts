import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';

export enum ContactStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  REJECTED = 'REJECTED',
  BLOCKED = 'BLOCKED',
}

export type ContactDocument = HydratedDocument<Contact>;

@Schema({ timestamps: true, collection: 'contacts' })
export class Contact {
  @Prop({ type: [MongooseSchema.Types.ObjectId], ref: 'User', required: true })
  participants!: Types.ObjectId[];

  @Prop({ type: String, required: true, unique: true, immutable: true })
  pairKey!: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  requestedBy!: Types.ObjectId;

  @Prop({ type: String, enum: ContactStatus, required: true })
  status!: ContactStatus;

  @Prop({ type: Date })
  acceptedAt?: Date;

  @Prop({ type: Date })
  rejectedAt?: Date;

  @Prop({ type: Date })
  blockedAt?: Date;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User' })
  blockedBy?: Types.ObjectId;
}

export const ContactSchema = SchemaFactory.createForClass(Contact);
ContactSchema.index({ participants: 1, status: 1 });
ContactSchema.index({ requestedBy: 1, status: 1 });
ContactSchema.index({ blockedBy: 1, status: 1 });
