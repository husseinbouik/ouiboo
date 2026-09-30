/**
 * Vercel serverless entry point for the Ouiboo API.
 *
 * Adapts the NestJS application to Vercel's serverless functions via
 * @vendia/serverless-express. The Nest app instance is created once per
 * warm function instance and reused across invocations.
 *
 * Known limitations on Vercel (serverless):
 * - WebSocket connections are NOT supported (no persistent connections).
 *   The NotificationGateway/WebSocketModule is not wired into AppModule,
 *   so this is a no-op today.
 * - Background workers (BullMQ maintenance scheduler) do NOT run here.
 *   Use `npm run start:worker` on a persistent host for those.
 * - Local disk uploads are ephemeral; set STORAGE_PROVIDER=s3 with real
 *   S3-compatible credentials for file uploads to persist.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node'
import serverlessExpress from '@vendia/serverless-express'
import { createApp } from '../src/create-app'

let cachedHandler: ((req: unknown, res: unknown) => Promise<void>) | null = null

async function getHandler() {
  if (cachedHandler) return cachedHandler
  const app = await createApp()
  await app.init()
  const expressApp = app.getHttpAdapter().getInstance()
  cachedHandler = serverlessExpress({ app: expressApp })
  return cachedHandler
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const serverlessHandler = await getHandler()
  return serverlessHandler(req, res)
}
