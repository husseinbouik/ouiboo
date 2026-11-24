/**
 * Design Council Phase 4 — Create/edit trip A: draft persistence.
 *
 * The trips API has no draft-persistence endpoint for in-progress form
 * state (TripStatus.DRAFT exists, but only for a saved trip created via
 * POST /trips). Until the API grows one, the wizard autosaves the form
 * values to localStorage on this device only and restores them on
 * return. The UI labels this honestly ("draft saved on this device").
 * The stored payload is the agency's own form input — no tokens or
 * credentials are ever written here.
 */
export const TRIP_DRAFT_KEY_PREFIX = 'ouiboo-trip-draft:';

export function tripDraftKey(mode: 'create' | 'edit', tripId?: string | null): string {
  return mode === 'edit' && tripId ? `${TRIP_DRAFT_KEY_PREFIX}edit:${tripId}` : `${TRIP_DRAFT_KEY_PREFIX}create`;
}

type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

function defaultStorage(): StorageLike | null {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null;
  } catch {
    return null;
  }
}

export function saveTripDraft(key: string, values: unknown, storage: StorageLike | null = defaultStorage()): boolean {
  if (!storage) return false;
  try {
    storage.setItem(key, JSON.stringify({ savedAt: Date.now(), values }));
    return true;
  } catch {
    return false;
  }
}

export function loadTripDraft<T>(key: string, storage: StorageLike | null = defaultStorage()): { savedAt: number; values: T } | null {
  if (!storage) return null;
  try {
    const raw = storage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { savedAt?: number; values?: T };
    if (!parsed || typeof parsed.savedAt !== 'number' || parsed.values === undefined) return null;
    return { savedAt: parsed.savedAt, values: parsed.values };
  } catch {
    return null;
  }
}

export function clearTripDraft(key: string, storage: StorageLike | null = defaultStorage()): void {
  if (!storage) return;
  try {
    storage.removeItem(key);
  } catch {
    // Storage unavailable — nothing to clear.
  }
}

/** A draft counts as meaningful only when the user typed something. */
export function hasMeaningfulDraft(values: unknown): boolean {
  if (!values || typeof values !== 'object') return false;
  const record = values as Record<string, unknown>;
  const title = typeof record.title === 'string' ? record.title.trim() : '';
  const description = typeof record.description === 'string' ? record.description.trim() : '';
  const images = Array.isArray(record.images) ? record.images.length : 0;
  return Boolean(title || description || images > 0);
}
