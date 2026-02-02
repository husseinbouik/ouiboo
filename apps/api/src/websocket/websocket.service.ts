import { Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class WebSocketService {
  private readonly logger = new Logger(WebSocketService.name);
  private connectedUsers: Map<string, Set<string>> = new Map();

  constructor(private jwtService: JwtService) {}

  /**
   * Authenticate user from token
   */
  authenticateUser(token: string): { userId: string; role: string } | null {
    try {
      const decoded = this.jwtService.verify(token);
      return { userId: decoded.sub, role: decoded.role };
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
