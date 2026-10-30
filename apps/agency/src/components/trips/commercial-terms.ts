/**
 * #674 (Council S6): editor-side mirror of the API's free-text
 * commercial-terms scan (apps/api/src/trips/publish-guardrails.util.ts).
 * A published trip carries exactly ONE cancellation scale — the
 * structured bands — so cancellation/payment terms stated as prose
 * anywhere in the trip text are flagged in the editor before submit;
 * the API publish gate rejects them regardless. Keep the pattern list
 * in sync with the API util.
 */
const PROHIBITED_PATTERNS: RegExp[] = [
  /\bnon[-\s]?remboursable\b/i,
  /\bnon[-\s]?refundable\b/i,
  /\bno\s+refunds?\b/i,
  /\bsans\s+remboursement\b/i,
  /غير\s+قابل\s+للاسترداد/,
  /\bnon[-\s]?annulable\b/i,
  /\bnon[-\s]?cancell?able\b/i,
  /غير\s+قابل\s+للإلغاء/,
  /\bcancellation\s+(policy|terms|conditions)\b/i,
  /\bpolitique\s+d['’]annulation\b/i,
  /\bconditions?\s+d['’]annulation\b/i,
  /سياسة\s+الإلغاء/,
  /\bpayment\s+terms\b/i,
  /\bconditions?\s+de\s+paiement\b/i,
  /شروط\s+الدفع/,
  /\b\d{1,3}\s?%\s*(de\s+|d['’]\s*)?(acompte|deposit|avance|down\s*payment)\b/i,
  /\b(acompte|deposit|avance|down\s*payment)\b[^.\n]{0,40}?\d{1,3}\s?%/i,
  /\b\d{1,3}\s?%\s*(de\s+)?(remboursement|refund)\b/i,
  /\b(remboursement|refund)\b[^.\n]{0,40}?\d{1,3}\s?%/i,
];

type TripTextCarrier = {
  title?: string;
  description?: string;
  inclusions?: string[];
  exclusions?: string[];
  checklist?: string[];
  itinerary?: Array<{ title?: string; description?: string; activities?: string[] }>;
  translations?: Record<string, unknown>;
};

function walkStrings(value: unknown, out: string[], depth: number) {
  if (depth > 6 || value == null) return;
  if (typeof value === 'string') {
    out.push(value);
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) walkStrings(item, out, depth + 1);
    return;
  }
  if (typeof value === 'object') {
    for (const item of Object.values(value as Record<string, unknown>)) walkStrings(item, out, depth + 1);
  }
}

/** True when any traveller-facing trip text states prohibited terms. */
export function hasProhibitedCommercialTerms(trip: TripTextCarrier): boolean {
  const texts: string[] = [];
  walkStrings(
    [trip.title, trip.description, trip.inclusions, trip.exclusions, trip.checklist, trip.itinerary, trip.translations],
    texts,
    0,
  );
  return texts.some((text) => PROHIBITED_PATTERNS.some((pattern) => pattern.test(text)));
}
