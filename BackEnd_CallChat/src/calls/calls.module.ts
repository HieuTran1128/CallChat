import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtAccessModule } from '../common/modules/jwt-access.module';
import { ContactsModule } from '../contacts/contacts.module';
import { CallsController } from './calls.controller';
import { CallsService } from './calls.service';
import { Call, CallSchema } from './schemas/call.schema';

@Module({
  imports: [
    JwtAccessModule,
    ContactsModule,
    MongooseModule.forFeature([{ name: Call.name, schema: CallSchema }]),
  ],
  controllers: [CallsController],
  providers: [CallsService],
  exports: [CallsService],
})
export class CallsModule {}
