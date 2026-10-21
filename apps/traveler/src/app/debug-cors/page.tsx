'use client';

import { useState } from 'react';

// TEMPORARY DEBUG PAGE for #318 diagnosis. Revert after diagnosis.
// Probes browser -> API connectivity from inside a real browser:
//   T1: GET /health            (simple request, no preflight)
//   T2: POST /auth/login as text/plain (CORS-safelisted content type -> no preflight)
//   T3: POST /auth/login as application/json (non-safelisted -> browser sends preflight)
export default function DebugCorsPage() {
  const apiBase = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/+$/, '');
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<string[]>([]);

  const runTests = async () => {
    if (running) return;
    setRunning(true);
    setResults([]);
    const out: string[] = [];
    const push = (line: string) => {
      out.push(line);
      setResults([...out]);
    };

    // T1: GET /health (simple request, no preflight)
    try {
      const res = await fetch(`${apiBase}/health`);
      push(`T1 ok status=${res.status}`);
    } catch (err) {
      push(`T1 FAIL ${(err as Error).message}`);
    }

    // T2: POST /auth/login as text/plain (CORS-safelisted -> no preflight)
    try {
      const res = await fetch(`${apiBase}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({ email: 'probe@example.com', password: 'x' }),
      });
      push(`T2 ok status=${res.status}`);
    } catch (err) {
      push(`T2 FAIL ${(err as Error).message}`);
    }

    // T3: POST /auth/login as application/json (preflighted)
    try {
      const res = await fetch(`${apiBase}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'probe@example.com', password: 'x' }),
      });
      push(`T3 ok status=${res.status}`);
    } catch (err) {
      push(`T3 FAIL ${(err as Error).message}`);
    }

    setRunning(false);
  };

  return (
    <main style={{ padding: '2rem', fontFamily: 'monospace', maxWidth: '60rem' }}>
      <h1>CORS probe (temporary, #318)</h1>
      <p>API base: {apiBase || '(NEXT_PUBLIC_API_URL not set)'}</p>
      <button type="button" onClick={runTests} disabled={running}>
        {running ? 'Running…' : 'Run tests'}
      </button>
      <pre style={{ marginTop: '1rem', whiteSpace: 'pre-wrap' }}>
        {results.length === 0 ? '(no results yet)' : results.join('\n')}
      </pre>
    </main>
  );
}
