import { JwtService } from '@nestjs/jwt';
export declare class WebSocketService {
    private jwtService;
    private readonly logger;
    private connectedUsers;
    constructor(jwtService: JwtService);
    authenticateUser(token: string): {
        userId: string;
        role: string;
    } | null;
    addConnectedUser(userId: string, socketId: string): void;
    removeConnectedUser(userId: string, socketId: string): void;
    isUserOnline(userId: string): boolean;
    getUserSockets(userId: string): string[];
}
