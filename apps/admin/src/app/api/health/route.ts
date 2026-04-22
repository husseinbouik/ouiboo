import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    service: 'admin',
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
}
