import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { hash } from 'bcryptjs';
import { UsersService } from '../users/users.service';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  const usersService = {
    findForLogin: jest.fn(),
    create: jest.fn(),
  };
  const jwtService = {
    signAsync: jest.fn().mockResolvedValue('access-token'),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: usersService },
        { provide: JwtService, useValue: jwtService },
      ],
    }).compile();

    service = module.get(AuthService);
  });

  it('đăng nhập thành công và trả access token', async () => {
    usersService.findForLogin.mockResolvedValue({
      id: 'user-id',
      username: 'alice',
      email: 'alice@example.com',
      displayName: 'Alice',
      status: 'OFFLINE',
      isActive: true,
      passwordHash: await hash('password123', 4),
    });

    await expect(
      service.login({ identifier: 'alice', password: 'password123' }),
    ).resolves.toMatchObject({ accessToken: 'access-token' });
  });

  it('từ chối khi mật khẩu không đúng', async () => {
    usersService.findForLogin.mockResolvedValue({
      isActive: true,
      passwordHash: await hash('password123', 4),
    });

    await expect(
      service.login({ identifier: 'alice', password: 'wrong-password' }),
    ).rejects.toThrow('Thông tin đăng nhập không chính xác');
  });
});
