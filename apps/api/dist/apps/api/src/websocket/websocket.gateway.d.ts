import { OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { WebSocketService } from './websocket.service';
export declare class WebSocketGateway implements OnGatewayConnection, OnGatewayDisconnect {
    private webSocketService;
    server: Server;
    private readonly logger;
    constructor(webSocketService: WebSocketService);
    handleConnection(socket: Socket): void;
    handleDisconnect(socket: Socket): void;
    handleNewBooking(socket: Socket, data: any): void;
    handlePaymentVerified(socket: Socket, data: any): void;
    handleAdminApproval(socket: Socket, data: any): void;
    joinRoom(socket: Socket, room: string): void;
    leaveRoom(socket: Socket, room: string): void;
}
