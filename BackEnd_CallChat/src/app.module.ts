import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigType } from '@nestjs/config';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import appConfig from './config/app.config';
import databaseConfig from './config/database.config';
import jwtConfig from './config/jwt.config';
import { validateEnvironment } from './config/env.validation';
import { AdminModule } from './admin/admin.module';
import cloudinaryConfig from './config/cloudinary.config';
import { ContactsModule } from './contacts/contacts.module';
import { SocketModule } from './socket/socket.module';
import { ConversationsModule } from './conversations/conversations.module';
import { MessagesModule } from './messages/messages.module';
import { CallsModule } from './calls/calls.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, databaseConfig, jwtConfig, cloudinaryConfig],
      validate: validateEnvironment,
    }),

    MongooseModule.forRootAsync({
      inject: [databaseConfig.KEY],
      useFactory: (config: ConfigType<typeof databaseConfig>) => ({
        uri: config.uri,
      }),
    }),

    UsersModule,
    AuthModule,
    AdminModule,
    ContactsModule,
    SocketModule,
    ConversationsModule,
    MessagesModule,
    CallsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
