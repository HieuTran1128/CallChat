import { Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAccessModule } from '../common/modules/jwt-access.module';

@Module({
  imports: [UsersModule, JwtAccessModule],
  controllers: [AuthController],
  providers: [AuthService],
})
export class AuthModule {}
