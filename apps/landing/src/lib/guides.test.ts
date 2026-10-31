import { GUIDE_CITY_SLUGS, GUIDE_PATHS, buildFaqJsonLd, buildTouristTripJsonLd, guideCity, guidesContent } from './guides';
import { layerBContent } from './inventory';

/**
 * #683 (Council S6): Layer A ship-condition census. The guide +
 * verification copy (all three language maps) must carry NO prices,
 * NO counts-as-supply, NO booking CTAs and NO #661-banned claims
 * (first/only/biggest). If a future edit breaks a condition, this
 * census fails before the page can ship.
 *
 * #685 Layer B addendum: the `guides.layerB` strings are the ONE
 * deliberate exception — they are templates for LIVE inventory
 * (counts/prices/aggregates arrive from the API, never from copy).
 * Their own census below pins that contract: interpolation
 * placeholders only, no hardcoded digits, no #661 claims.
 */
const LOCALES = ['en', 'fr', 'ar'] as const;

function allStrings(value: unknown): string[] {
    if (typeof value === 'string') return [value];
    if (Array.isArray(value)) return value.flatMap(allStrings);
    if (value && typeof value === 'object') return Object.values(value).flatMap(allStrings);
    return [];
}

describe('Northern Cluster Layer A (#683)', () => {
    it('exposes exactly the three city guides plus the verification explainer', () => {
        expect(GUIDE_CITY_SLUGS).toEqual(['tangier', 'tetouan', 'chefchaouen']);
        expect(GUIDE_PATHS).toEqual(['/guides/tangier', '/guides/tetouan', '/guides/chefchaouen', '/verification']);
    });

    it('builds valid FAQPage + TouristTrip JSON-LD from the rendered content', () => {
        for (const locale of LOCALES) {
            for (const slug of GUIDE_CITY_SLUGS) {
                const city = guideCity(locale, slug);
                const faq = buildFaqJsonLd(city.faq);
                expect(faq['@type']).toBe('FAQPage');
                expect(faq.mainEntity).toHaveLength(city.faq.length);
                const trip = buildTouristTripJsonLd(city, slug);
                expect(trip['@type']).toBe('TouristTrip');
                expect(JSON.stringify(trip)).not.toMatch(/price|offer/i);
            }
        }
    });

    it('census: no prices, no booking CTAs, no first/only/biggest claims in any locale', () => {
        const banned: Array<[string, RegExp]> = [
            ['currency amount', /\b\d+\s?(MAD|EUR|USD|€|\$)\b/],
            ['price wording', /\b(price|prices|pricing|prix|tarif|سعر|أسعار)\b/i],
            ['booking CTA', /\b(book now|book your|réservez|احجز|احجز الآن)\b/i],
            ['first claim', /\b(first|premier|première|الأول|الأولى)\b/i],
            ['only claim', /\b(only|seul|seule|الوحيد|الوحيدة)\b/i],
            ['biggest claim', /\b(biggest|largest|plus grand|plus grande|الأكبر)\b/i],
        ];
        for (const locale of LOCALES) {
            const strings = allStrings(guidesContent(locale));
            expect(strings.length).toBeGreaterThan(40);
            for (const text of strings) {
                for (const [label, pattern] of banned) {
                    expect({ locale, label, text, match: pattern.test(text) }).toEqual(
                        expect.objectContaining({ match: false }),
                    );
                }
            }
        }
    });

    it('every guide carries the bookings-not-open posture and a waitlist route', () => {
        for (const locale of LOCALES) {
            const shared = guidesContent(locale);
            expect(shared.bookingsNotOpen.length).toBeGreaterThan(5);
            expect(shared.waitlistCta.length).toBeGreaterThan(3);
            for (const slug of GUIDE_CITY_SLUGS) {
                const city = guideCity(locale, slug);
                expect(city.highlights.length).toBe(3);
                expect(city.faq.length).toBe(3);
            }
            expect(guidesContent(locale).tangier.worldCup).toBeDefined();
            expect(guidesContent(locale).verification.steps).toHaveLength(4);
            expect(guidesContent(locale).verification.datedLine).toMatch(/2026/);
        }
    });
});


describe('Guides Layer B (#685)', () => {
    it('layerB templates exist in every locale with the full key set', () => {
        for (const locale of LOCALES) {
            const layerB = layerBContent(locale);
            expect(layerB.liveInventoryTitle.length).toBeGreaterThan(3);
            expect(layerB.tripCount).toContain('{{count}}');
            expect(layerB.agencyCount).toContain('{{count}}');
            expect(layerB.reviewAggregate).toContain('{{rating}}');
            expect(layerB.reviewAggregate).toContain('{{count}}');
            expect(Object.keys(layerB.categoryNames).length).toBeGreaterThan(0);
        }
    });

    it('census: layerB copy carries no hardcoded numbers and no #661 claims', () => {
        const claims = /\b(first|premier|première|only|seul|seule|biggest|largest|plus grand|plus grande|الأول|الأولى|الوحيد|الوحيدة|الأكبر)\b/i;
        for (const locale of LOCALES) {
            const strings = allStrings(layerBContent(locale));
            expect(strings.length).toBeGreaterThan(10);
            for (const text of strings) {
                // Counts/prices come from the API: the only digits
                // allowed live inside {{placeholders}} (there are none
                // today — any digit at all fails this census).
                expect({ locale, text, hasDigit: /\d/.test(text) }).toEqual(
                    expect.objectContaining({ hasDigit: false }),
                );
                expect({ locale, text, claim: claims.test(text) }).toEqual(
                    expect.objectContaining({ claim: false }),
                );
            }
        }
    });
});
