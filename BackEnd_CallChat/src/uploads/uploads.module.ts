import { Module } from '@nestjs/common';
import cloudinaryConfig from '../config/cloudinary.config';
import { CloudinaryService } from './cloudinary.service';

@Module({
  providers: [
    {
      provide: CloudinaryService,
      inject: [cloudinaryConfig.KEY],
      useFactory: (config: ReturnType<typeof cloudinaryConfig>) =>
        new CloudinaryService(config),
    },
  ],
  exports: [CloudinaryService],
})
export class UploadsModule {}
