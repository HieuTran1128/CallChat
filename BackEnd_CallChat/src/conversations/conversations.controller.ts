import { Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import type { AuthenticatedUser } from '../auth/auth.types';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { MongoIdPipe } from '../common/pipes/mongo-id.pipe';
import { ConversationsService } from './conversations.service';

@Controller('conversations')
@UseGuards(JwtAuthGuard)
export class ConversationsController {
  constructor(private readonly conversationsService: ConversationsService) {}

  @Post('direct/:userId')
  direct(
    @CurrentUser() user: AuthenticatedUser,
    @Param('userId', MongoIdPipe) targetUserId: string,
  ) {
    return this.conversationsService.getOrCreateDirect(
      user.userId,
      targetUserId,
    );
  }

  @Get()
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.conversationsService.list(user.userId);
  }
}
