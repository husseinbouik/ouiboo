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
import { WebSocketService } from './websocket.service';

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

  handleConnection(socket: Socket) {
    try {
      const token = socket.handshake.auth.token;
      const user = this.webSocketService.authenticateUser(token);

      if (!user) {
        socket.disconnect();
        return;
      }

      this.webSocketService.addConnectedUser(user.userId, socket.id);
      socket.data.userId = user.userId;
      socket.data.role = user.role;

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
    // Emit to agency
    this.server.emit('booking:notification', {
      type: 'NEW_BOOKING',
      data,
      timestamp: new Date(),
    });
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
    // Emit to specific user
    this.server.to(userId).emit('payment:status', {
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
    // Emit to relevant parties
    this.server.emit('approval:notification', {
      action: data.action,
      targetType: data.targetType,
      targetId: data.targetId,
      timestamp: new Date(),
    });
  }

  /**
   * Join room for user-specific messages
   */
  @SubscribeMessage('room:join')
  joinRoom(
    @ConnectedSocket() socket: Socket,
    @MessageBody() room: string,
  ) {
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
}
