import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    service: 'traveler',
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
}

