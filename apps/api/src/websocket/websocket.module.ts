import { Module } from '@nestjs/common';
import { NotificationGateway } from './websocket.gateway';
import { WebSocketService } from './websocket.service';
import { JwtModule } from '@nestjs/jwt';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'secret',
    }),
  ],
  providers: [NotificationGateway, WebSocketService],
  exports: [WebSocketService],
})
export class WebSocketModule { }
