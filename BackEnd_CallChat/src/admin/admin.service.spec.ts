import { ForbiddenException } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Test } from '@nestjs/testing';
import { UserRole } from '../common/enums/user-role.enum';
import { User } from '../users/schemas/user.schema';
import { AdminService } from './admin.service';
import { AdminAuditLog } from './schemas/admin-audit-log.schema';

describe('AdminService', () => {
  let service: AdminService;
  const userModel = { findById: jest.fn() };
  const auditModel = { create: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({
      providers: [
        AdminService,
        { provide: getModelToken(User.name), useValue: userModel },
        { provide: getModelToken(AdminAuditLog.name), useValue: auditModel },
      ],
    }).compile();
    service = module.get(AdminService);
  });

  it('không cho admin tự khóa chính mình', async () => {
    await expect(
      service.updateStatus('admin-id', 'admin-id', false),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(userModel.findById).not.toHaveBeenCalled();
  });

  it('không cho admin tự hạ quyền chính mình', async () => {
    await expect(
      service.updateRole('admin-id', 'admin-id', UserRole.USER),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(userModel.findById).not.toHaveBeenCalled();
  });

  it('ghi audit khi thay đổi trạng thái', async () => {
    const user = {
      isActive: true,
      save: jest.fn().mockResolvedValue(undefined),
    };
    userModel.findById.mockReturnValue({
      exec: jest.fn().mockResolvedValue(user),
    });
    auditModel.create.mockResolvedValue({});
    await service.updateStatus('admin-id', 'user-id', false);
    expect(user.save).toHaveBeenCalled();
    expect(auditModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        field: 'isActive',
        previousValue: 'true',
        newValue: 'false',
      }),
    );
  });
});
