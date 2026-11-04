import { buildTripFaqJsonLd, generateTripFaqs, normalizeTripFaqs, MAX_AGENCY_FAQS } from './trip-faq.util';

describe('generateTripFaqs (#686)', () => {
    it('always explains agency-direct payment and derives cancellation from the scale', () => {
        const faqs = generateTripFaqs({ agencyName: 'Atlas Test SARL', cancellationPolicy: null });
        const payment = faqs.find((f) => f.question.en === 'How do I pay?');
        expect(payment?.answer.en).toContain('Atlas Test SARL');
        expect(payment?.answer.en).toContain('never Ouiboo');
        const cancel = faqs.find((f) => f.question.en === 'Can I cancel for free?');
        expect(cancel?.answer.en).toContain('30 day');
        expect(cancel?.answer.fr).toContain('30 jour');
        expect(cancel?.answer.ar.length).toBeGreaterThan(0);
    });

    it('adds staged / pay-on-arrival / private / pay-later entries only when the facts hold', () => {
        const plain = generateTripFaqs({});
        expect(plain.some((f) => f.question.en === 'Can I pay on arrival?')).toBe(false);
        const rich = generateTripFaqs({ hasStagedSessions: true, payOnArrivalEnabled: true, privateTourEnabled: true, hasPayLaterSessions: true });
        expect(rich.some((f) => f.question.en === 'Can I pay on arrival?')).toBe(true);
        expect(rich.some((f) => f.question.en === 'Can I book this trip privately?')).toBe(true);
        expect(rich.some((f) => f.question.en === 'Can I reserve now and pay later?')).toBe(true);
        const payLater = rich.find((f) => f.question.en === 'Can I reserve now and pay later?');
        expect(payLater?.answer.en).toContain('never charges automatically');
    });
});

describe('normalizeTripFaqs (#686 + #674 guardrail)', () => {
    it('accepts a capped language-keyed set with French present', () => {
        const out = normalizeTripFaqs([{ question: { fr: 'Q ?', en: 'Q?' }, answer: { fr: 'A.', en: 'A.' } }]);
        expect(out).toHaveLength(1);
    });

    it('rejects more than the cap', () => {
        const many = Array.from({ length: MAX_AGENCY_FAQS + 1 }, () => ({ question: { fr: 'Q' }, answer: { fr: 'A' } }));
        expect(() => normalizeTripFaqs(many)).toThrow(/at most/);
    });

    it('rejects entries without French', () => {
        expect(() => normalizeTripFaqs([{ question: { en: 'Q' }, answer: { en: 'A' } }])).toThrow(/French/);
    });

    it('rejects free-text commercial terms — FAQs are not a terms backdoor', () => {
        expect(() => normalizeTripFaqs([{
            question: { fr: 'Puis-je annuler ?' },
            answer: { fr: 'Non remboursable et non annulable.' },
        }])).toThrow(/structured cancellation scale/);
    });
});

describe('buildTripFaqJsonLd (#686)', () => {
    it('renders FAQPage schema in the requested locale with French fallback', () => {
        const ld = buildTripFaqJsonLd([{ question: { fr: 'Q fr', en: 'Q en' }, answer: { fr: 'A fr', en: 'A en' } }], 'en');
        expect((ld as any)['@type']).toBe('FAQPage');
        expect((ld as any).mainEntity[0].name).toBe('Q en');
        const ldAr = buildTripFaqJsonLd([{ question: { fr: 'Q fr' }, answer: { fr: 'A fr' } }], 'ar');
        expect((ldAr as any).mainEntity[0].name).toBe('Q fr');
    });
});
