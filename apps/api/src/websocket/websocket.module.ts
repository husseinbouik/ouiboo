/**
 * DEPRECATED on Vercel serverless (#216).
 *
 * WebSockets do not work on Vercel serverless functions. Per ROADMAP.md,
 * real-time notifications (booking created, payment verified, admin approval)
 * use client-side polling (30s interval) until Phase 2.
 *
 * This module is NOT imported in app.module.ts and never loads in production.
 * Kept for reference / future container-based deployment (see ROADMAP.md
 * "Evaluate long-running containers" decision point).
 */
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
