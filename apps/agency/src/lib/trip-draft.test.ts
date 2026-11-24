import { clearTripDraft, hasMeaningfulDraft, loadTripDraft, saveTripDraft, tripDraftKey } from './trip-draft';

function memoryStorage() {
  const map = new Map<string, string>();
  return {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => { map.set(k, v); },
    removeItem: (k: string) => { map.delete(k); },
  };
}

describe('trip draft persistence (Design Council Phase 4)', () => {
  it('keys create and edit drafts separately', () => {
    expect(tripDraftKey('create')).toBe('ouiboo-trip-draft:create');
    expect(tripDraftKey('edit', 'trip-9')).toBe('ouiboo-trip-draft:edit:trip-9');
  });

  it('round-trips values with a timestamp and clears', () => {
    const storage = memoryStorage();
    const key = tripDraftKey('create');
    expect(saveTripDraft(key, { title: 'Chefchaouen' }, storage)).toBe(true);
    const loaded = loadTripDraft<{ title: string }>(key, storage);
    expect(loaded?.values.title).toBe('Chefchaouen');
    expect(typeof loaded?.savedAt).toBe('number');
    clearTripDraft(key, storage);
    expect(loadTripDraft(key, storage)).toBeNull();
  });

  it('returns null for corrupt payloads', () => {
    const storage = memoryStorage();
    storage.setItem('k', '{oops');
    expect(loadTripDraft('k', storage)).toBeNull();
  });

  it('only treats typed content as meaningful', () => {
    expect(hasMeaningfulDraft({ title: '  ' })).toBe(false);
    expect(hasMeaningfulDraft({ title: 'X' })).toBe(true);
    expect(hasMeaningfulDraft({ images: ['a.jpg'] })).toBe(true);
  });
});
