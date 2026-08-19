import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { getModelToken } from '@nestjs/mongoose';
import { User } from './schemas/user.schema';
import { CloudinaryService } from '../uploads/cloudinary.service';

describe('UsersService', () => {
  let service: UsersService;
  const userModel = {
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getModelToken(User.name),
          useValue: userModel,
        },
        {
          provide: CloudinaryService,
          useValue: { uploadAvatar: jest.fn(), deleteImage: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('trả hồ sơ người dùng đang hoạt động', async () => {
    const user = { id: 'user-id', isActive: true };
    userModel.findById.mockReturnValue({
      exec: jest.fn().mockResolvedValue(user),
    });
    await expect(service.getProfile('user-id')).resolves.toBe(user);
  });

  it('từ chối cập nhật khi body rỗng', async () => {
    await expect(service.updateProfile('user-id', {})).rejects.toThrow(
      'Cần cung cấp tên hiển thị để cập nhật',
    );
  });
});
