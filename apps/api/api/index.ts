/**
 * Vercel serverless entry point for the Ouiboo API.
 *
 * Vercel's Node.js runtime invokes this with standard Express req/res,
 * so we pass them directly to the NestJS (Express) app instance.
 * The Nest app is created once per warm function instance and reused.
 *
 * Known limitations on Vercel (serverless):
 * - WebSocket connections are NOT supported (no persistent connections).
 * - Background workers (BullMQ) do NOT run here.
 * - Local disk uploads are ephemeral (/tmp); set STORAGE_PROVIDER=s3
 *   with real S3-compatible credentials for persistent file uploads.
 */
import type { Request, Response } from 'express'
import { createApp } from '../src/create-app'

let cachedApp: { getHttpAdapter: () => { getInstance: () => (req: Request, res: Response) => void } } | null = null

async function getExpressApp() {
  if (cachedApp) return cachedApp
  const app = await createApp()
  await app.init()
  cachedApp = app as unknown as { getHttpAdapter: () => { getInstance: () => (req: Request, res: Response) => void } }
  return cachedApp
}

export default async function handler(req: Request, res: Response) {
  const app = await getExpressApp()
  const expressApp = app.getHttpAdapter().getInstance()
  return expressApp(req, res)
}
