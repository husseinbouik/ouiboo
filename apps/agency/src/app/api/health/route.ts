import { NextResponse } from 'next/server';

export function GET() {
  return NextResponse.json({
    status: 'ok',
    app: 'agency',
    timestamp: new Date().toISOString(),
  });
}
