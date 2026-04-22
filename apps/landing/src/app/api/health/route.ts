import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    service: 'landing',
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
}
