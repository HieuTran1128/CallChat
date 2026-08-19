import { Module } from '@nestjs/common';
import { JwtAccessModule } from '../common/modules/jwt-access.module';
import { UsersModule } from '../users/users.module';
import { ConversationsModule } from '../conversations/conversations.module';
import { MessagesModule } from '../messages/messages.module';
import { SocketGateway } from './socket.gateway';
import { SocketService } from './socket.service';
import { CallsModule } from '../calls/calls.module';

@Module({
  imports: [
    JwtAccessModule,
    UsersModule,
    ConversationsModule,
    MessagesModule,
    CallsModule,
  ],
  providers: [SocketGateway, SocketService],
})
export class SocketModule {}
