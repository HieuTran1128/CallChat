import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { UserRole } from '../common/enums/user-role.enum';
import { User } from '../users/schemas/user.schema';
import { AdminUsersQueryDto } from './dto/admin-users-query.dto';
import {
  AdminAuditAction,
  AdminAuditLog,
} from './schemas/admin-audit-log.schema';

@Injectable()
export class AdminService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<User>,
    @InjectModel(AdminAuditLog.name)
    private readonly auditModel: Model<AdminAuditLog>,
  ) {}

  async findUsers(query: AdminUsersQueryDto) {
    const filter: { $or?: Array<Record<string, RegExp>> } = {};
    if (query.q?.trim()) {
      const escaped = query.q.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const pattern = new RegExp(escaped, 'i');
      filter.$or = [
        { username: pattern },
        { email: pattern },
        { displayName: pattern },
      ];
    }
    const [users, total] = await Promise.all([
      this.userModel
        .find(filter)
        .select(
          'username email displayName avatarUrl status isActive role createdAt updatedAt',
        )
        .sort({ createdAt: -1 })
        .skip((query.page - 1) * query.limit)
        .limit(query.limit)
        .lean()
        .exec(),
      this.userModel.countDocuments(filter).exec(),
    ]);
    return {
      items: users.map(({ _id, ...user }) => ({
        ...user,
        id: String(_id),
      })),
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  async updateStatus(adminId: string, userId: string, isActive: boolean) {
    if (adminId === userId && !isActive) {
      throw new ForbiddenException(
        'Admin không thể tự khóa tài khoản của mình',
      );
    }
    const user = await this.userModel.findById(userId).exec();
    if (!user) throw new NotFoundException('Không tìm thấy người dùng');
    if (user.isActive === isActive) return user;
    const previousValue = String(user.isActive);
    user.isActive = isActive;
    await user.save();
    await this.writeAudit(
      AdminAuditAction.USER_STATUS_CHANGED,
      adminId,
      userId,
      'isActive',
      previousValue,
      String(isActive),
    );
    return user;
  }

  async updateRole(adminId: string, userId: string, role: UserRole) {
    if (adminId === userId && role !== UserRole.ADMIN) {
      throw new ForbiddenException('Admin không thể tự hạ quyền của mình');
    }
    const user = await this.userModel.findById(userId).exec();
    if (!user) throw new NotFoundException('Không tìm thấy người dùng');
    const previousRole = user.role ?? UserRole.USER;
    if (previousRole === role) return user;
    if (!user.isActive && role === UserRole.ADMIN) {
      throw new BadRequestException(
        'Không thể cấp quyền admin cho tài khoản đang bị khóa',
      );
    }
    user.role = role;
    await user.save();
    await this.writeAudit(
      AdminAuditAction.USER_ROLE_CHANGED,
      adminId,
      userId,
      'role',
      previousRole,
      role,
    );
    return user;
  }

  private async writeAudit(
    action: AdminAuditAction,
    adminId: string,
    userId: string,
    field: string,
    previousValue: string,
    newValue: string,
  ) {
    await this.auditModel.create({
      action,
      performedBy: adminId,
      targetUser: userId,
      field,
      previousValue,
      newValue,
    });
  }
}
