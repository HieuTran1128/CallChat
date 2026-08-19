import { registerAs } from '@nestjs/config';

export default registerAs('jwt', () => ({
  secret: process.env.JWT_SECRET as string,
  expiresIn: '7d' as const,
}));
