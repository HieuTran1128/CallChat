import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
  UploadedFiles,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import type { AuthenticatedUser } from '../auth/auth.types';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { MongoIdPipe } from '../common/pipes/mongo-id.pipe';
import { CreateMessageDto } from './dto/create-message.dto';
import { MessagesQueryDto } from './dto/messages-query.dto';
import { MessagesService } from './messages.service';

@Controller('conversations/:conversationId/messages')
@UseGuards(JwtAuthGuard)
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Get()
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Param('conversationId', MongoIdPipe) conversationId: string,
    @Query() query: MessagesQueryDto,
  ) {
    return this.messagesService.list(conversationId, user.userId, query);
  }

  @Post()
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Param('conversationId', MongoIdPipe) conversationId: string,
    @Body() dto: CreateMessageDto,
  ) {
    return this.messagesService.create(conversationId, user.userId, dto);
  }

  @Post('attachments')
  @UseInterceptors(
    FilesInterceptor('files', 10, { limits: { fileSize: 10 * 1024 * 1024 } }),
  )
  uploadAttachments(
    @CurrentUser() user: AuthenticatedUser,
    @Param('conversationId', MongoIdPipe) conversationId: string,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    if (!files?.length)
      throw new BadRequestException('Cần chọn ít nhất một tệp');
    return this.messagesService.uploadAttachments(
      conversationId,
      user.userId,
      files,
    );
  }
}
