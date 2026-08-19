import { UserRole } from '../common/enums/user-role.enum';

export interface AuthenticatedUser {
  userId: string;
  username: string;
  role: UserRole;
}

export interface JwtPayload {
  sub: string;
  username: string;
  role: UserRole;
}
