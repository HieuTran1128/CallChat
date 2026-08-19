import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { compare, hash } from 'bcryptjs';
import { MongoServerError } from 'mongodb';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { UserRole } from '../common/enums/user-role.enum';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    try {
      const user = await this.usersService.create({
        username: dto.username,
        email: dto.email,
        passwordHash: await hash(dto.password, 12),
        displayName: dto.displayName,
      });

      return this.createAuthResponse(user);
    } catch (error: unknown) {
      if (error instanceof MongoServerError && error.code === 11000) {
        throw new ConflictException('Username hoặc email đã được sử dụng');
      }
      throw error;
    }
  }

  async login(dto: LoginDto) {
    const user = await this.usersService.findForLogin(dto.identifier);

    if (
      !user ||
      !user.isActive ||
      !(await compare(dto.password, user.passwordHash))
    ) {
      throw new UnauthorizedException('Thông tin đăng nhập không chính xác');
    }

    return this.createAuthResponse(user);
  }

  private async createAuthResponse(user: {
    id: string;
    username: string;
    email: string;
    displayName: string;
    avatarUrl?: string;
    status: string;
    role?: UserRole;
  }) {
    return {
      accessToken: await this.jwtService.signAsync({
        sub: user.id,
        username: user.username,
        role: user.role ?? UserRole.USER,
      }),
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        status: user.status,
        role: user.role ?? UserRole.USER,
      },
    };
  }
}
