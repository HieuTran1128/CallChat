import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { compare, hash } from 'bcryptjs';
import { User, UserDocument } from './schemas/user.schema';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { CloudinaryService } from '../uploads/cloudinary.service';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<User>,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  findForLogin(identifier: string): Promise<UserDocument | null> {
    const normalizedIdentifier = identifier.trim().toLowerCase();

    return this.userModel
      .findOne({
        $or: [
          { email: normalizedIdentifier },
          { username: normalizedIdentifier },
        ],
      })
      .select('+passwordHash')
      .exec();
  }

  findById(id: string): Promise<UserDocument | null> {
    return this.userModel.findById(id).exec();
  }

  async setPresence(id: string, status: 'ONLINE' | 'OFFLINE'): Promise<void> {
    await this.userModel
      .updateOne(
        { _id: id, isActive: true },
        {
          $set: {
            status,
            ...(status === 'OFFLINE' && { lastSeenAt: new Date() }),
          },
        },
      )
      .exec();
  }

  async resetPresence(): Promise<void> {
    await this.userModel
      .updateMany(
        { status: 'ONLINE' },
        { $set: { status: 'OFFLINE', lastSeenAt: new Date() } },
      )
      .exec();
  }

  async getProfile(id: string): Promise<UserDocument> {
    const user = await this.findById(id);
    if (!user || !user.isActive) {
      throw new NotFoundException('Không tìm thấy người dùng');
    }
    return user;
  }

  async updateProfile(
    id: string,
    dto: UpdateProfileDto,
  ): Promise<UserDocument> {
    if (dto.displayName === undefined)
      throw new BadRequestException('Cần cung cấp tên hiển thị để cập nhật');
    const user = await this.userModel
      .findByIdAndUpdate(
        id,
        {
          ...(dto.displayName !== undefined && {
            displayName: dto.displayName.trim(),
          }),
        },
        { new: true, runValidators: true },
      )
      .exec();
    if (!user || !user.isActive) {
      throw new NotFoundException('Không tìm thấy người dùng');
    }
    return user;
  }

  async updateAvatar(
    id: string,
    file: Express.Multer.File,
  ): Promise<UserDocument> {
    const user = await this.userModel
      .findById(id)
      .select('+avatarPublicId')
      .exec();
    if (!user || !user.isActive) {
      throw new NotFoundException('Không tìm thấy người dùng');
    }

    const uploaded = await this.cloudinaryService.uploadAvatar(file.buffer);
    const previousPublicId = user.avatarPublicId;
    try {
      user.avatarUrl = uploaded.secure_url;
      user.avatarPublicId = uploaded.public_id;
      await user.save();
    } catch (error) {
      await this.cloudinaryService.deleteImage(uploaded.public_id);
      throw error;
    }

    if (previousPublicId) {
      await this.cloudinaryService.deleteImage(previousPublicId);
    }
    return this.getProfile(id);
  }

  async changePassword(id: string, dto: ChangePasswordDto): Promise<void> {
    if (dto.currentPassword === dto.newPassword) {
      throw new BadRequestException('Mật khẩu mới phải khác mật khẩu hiện tại');
    }
    const user = await this.userModel
      .findById(id)
      .select('+passwordHash')
      .exec();
    if (!user || !user.isActive) {
      throw new NotFoundException('Không tìm thấy người dùng');
    }
    if (!(await compare(dto.currentPassword, user.passwordHash))) {
      throw new UnauthorizedException('Mật khẩu hiện tại không chính xác');
    }
    user.passwordHash = await hash(dto.newPassword, 12);
    await user.save();
  }

  async search(query: string, currentUserId: string) {
    const escapedQuery = query.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = new RegExp(escapedQuery, 'i');
    const users = await this.userModel
      .find({
        _id: { $ne: currentUserId },
        isActive: true,
        $or: [
          { username: pattern },
          { displayName: pattern },
          { email: pattern },
        ],
      })
      .select('username displayName avatarUrl status')
      .limit(20)
      .lean()
      .exec();
    return users.map(({ _id, ...user }) => ({ ...user, id: String(_id) }));
  }

  create(data: {
    username: string;
    email: string;
    passwordHash: string;
    displayName: string;
  }): Promise<UserDocument> {
    return this.userModel.create({
      ...data,
      username: data.username.trim().toLowerCase(),
      email: data.email.trim().toLowerCase(),
      displayName: data.displayName.trim(),
    });
  }
}
