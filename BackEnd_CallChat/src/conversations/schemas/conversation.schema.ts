import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';

export enum ConversationType {
  DIRECT = 'DIRECT',
}

export type ConversationDocument = HydratedDocument<Conversation>;

@Schema({ _id: false })
export class ConversationReadState {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  userId!: Types.ObjectId;

  @Prop({ type: Date, required: true })
  lastReadAt!: Date;
}

const ConversationReadStateSchema = SchemaFactory.createForClass(
  ConversationReadState,
);

@Schema({ timestamps: true, collection: 'conversations' })
export class Conversation {
  @Prop({ type: String, enum: ConversationType, required: true })
  type!: ConversationType;

  @Prop({ type: [MongooseSchema.Types.ObjectId], ref: 'User', required: true })
  participants!: Types.ObjectId[];

  @Prop({ type: String, required: true, unique: true, immutable: true })
  directKey!: string;

  @Prop({ type: [ConversationReadStateSchema], default: [] })
  readStates!: ConversationReadState[];
}

export const ConversationSchema = SchemaFactory.createForClass(Conversation);
ConversationSchema.index({ participants: 1, updatedAt: -1 });
