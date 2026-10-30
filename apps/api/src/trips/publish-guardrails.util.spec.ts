import {
    assertCommercialTermsPublishable,
    assertMeetingPointPublishable,
    collectTripTexts,
    findProhibitedCommercialTerms,
    hasPublishableMeetingPoint,
    itineraryCompletenessWarnings,
    normalizeMeetingPoint,
    publicMeetingPoint,
} from './publish-guardrails.util';

describe('publish guardrails (#674 / #676)', () => {
    describe('free-text commercial terms scan', () => {
        it('flags the Eden-style pasted terms (ferme, non remboursable et non annulable)', () => {
            expect(findProhibitedCommercialTerms(['Tarif ferme, non remboursable et non annulable'])).toEqual(
                expect.arrayContaining(['non-refundable wording', 'non-cancellable wording']),
            );
        });

        it('flags English non-refundable / no-refund wording', () => {
            expect(findProhibitedCommercialTerms(['This fare is non-refundable'])).toContain('non-refundable wording');
            expect(findProhibitedCommercialTerms(['No refunds under any circumstance'])).toContain('non-refundable wording');
        });

        it('flags Arabic non-refundable / cancellation-policy wording', () => {
            expect(findProhibitedCommercialTerms(['هذا السعر غير قابل للاسترداد'])).toContain('non-refundable wording');
            expect(findProhibitedCommercialTerms(['راجع سياسة الإلغاء الخاصة بنا'])).toContain('free-text cancellation policy');
        });

        it('flags cancellation/payment policy headings in FR and EN', () => {
            expect(findProhibitedCommercialTerms(['Cancellation policy: see below'])).toContain('free-text cancellation policy');
            expect(findProhibitedCommercialTerms(["Conditions d'annulation strictes"])).toContain('free-text cancellation policy');
            expect(findProhibitedCommercialTerms(['Payment terms: wire within 48h'])).toContain('free-text payment terms');
        });

        it('flags percentage deposit terms in either order', () => {
            expect(findProhibitedCommercialTerms(['Acompte de 50% à la réservation'])).toContain('percentage deposit/payment term');
            expect(findProhibitedCommercialTerms(['Pay a 50% deposit to confirm'])).toContain('percentage deposit/payment term');
            expect(findProhibitedCommercialTerms(['Remboursement de 80% si annulation'])).toContain('percentage deposit/payment term');
        });

        it('does not flag ordinary descriptive trip text', () => {
            expect(
                findProhibitedCommercialTerms([
                    'Randonnée guidée dans les ruelles de la médina',
                    'Visit to a traditional hammam and mint tea ceremony',
                    'The hotel may hold a key deposit at check-in',
                    'Free time to explore the blue streets of Chefchaouen',
                ]),
            ).toEqual([]);
        });

        it('collects texts from canonical fields, itinerary and every translation', () => {
            const texts = collectTripTexts({
                title: 'Titre',
                description: 'Description',
                inclusions: ['Guide'],
                itinerary: [{ title: 'Jour 1', description: 'Arrivée', activities: ['Balade'] }],
                translations: { ar: { title: 'عنوان', itinerary: [{ description: 'وصف اليوم' }] } },
            });
            expect(texts).toEqual(expect.arrayContaining(['Titre', 'Guide', 'Balade', 'عنوان', 'وصف اليوم']));
        });
    });

    describe('commercial-terms publish gate (#674)', () => {
        const bands = { version: 'cancellation-v1', bands: [{ minDaysBeforeStart: 0, refundPercent: 50 }] };

        it('rejects publishing without an explicit structured scale', () => {
            expect(() => assertCommercialTermsPublishable({ cancellationPolicy: null, texts: [] }))
                .toThrow(/structured cancellation scale is required/i);
            expect(() => assertCommercialTermsPublishable({ cancellationPolicy: { bands: [] }, texts: [] }))
                .toThrow(/structured cancellation scale is required/i);
        });

        it('rejects publishing when any trip text states free-text terms', () => {
            expect(() =>
                assertCommercialTermsPublishable({
                    cancellationPolicy: bands,
                    texts: ['Excursion non remboursable'],
                }),
            ).toThrow(/free-text cancellation\/payment terms are not allowed/i);
        });

        it('accepts a structured scale with clean texts', () => {
            expect(() =>
                assertCommercialTermsPublishable({ cancellationPolicy: bands, texts: ['Guided medina walk'] }),
            ).not.toThrow();
        });
    });

    describe('meeting point (#676)', () => {
        it('normalizes and trims, rejecting non-http maps URLs', () => {
            expect(normalizeMeetingPoint({ address: '  Café Hafa, Tangier ', mapsUrl: ' https://maps.example/x ', pickupAvailable: false }))
                .toEqual({ address: 'Café Hafa, Tangier', mapsUrl: 'https://maps.example/x', pickupAvailable: false });
            expect(() => normalizeMeetingPoint({ mapsUrl: 'maps.example/x' })).toThrow(/http\(s\) URL/);
            expect(normalizeMeetingPoint(null)).toBeNull();
            expect(normalizeMeetingPoint({ pickupAvailable: false })).toBeNull();
        });

        it('publish gate: neither address nor pickup is rejected; either one passes', () => {
            expect(hasPublishableMeetingPoint(null)).toBe(false);
            expect(hasPublishableMeetingPoint({ address: null, pickupAvailable: false })).toBe(false);
            expect(() => assertMeetingPointPublishable(null)).toThrow(/meeting point is required/i);
            expect(() => assertMeetingPointPublishable({ address: 'Place du 9 Avril, Tangier', pickupAvailable: false })).not.toThrow();
            expect(() => assertMeetingPointPublishable({ address: null, pickupAvailable: true })).not.toThrow();
        });

        it('public shape exposes area + pickup flag only — never the address or maps link', () => {
            const pub = publicMeetingPoint(
                { address: 'Exact street 12, Tangier', mapsUrl: 'https://maps.example/x', pickupAvailable: true },
                'Tangier',
            );
            expect(pub).toEqual({ area: 'Tangier', pickupAvailable: true });
            expect(JSON.stringify(pub)).not.toContain('Exact street');
            expect(JSON.stringify(pub)).not.toContain('maps.example');
        });
    });

    describe('completeness nudge (#676)', () => {
        it('warns per missing drive time / accommodation / meals, by day', () => {
            expect(
                itineraryCompletenessWarnings([
                    { dayNumber: 1, driveTimeMinutes: 90, accommodationName: 'Riad X', accommodationType: 'RIAD', mealsIncluded: ['BREAKFAST'] },
                    { dayNumber: 2, driveTimeMinutes: null, accommodationName: null, accommodationType: null, mealsIncluded: [] },
                ]),
            ).toEqual(['DAY_2_MISSING_DRIVE_TIME', 'DAY_2_MISSING_ACCOMMODATION', 'DAY_2_MISSING_MEALS']);
        });

        it('is silent for a complete itinerary and for no itinerary', () => {
            expect(itineraryCompletenessWarnings([])).toEqual([]);
            expect(itineraryCompletenessWarnings(undefined)).toEqual([]);
        });
    });
});
