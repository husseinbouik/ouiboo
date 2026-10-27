import {
    buildTripTranslations,
    hasCompleteFrenchText,
    normalizeTripLocale,
    normalizeTripTranslations,
    resolveTripText,
    stripSeedMarker,
} from './trip-translations.util';

describe('trip-translations.util (#546)', () => {
    describe('normalizeTripLocale', () => {
        it('lowercases and strips region suffixes', () => {
            expect(normalizeTripLocale('FR')).toBe('fr');
            expect(normalizeTripLocale('ar-MA')).toBe('ar');
            expect(normalizeTripLocale(' en ')).toBe('en');
        });

        it('rejects non-language values', () => {
            expect(normalizeTripLocale(undefined)).toBeUndefined();
            expect(normalizeTripLocale('')).toBeUndefined();
            expect(normalizeTripLocale('123')).toBeUndefined();
            expect(normalizeTripLocale('french')).toBeUndefined();
        });
    });

    describe('normalizeTripTranslations', () => {
        it('keeps well-formed entries, trims, and drops empties/garbage', () => {
            const map = normalizeTripTranslations({
                ar: { title: '  عنوان  ', description: 'وصف' },
                EN: { title: 'Title', description: '' },
                'fr-MA': { description: 'desc' },
                xx: 'not-an-object',
                de: { title: 42 },
            });
            expect(map).toEqual({
                ar: { title: 'عنوان', description: 'وصف' },
                en: { title: 'Title' },
                fr: { description: 'desc' },
            });
        });

        it('degrades non-objects to an empty map', () => {
            expect(normalizeTripTranslations(null)).toEqual({});
            expect(normalizeTripTranslations('nope')).toEqual({});
            expect(normalizeTripTranslations([1, 2])).toEqual({});
        });
    });

    describe('buildTripTranslations', () => {
        it('mirrors the canonical columns into the fr entry', () => {
            const map = buildTripTranslations(
                { ar: { title: 'عنوان', description: 'وصف' }, fr: { title: 'STALE' } },
                { title: 'Titre', description: 'Description' },
            );
            expect(map.fr).toEqual({ title: 'Titre', description: 'Description' });
            expect(map.ar).toEqual({ title: 'عنوان', description: 'وصف' });
        });

        it('drops the fr entry when both columns are empty', () => {
            const map = buildTripTranslations({ fr: { title: 'x' } }, { title: '', description: null });
            expect(map.fr).toBeUndefined();
        });
    });

    describe('hasCompleteFrenchText', () => {
        it('accepts complete French from the columns (legacy trips)', () => {
            expect(hasCompleteFrenchText({ title: 'Titre', description: 'Description' })).toBe(true);
        });

        it('accepts French split between the map and the columns', () => {
            expect(
                hasCompleteFrenchText({
                    title: '',
                    description: 'Description',
                    translations: { fr: { title: 'Titre' } },
                }),
            ).toBe(true);
        });

        it('rejects when French is missing — other languages never substitute', () => {
            expect(
                hasCompleteFrenchText({
                    title: '',
                    description: '',
                    translations: { ar: { title: 'عنوان', description: 'وصف' } },
                }),
            ).toBe(false);
            expect(hasCompleteFrenchText({ title: 'Titre', description: '' })).toBe(false);
            expect(hasCompleteFrenchText({ title: '', description: 'Description' })).toBe(false);
        });
    });

    describe('resolveTripText fallback chain', () => {
        const trip = {
            title: 'Titre FR',
            description: 'Description FR',
            translations: {
                fr: { title: 'Titre FR', description: 'Description FR' },
                ar: { title: 'عنوان AR' },
                en: { title: 'Title EN', description: 'Description EN' },
            },
        };

        it('resolves the requested language', () => {
            expect(resolveTripText(trip, 'en')).toEqual({
                title: 'Title EN',
                description: 'Description EN',
                language: 'en',
            });
        });

        it('falls back per-field to French when the requested entry is partial', () => {
            expect(resolveTripText(trip, 'ar')).toEqual({
                title: 'عنوان AR',
                description: 'Description FR',
                // P0-11: the reported language follows the title's source.
                language: 'ar',
            });
        });

        it('falls back to French for an unknown language, and to any language when French is absent', () => {
            expect(resolveTripText(trip, 'es')).toEqual({
                title: 'Titre FR',
                description: 'Description FR',
                language: 'fr',
            });
            expect(
                resolveTripText(
                    { title: '', description: '', translations: { ar: { title: 'فقط', description: 'وصف فقط' } } },
                    'en',
                ),
            ).toEqual({ title: 'فقط', description: 'وصف فقط', language: 'ar' });
        });

        it('legacy trip without a map renders its (French) columns in every locale', () => {
            const legacy = { title: 'Ancien titre', description: 'Ancienne description', translations: null };
            for (const locale of ['fr', 'ar', 'en', undefined]) {
                expect(resolveTripText(legacy, locale)).toEqual({
                    title: 'Ancien titre',
                    description: 'Ancienne description',
                    language: 'fr',
                });
            }
        });

        it('only returns an empty field when no language has it', () => {
            expect(resolveTripText({ title: '', description: '', translations: null }, 'ar')).toEqual({
                title: '',
                description: '',
                language: 'fr',
            });
        });
    });

    describe('seed marker stripping (Session #3 P0-6, #554)', () => {
        it('stripSeedMarker removes trailing and inline markers', () => {
            expect(stripSeedMarker('A trek.\n\n[staging-seed-v1]')).toBe('A trek.');
            expect(stripSeedMarker('A [staging-seed-v2] trek')).toBe('A trek');
            expect(stripSeedMarker('No marker here')).toBe('No marker here');
        });

        it('resolved public text never carries the marker, whichever language holds it', () => {
            const seeded = {
                title: 'Atlas Mountains Trek',
                description: 'Challenge yourself.\n\n[staging-seed-v1]',
                translations: {
                    fr: { title: 'Atlas Mountains Trek', description: 'Challenge yourself.\n\n[staging-seed-v1]' },
                },
            };
            for (const locale of ['fr', 'ar', 'en', undefined]) {
                const resolved = resolveTripText(seeded, locale);
                expect(resolved.description).toBe('Challenge yourself.');
                expect(resolved.description).not.toContain('staging-seed');
            }
        });
    });
});
