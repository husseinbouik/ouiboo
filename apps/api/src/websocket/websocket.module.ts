import { Module } from '@nestjs/common';
import { NotificationGateway } from './websocket.gateway';
import { WebSocketService } from './websocket.service';
import { JwtModule } from '@nestjs/jwt';

const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret) {
    throw new Error('JWT_SECRET is required');
}

@Module({
  imports: [
    JwtModule.register({
      secret: jwtSecret,
    }),
  ],
  providers: [NotificationGateway, WebSocketService],
  exports: [WebSocketService],
})
export class WebSocketModule { }
