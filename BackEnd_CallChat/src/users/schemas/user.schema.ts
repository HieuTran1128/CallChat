import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { UserRole } from '../../common/enums/user-role.enum';

export type UserDocument = HydratedDocument<User>;

@Schema({
  timestamps: true,
  collection: 'users',
})
export class User {
  @Prop({
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  })
  username!: string;

  @Prop({
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  })
  email!: string;

  @Prop({
    required: true,
    select: false,
  })
  passwordHash!: string;

  @Prop({
    required: true,
    trim: true,
  })
  displayName!: string;

  @Prop()
  avatarUrl?: string;

  @Prop({ select: false })
  avatarPublicId?: string;

  @Prop({
    enum: ['ONLINE', 'OFFLINE', 'BUSY'],
    default: 'OFFLINE',
  })
  status!: string;

  @Prop()
  lastSeenAt?: Date;

  @Prop({
    default: true,
  })
  isActive!: boolean;

  @Prop({
    type: String,
    enum: UserRole,
    default: UserRole.USER,
    required: true,
  })
  role!: UserRole;
}

export const UserSchema = SchemaFactory.createForClass(User);
