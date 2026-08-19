interface Environment {
  PORT?: string;
  MONGO_URI?: string;
  JWT_SECRET?: string;
  CORS_ORIGINS?: string;
  CLOUDINARY_CLOUD_NAME?: string;
  CLOUDINARY_API_KEY?: string;
  CLOUDINARY_API_SECRET?: string;
}

export function validateEnvironment(config: Environment): Environment {
  if (!config.MONGO_URI) throw new Error('MONGO_URI chưa được cấu hình');
  if (!config.JWT_SECRET) throw new Error('JWT_SECRET chưa được cấu hình');
  if (!config.CLOUDINARY_CLOUD_NAME)
    throw new Error('CLOUDINARY_CLOUD_NAME chưa được cấu hình');
  if (!config.CLOUDINARY_API_KEY)
    throw new Error('CLOUDINARY_API_KEY chưa được cấu hình');
  if (!config.CLOUDINARY_API_SECRET)
    throw new Error('CLOUDINARY_API_SECRET chưa được cấu hình');
  if (config.PORT && Number.isNaN(Number(config.PORT))) {
    throw new Error('PORT phải là một số');
  }
  return config;
}
