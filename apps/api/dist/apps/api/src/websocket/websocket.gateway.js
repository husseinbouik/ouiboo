"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationGateway = void 0;
const websockets_1 = require("@nestjs/websockets");
const socket_io_1 = require("socket.io");
const common_1 = require("@nestjs/common");
const websocket_service_1 = require("./websocket.service");
let NotificationGateway = class NotificationGateway {
    constructor(webSocketService) {
        this.webSocketService = webSocketService;
        this.logger = new common_1.Logger(websockets_1.WebSocketGateway.name);
    }
    handleConnection(socket) {
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
            socket.broadcast.emit('user:online', {
                userId: user.userId,
                timestamp: new Date(),
            });
        }
        catch (error) {
            this.logger.error('Connection error', error);
            socket.disconnect();
        }
    }
    handleDisconnect(socket) {
        const userId = socket.data.userId;
        if (userId) {
            this.webSocketService.removeConnectedUser(userId, socket.id);
            this.logger.log(`User ${userId} disconnected`);
            if (!this.webSocketService.isUserOnline(userId)) {
                socket.broadcast.emit('user:offline', {
                    userId,
                    timestamp: new Date(),
                });
            }
        }
    }
    handleNewBooking(socket, data) {
        this.server.emit('booking:notification', {
            type: 'NEW_BOOKING',
            data,
            timestamp: new Date(),
        });
    }
    handlePaymentVerified(socket, data) {
        const userId = socket.data.userId;
        this.server.to(userId).emit('payment:status', {
            status: 'VERIFIED',
            data,
            timestamp: new Date(),
        });
    }
    handleAdminApproval(socket, data) {
        this.server.emit('approval:notification', {
            action: data.action,
            targetType: data.targetType,
            targetId: data.targetId,
            timestamp: new Date(),
        });
    }
    joinRoom(socket, room) {
        socket.join(room);
        this.logger.log(`Socket ${socket.id} joined room ${room}`);
    }
    leaveRoom(socket, room) {
        socket.leave(room);
        this.logger.log(`Socket ${socket.id} left room ${room}`);
    }
};
exports.NotificationGateway = NotificationGateway;
__decorate([
    (0, websockets_1.WebSocketServer)(),
    __metadata("design:type", socket_io_1.Server)
], NotificationGateway.prototype, "server", void 0);
__decorate([
    (0, websockets_1.SubscribeMessage)('booking:created'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", void 0)
], NotificationGateway.prototype, "handleNewBooking", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('payment:verified'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", void 0)
], NotificationGateway.prototype, "handlePaymentVerified", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('admin:approval'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", void 0)
], NotificationGateway.prototype, "handleAdminApproval", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('room:join'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, String]),
    __metadata("design:returntype", void 0)
], NotificationGateway.prototype, "joinRoom", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('room:leave'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, String]),
    __metadata("design:returntype", void 0)
], NotificationGateway.prototype, "leaveRoom", null);
exports.NotificationGateway = NotificationGateway = __decorate([
    (0, websockets_1.WebSocketGateway)({
        cors: {
            origin: process.env.FRONTEND_URL || 'http://localhost:3000',
            credentials: true,
        },
    }),
    __metadata("design:paramtypes", [websocket_service_1.WebSocketService])
], NotificationGateway);
//# sourceMappingURL=websocket.gateway.js.map