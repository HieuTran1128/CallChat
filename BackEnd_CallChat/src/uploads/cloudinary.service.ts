import { Injectable, Logger } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { UploadApiResponse, v2 as cloudinary } from 'cloudinary';
import cloudinaryConfig from '../config/cloudinary.config';

@Injectable()
export class CloudinaryService {
  private readonly logger = new Logger(CloudinaryService.name);

  constructor(config: ConfigType<typeof cloudinaryConfig>) {
    cloudinary.config({
      cloud_name: config.cloudName,
      api_key: config.apiKey,
      api_secret: config.apiSecret,
      secure: true,
    });
  }

  uploadAvatar(buffer: Buffer): Promise<UploadApiResponse> {
    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: 'callchat/avatars',
          resource_type: 'image',
          transformation: [
            { width: 512, height: 512, crop: 'fill', gravity: 'face' },
            { quality: 'auto', fetch_format: 'auto' },
          ],
        },
        (error, result) => {
          if (error || !result)
            reject(new Error(error?.message ?? 'Cloudinary không trả kết quả'));
          else resolve(result);
        },
      );
      stream.end(buffer);
    });
  }

  uploadAttachment(
    buffer: Buffer,
    isImage: boolean,
  ): Promise<UploadApiResponse> {
    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: 'callchat/messages',
          resource_type: isImage ? 'image' : 'raw',
          ...(isImage && { quality: 'auto', fetch_format: 'auto' }),
        },
        (error, result) => {
          if (error || !result)
            reject(new Error(error?.message ?? 'Cloudinary không trả kết quả'));
          else resolve(result);
        },
      );
      stream.end(buffer);
    });
  }

  async deleteAsset(
    publicId: string,
    resourceType: 'image' | 'raw',
  ): Promise<void> {
    try {
      await cloudinary.uploader.destroy(publicId, {
        resource_type: resourceType,
      });
    } catch (error) {
      this.logger.warn(`Không thể xóa tệp Cloudinary: ${publicId}`, error);
    }
  }

  async deleteImage(publicId: string): Promise<void> {
    try {
      await cloudinary.uploader.destroy(publicId, { resource_type: 'image' });
    } catch (error) {
      this.logger.warn(`Không thể xóa ảnh Cloudinary cũ: ${publicId}`, error);
    }
  }
}
