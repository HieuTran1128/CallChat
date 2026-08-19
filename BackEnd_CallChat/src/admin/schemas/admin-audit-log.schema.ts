import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export enum AdminAuditAction {
  USER_STATUS_CHANGED = 'USER_STATUS_CHANGED',
  USER_ROLE_CHANGED = 'USER_ROLE_CHANGED',
}

export type AdminAuditLogDocument = HydratedDocument<AdminAuditLog>;

@Schema({ timestamps: true, collection: 'admin_audit_logs' })
export class AdminAuditLog {
  @Prop({ type: String, enum: AdminAuditAction, required: true })
  action!: AdminAuditAction;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, immutable: true })
  performedBy!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, immutable: true })
  targetUser!: Types.ObjectId;

  @Prop({ type: String, required: true, immutable: true })
  field!: string;

  @Prop({ type: String, required: true, immutable: true })
  previousValue!: string;

  @Prop({ type: String, required: true, immutable: true })
  newValue!: string;
}

export const AdminAuditLogSchema = SchemaFactory.createForClass(AdminAuditLog);
AdminAuditLogSchema.index({ targetUser: 1, createdAt: -1 });
AdminAuditLogSchema.index({ performedBy: 1, createdAt: -1 });
