import { NextResponse } from 'next/server';

// Council P0-07: the Google-Sheet waitlist capture is removed. There is no
// API/DB replacement capture, so signups are paused (410) instead of being
// written to a Google Sheet or sent anywhere else. The waitlist UI shows
// the same paused state. Re-enable only with a CNDP-covered capture.
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 5;
const rateLimitBuckets = new Map<string, { count: number; resetAt: number }>();

const isRateLimited = (req: Request) => {
  const forwardedFor = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  const key = forwardedFor || req.headers.get('x-real-ip') || 'unknown';
  const now = Date.now();
  const current = rateLimitBuckets.get(key);
  if (!current || current.resetAt <= now) {
    rateLimitBuckets.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }
  current.count += 1;
  return current.count > RATE_LIMIT_MAX_REQUESTS;
};

export async function POST(req: Request) {
  if (isRateLimited(req)) {
    return NextResponse.json({ message: 'Too many requests' }, { status: 429 });
  }
  return NextResponse.json(
    { message: 'Waitlist signups are paused while we prepare the closed beta.' },
    { status: 410 },
  );
}
