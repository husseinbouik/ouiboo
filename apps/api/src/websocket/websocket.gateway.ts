import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { UserRole } from '@ouiboo/types';
import { WebSocketService } from './websocket.service';

const ADMIN_ROOM = 'admin';

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  },
})
export class NotificationGateway
  implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(WebSocketGateway.name);

  constructor(private webSocketService: WebSocketService) { }

  async handleConnection(socket: Socket) {
    try {
      const token = socket.handshake.auth.token;
      const user = await this.webSocketService.authenticateUser(token);

      if (!user) {
        socket.disconnect();
        return;
      }

      this.webSocketService.addConnectedUser(user.userId, socket.id);
      socket.data.userId = user.userId;
      socket.data.role = user.role;
      socket.data.agencyId = user.agencyId ?? null;

      socket.join(this.userRoom(user.userId));
      if (user.agencyId) {
        socket.join(this.agencyRoom(user.agencyId));
      }
      if (user.role === UserRole.Admin) {
        socket.join(ADMIN_ROOM);
      }

      this.logger.log(`User ${user.userId} connected via ${socket.id}`);

      // Notify user is online
      socket.broadcast.emit('user:online', {
        userId: user.userId,
        timestamp: new Date(),
      });
    } catch (error) {
      this.logger.error('Connection error', error);
      socket.disconnect();
    }
  }

  handleDisconnect(socket: Socket) {
    const userId = socket.data.userId;
    if (userId) {
      this.webSocketService.removeConnectedUser(userId, socket.id);
      this.logger.log(`User ${userId} disconnected`);

      // Notify user is offline if no other connections
      if (
        !this.webSocketService.isUserOnline(userId)
      ) {
        socket.broadcast.emit('user:offline', {
          userId,
          timestamp: new Date(),
        });
      }
    }
  }

  /**
   * Handle new booking notification
   */
  @SubscribeMessage('booking:created')
  handleNewBooking(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: any,
  ) {
    const targetAgencyId = data?.agencyId as string | undefined;
    const payload = {
      type: 'NEW_BOOKING',
      data,
      timestamp: new Date(),
    };

    // Only deliver to the affected agency (their own booking or an admin).
    // Never broadcast to every connected socket.
    const allowed =
      typeof targetAgencyId === 'string' &&
      (socket.data.role === UserRole.Admin ||
        (socket.data.role === UserRole.Agency &&
          socket.data.agencyId === targetAgencyId));

    if (allowed) {
      this.server.to(this.agencyRoom(targetAgencyId)).emit('booking:notification', payload);
      return;
    }

    socket.emit('booking:notification', payload);
  }

  /**
   * Handle payment verification update
   */
  @SubscribeMessage('payment:verified')
  handlePaymentVerified(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: any,
  ) {
    const userId = socket.data.userId;
    // Emit to the user's own room only
    this.server.to(this.userRoom(userId)).emit('payment:status', {
      status: 'VERIFIED',
      data,
      timestamp: new Date(),
    });
  }

  /**
   * Handle admin approval
   */
  @SubscribeMessage('admin:approval')
  handleAdminApproval(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: any,
  ) {
    // Only admins may trigger approval notifications
    if (socket.data.role !== UserRole.Admin) {
      this.logger.warn(`Denied admin:approval from socket ${socket.id}`);
      return;
    }

    this.server.to(ADMIN_ROOM).emit('approval:notification', {
      action: data.action,
      targetType: data.targetType,
      targetId: data.targetId,
      timestamp: new Date(),
    });
  }

  /**
   * Join room for user-specific messages. Only rooms the connecting user is
   * authorized for (own user room, their agency room, admin room) are allowed.
   */
  @SubscribeMessage('room:join')
  joinRoom(
    @ConnectedSocket() socket: Socket,
    @MessageBody() room: string,
  ) {
    const allowedRooms = this.authorizedRooms(socket);
    if (typeof room !== 'string' || !allowedRooms.includes(room)) {
      this.logger.warn(`Socket ${socket.id} denied join for room ${room}`);
      return;
    }

    socket.join(room);
    this.logger.log(`Socket ${socket.id} joined room ${room}`);
  }

  /**
   * Leave room
   */
  @SubscribeMessage('room:leave')
  leaveRoom(
    @ConnectedSocket() socket: Socket,
    @MessageBody() room: string,
  ) {
    socket.leave(room);
    this.logger.log(`Socket ${socket.id} left room ${room}`);
  }

  private userRoom(userId: string) {
    return `user:${userId}`;
  }

  private agencyRoom(agencyId: string) {
    return `agency:${agencyId}`;
  }

  private authorizedRooms(socket: Socket): string[] {
    const rooms = [this.userRoom(socket.data.userId)];
    if (socket.data.agencyId) {
      rooms.push(this.agencyRoom(socket.data.agencyId));
    }
    if (socket.data.role === UserRole.Admin) {
      rooms.push(ADMIN_ROOM);
    }
    return rooms;
  }
}
