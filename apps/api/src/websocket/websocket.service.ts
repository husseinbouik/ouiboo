import { Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { DatabaseService } from '../database/database.service';

export interface WebSocketUser {
  userId: string;
  role: string;
  agencyId?: string | null;
}

@Injectable()
export class WebSocketService {
  private readonly logger = new Logger(WebSocketService.name);
  private connectedUsers: Map<string, Set<string>> = new Map();

  constructor(
    private jwtService: JwtService,
    private db: DatabaseService,
  ) {}

  /**
   * Authenticate user from token and confirm they still exist in the database
   */
  async authenticateUser(token: string): Promise<WebSocketUser | null> {
    try {
      const decoded = this.jwtService.verify<{ sub: string }>(token);
      const user = await this.db.user.findUnique({
        where: { id: decoded.sub },
        select: {
          id: true,
          role: true,
          isEmailVerified: true,
          agencyProfile: { select: { id: true } },
        },
      });

      if (!user || !user.isEmailVerified) {
        return null;
      }

      return {
        userId: user.id,
        role: user.role,
        agencyId: user.agencyProfile?.id ?? null,
      };
    } catch (error) {
      this.logger.error('WebSocket authentication failed', error);
      return null;
    }
  }

  /**
   * Track connected user
   */
  addConnectedUser(userId: string, socketId: string) {
    if (!this.connectedUsers.has(userId)) {
      this.connectedUsers.set(userId, new Set());
    }
    this.connectedUsers.get(userId)?.add(socketId);
  }

  /**
   * Remove connected user
   */
  removeConnectedUser(userId: string, socketId: string) {
    const sockets = this.connectedUsers.get(userId);
    if (sockets) {
      sockets.delete(socketId);
      if (sockets.size === 0) {
        this.connectedUsers.delete(userId);
      }
    }
  }

  /**
   * Check if user is online
   */
  isUserOnline(userId: string): boolean {
    return this.connectedUsers.has(userId) && this.connectedUsers.get(userId)!.size > 0;
  }

  /**
   * Get user's connected sockets
   */
  getUserSockets(userId: string): string[] {
    return Array.from(this.connectedUsers.get(userId) || []);
  }
}
