import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import type { AuthenticatedUser } from '../auth/auth.types';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { MongoIdPipe } from '../common/pipes/mongo-id.pipe';
import { ContactsService } from './contacts.service';

@Controller('contacts')
@UseGuards(JwtAuthGuard)
export class ContactsController {
  constructor(private readonly contactsService: ContactsService) {}

  @Post('requests/:userId')
  sendRequest(
    @CurrentUser() user: AuthenticatedUser,
    @Param('userId', MongoIdPipe) targetId: string,
  ) {
    return this.contactsService.sendRequest(user.userId, targetId);
  }

  @Patch('requests/:contactId/accept')
  accept(
    @CurrentUser() user: AuthenticatedUser,
    @Param('contactId', MongoIdPipe) contactId: string,
  ) {
    return this.contactsService.acceptRequest(contactId, user.userId);
  }

  @Patch('requests/:contactId/reject')
  reject(
    @CurrentUser() user: AuthenticatedUser,
    @Param('contactId', MongoIdPipe) contactId: string,
  ) {
    return this.contactsService.rejectRequest(contactId, user.userId);
  }

  @Delete('requests/:contactId')
  @HttpCode(HttpStatus.NO_CONTENT)
  cancel(
    @CurrentUser() user: AuthenticatedUser,
    @Param('contactId', MongoIdPipe) contactId: string,
  ) {
    return this.contactsService.cancelRequest(contactId, user.userId);
  }

  @Get('friends')
  friends(@CurrentUser() user: AuthenticatedUser) {
    return this.contactsService.listFriends(user.userId);
  }

  @Get('requests/incoming')
  incoming(@CurrentUser() user: AuthenticatedUser) {
    return this.contactsService.listIncoming(user.userId);
  }

  @Get('requests/outgoing')
  outgoing(@CurrentUser() user: AuthenticatedUser) {
    return this.contactsService.listOutgoing(user.userId);
  }

  @Delete('friends/:userId')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeFriend(
    @CurrentUser() user: AuthenticatedUser,
    @Param('userId', MongoIdPipe) friendId: string,
  ) {
    return this.contactsService.removeFriend(user.userId, friendId);
  }

  @Post('blocks/:userId')
  block(
    @CurrentUser() user: AuthenticatedUser,
    @Param('userId', MongoIdPipe) targetId: string,
  ) {
    return this.contactsService.block(user.userId, targetId);
  }

  @Delete('blocks/:userId')
  @HttpCode(HttpStatus.NO_CONTENT)
  unblock(
    @CurrentUser() user: AuthenticatedUser,
    @Param('userId', MongoIdPipe) targetId: string,
  ) {
    return this.contactsService.unblock(user.userId, targetId);
  }

  @Get('blocked')
  blocked(@CurrentUser() user: AuthenticatedUser) {
    return this.contactsService.listBlocked(user.userId);
  }
}
