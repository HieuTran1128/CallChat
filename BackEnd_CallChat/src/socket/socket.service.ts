import { Injectable, OnModuleInit } from '@nestjs/common';
import { UsersService } from '../users/users.service';

@Injectable()
export class SocketService implements OnModuleInit {
  private readonly userSockets = new Map<string, Set<string>>();

  constructor(private readonly usersService: UsersService) {}

  async onModuleInit(): Promise<void> {
    await this.usersService.resetPresence();
  }

  async connect(userId: string, socketId: string): Promise<boolean> {
    const sockets = this.userSockets.get(userId) ?? new Set<string>();
    const becameOnline = sockets.size === 0;
    sockets.add(socketId);
    this.userSockets.set(userId, sockets);

    if (becameOnline) await this.usersService.setPresence(userId, 'ONLINE');
    return becameOnline;
  }

  async disconnect(userId: string, socketId: string): Promise<boolean> {
    const sockets = this.userSockets.get(userId);
    if (!sockets) return false;

    sockets.delete(socketId);
    if (sockets.size > 0) return false;

    this.userSockets.delete(userId);
    await this.usersService.setPresence(userId, 'OFFLINE');
    return true;
  }

  isOnline(userId: string): boolean {
    return (this.userSockets.get(userId)?.size ?? 0) > 0;
  }
}
