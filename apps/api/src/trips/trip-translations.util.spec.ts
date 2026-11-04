import {
    buildTripTranslations,
    frenchSectionsMissing,
    hasCompleteFrenchText,
    localizeTripPayload,
    normalizeTripLocale,
    normalizeTripTranslations,
    resolveTripMedia,
    resolveTripSections,
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

describe('trip-translations.util phase 2 (#584)', () => {
    const canonical = {
        itinerary: [
            { dayNumber: 1, title: 'Arrivée', description: 'Accueil à Marrakech', activities: ['Transfert'] },
            { dayNumber: 2, title: 'Atlas', description: 'Randonnée guidée', activities: [] },
        ],
        inclusions: ['Guide', 'Repas'],
        exclusions: ['Vols'],
        checklist: ['Chaussures de marche'],
    };

    it('normalizes section content and drops garbage shapes', () => {
        const map = normalizeTripTranslations({
            ar: {
                itinerary: [{ dayNumber: 1, title: 'الوصول', activities: ['نقل', 42, ''] }],
                inclusions: ['دليل', ''],
                exclusions: 'not-a-list',
            },
        });
        expect(map.ar.itinerary).toEqual([{ dayNumber: 1, title: 'الوصول', activities: ['نقل'] }]);
        expect(map.ar.inclusions).toEqual(['دليل']);
        expect(map.ar.exclusions).toBeUndefined();
    });

    it('buildTripTranslations mirrors the canonical sections into fr and stamps positional dayNumbers', () => {
        const map = buildTripTranslations(
            { ar: { itinerary: [{ title: 'الوصول' }, { title: 'الأطلس', description: 'رحلة' }] } },
            { title: 'Titre', description: 'Description', ...canonical },
        );
        expect(map.fr.itinerary?.[0]).toEqual({
            dayNumber: 1, title: 'Arrivée', description: 'Accueil à Marrakech', activities: ['Transfert'],
        });
        expect(map.fr.inclusions).toEqual(['Guide', 'Repas']);
        expect(map.ar.itinerary?.map((d) => d.dayNumber)).toEqual([1, 2]);
    });

    it('resolves sections per locale: translated day/list wins, gaps fall back to French', () => {
        const trip = {
            ...canonical,
            translations: {
                ar: {
                    itinerary: [{ dayNumber: 2, title: 'الأطلس', description: 'رحلة مصحوبة', activities: ['جولة'] }],
                    inclusions: ['دليل', 'وجبات'],
                },
            },
        };
        const ar = resolveTripSections(trip, 'ar');
        expect(ar.itinerary[0].title).toBe('Arrivée'); // untranslated day → French
        expect(ar.itinerary[1].title).toBe('الأطلس');
        expect(ar.itinerary[1].activities).toEqual(['جولة']);
        expect(ar.inclusions).toEqual(['دليل', 'وجبات']); // wholesale
        expect(ar.exclusions).toEqual(['Vols']); // no Arabic list → French
        const fr = resolveTripSections(trip, 'fr');
        expect(fr.itinerary[1].title).toBe('Atlas');
    });

    it('frenchSectionsMissing flags days and lists that exist only outside French', () => {
        const incomplete = {
            itinerary: [{ dayNumber: 1, title: 'Arrivée', description: 'Accueil' }],
            inclusions: [],
            translations: {
                ar: {
                    itinerary: [{ dayNumber: 2, title: 'يوم إضافي', description: 'وصف' }],
                    inclusions: ['دليل'],
                },
            },
        };
        expect(frenchSectionsMissing(incomplete)).toEqual(['itinerary day 2', 'inclusions']);
        const complete = {
            ...canonical,
            translations: { ar: { itinerary: [{ dayNumber: 1, title: 'الوصول' }] } },
        };
        expect(frenchSectionsMissing(complete)).toEqual([]);
    });

    describe('media + location localization (#745)', () => {
        const trip = {
            imageAlts: ['Caravane de chameaux au coucher du soleil', 'Dunes et sommets rocheux'],
            startLocation: 'Merzouga, Maroc',
            translations: {
                fr: {
                    imageAlts: ['Caravane de chameaux au coucher du soleil', 'Dunes et sommets rocheux'],
                    startLocation: 'Merzouga, Maroc',
                },
                ar: {
                    imageAlts: ['قافلة جمال عند غروب الشمس', 'كثبان وقمم صخرية'],
                    startLocation: 'مرزوكة، المغرب',
                },
                en: {
                    imageAlts: ['Camel caravan at sunset', 'Dunes and rocky peaks'],
                    startLocation: 'Merzouga, Morocco',
                },
            },
        };

        it('normalize keeps per-language captions + location and drops garbage', () => {
            const map = normalizeTripTranslations({
                ar: { imageAlts: ['  وصف  ', ''], startLocation: ' مرزوكة ', title: 42 },
                xx: 'garbage',
            });
            expect(map.ar.imageAlts).toEqual(['وصف']);
            expect(map.ar.startLocation).toBe('مرزوكة');
        });

        it('build mirrors the canonical columns into the fr entry and preserves them on rebuild', () => {
            const built = buildTripTranslations(trip.translations, {
                title: 'Désert de Merzouga',
                description: 'Deux jours dans les dunes.',
                imageAlts: trip.imageAlts,
                startLocation: trip.startLocation,
            });
            expect(built.fr.imageAlts).toEqual(trip.imageAlts);
            expect(built.fr.startLocation).toBe('Merzouga, Maroc');
            expect(built.ar.imageAlts).toEqual(trip.translations.ar.imageAlts);
            // A rebuild that carries no media values must not erase them.
            const rebuilt = buildTripTranslations(built, { title: 'Désert de Merzouga', description: 'Deux jours dans les dunes.' });
            expect(rebuilt.fr.imageAlts).toEqual(trip.imageAlts);
            expect(rebuilt.fr.startLocation).toBe('Merzouga, Maroc');
        });

        it('resolves captions + location per locale with canonical fallback', () => {
            expect(resolveTripMedia(trip, 'ar')).toEqual({
                imageAlts: trip.translations.ar.imageAlts,
                startLocation: 'مرزوكة، المغرب',
            });
            expect(resolveTripMedia(trip, 'en').startLocation).toBe('Merzouga, Morocco');
            // Unknown locale -> canonical (French) entry.
            expect(resolveTripMedia(trip, 'de')).toEqual({
                imageAlts: trip.imageAlts,
                startLocation: 'Merzouga, Maroc',
            });
            // Partial entry (location only) still resolves captions from French.
            const partial = {
                imageAlts: trip.imageAlts,
                startLocation: trip.startLocation,
                translations: { ar: { startLocation: 'مرزوكة، المغرب' } },
            };
            expect(resolveTripMedia(partial, 'ar')).toEqual({
                imageAlts: trip.imageAlts,
                startLocation: 'مرزوكة، المغرب',
            });
            // Legacy trip without a map renders its columns in every locale.
            expect(resolveTripMedia({ imageAlts: trip.imageAlts, startLocation: trip.startLocation, translations: null }, 'ar')).toEqual({
                imageAlts: trip.imageAlts,
                startLocation: 'Merzouga, Maroc',
            });
        });

        it('localizeTripPayload swaps captions + location only when the payload carries them', () => {
            const payload = { title: 'Désert', description: 'Dunes.', ...trip };
            const localized = localizeTripPayload(payload, 'ar');
            expect(localized.imageAlts).toEqual(trip.translations.ar.imageAlts);
            expect(localized.startLocation).toBe('مرزوكة، المغرب');
            const bare = localizeTripPayload({ title: 'Désert', description: 'Dunes.', translations: trip.translations }, 'ar') as Record<string, unknown>;
            expect(bare.imageAlts).toBeUndefined();
            expect(bare.startLocation).toBeUndefined();
        });
    });
});
