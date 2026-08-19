import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums/user-role.enum';
import { RolesGuard } from '../common/guards/roles.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminService } from './admin.service';
import { AdminUsersQueryDto } from './dto/admin-users-query.dto';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';
import { MongoIdPipe } from '../common/pipes/mongo-id.pipe';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('health')
  health() {
    return { message: 'Khu vực quản trị', role: UserRole.ADMIN };
  }

  @Get('users')
  findUsers(@Query() query: AdminUsersQueryDto) {
    return this.adminService.findUsers(query);
  }

  @Patch('users/:id/status')
  updateStatus(
    @CurrentUser() admin: AuthenticatedUser,
    @Param('id', MongoIdPipe) userId: string,
    @Body() dto: UpdateUserStatusDto,
  ) {
    return this.adminService.updateStatus(admin.userId, userId, dto.isActive);
  }

  @Patch('users/:id/role')
  updateRole(
    @CurrentUser() admin: AuthenticatedUser,
    @Param('id', MongoIdPipe) userId: string,
    @Body() dto: UpdateUserRoleDto,
  ) {
    return this.adminService.updateRole(admin.userId, userId, dto.role);
  }
}
