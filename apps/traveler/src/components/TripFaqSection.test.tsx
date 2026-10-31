import React from 'react';
import { render, screen } from '@testing-library/react';
import { TripFaqSection, pickFaqText } from './TripFaqSection';

describe('TripFaqSection (#686)', () => {
    it('renders generated + agency entries and the FAQPage JSON-LD', () => {
        const { container } = render(
            <TripFaqSection
                generatedFaqs={[{ question: { fr: 'Q générée', en: 'Generated Q' }, answer: { fr: 'A générée', en: 'Generated A' } }]}
                faqs={[{ question: { fr: "Question d'agence" }, answer: { fr: "Réponse d'agence" } }]}
                faqJsonLd={{ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: [] }}
            />,
        );
        // The jest i18n mock resolves to French: fr text renders, with
        // French fallback for the agency entry (fr-only by construction).
        expect(screen.getByText('Q générée')).toBeTruthy();
        expect(screen.getByText("Question d'agence")).toBeTruthy();
        expect(container.querySelector('script[type="application/ld+json"]')).toBeTruthy();
    });

    it('renders nothing when there are no entries', () => {
        const { container } = render(<TripFaqSection generatedFaqs={[]} faqs={[]} />);
        expect(container.firstChild).toBeNull();
    });

    it('pickFaqText falls back locale -> fr -> en -> first value', () => {
        expect(pickFaqText({ fr: 'FR', en: 'EN' }, 'en')).toBe('EN');
        expect(pickFaqText({ fr: 'FR', en: 'EN' }, 'ar')).toBe('FR');
        expect(pickFaqText({ en: 'EN' }, 'ar')).toBe('EN');
        expect(pickFaqText(undefined, 'fr')).toBe('');
    });
});
