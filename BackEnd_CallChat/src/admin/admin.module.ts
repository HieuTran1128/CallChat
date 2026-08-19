import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { RolesGuard } from '../common/guards/roles.guard';
import { AdminController } from './admin.controller';
import { JwtAccessModule } from '../common/modules/jwt-access.module';
import { User, UserSchema } from '../users/schemas/user.schema';
import {
  AdminAuditLog,
  AdminAuditLogSchema,
} from './schemas/admin-audit-log.schema';
import { AdminService } from './admin.service';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    JwtAccessModule,
    UsersModule,
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: AdminAuditLog.name, schema: AdminAuditLogSchema },
    ]),
  ],
  controllers: [AdminController],
  providers: [RolesGuard, AdminService],
})
export class AdminModule {}
