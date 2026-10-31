import { hasProhibitedCommercialTerms } from './commercial-terms';

describe('editor commercial-terms scan (#674)', () => {
  it('flags the Eden pattern in the description', () => {
    expect(hasProhibitedCommercialTerms({ description: 'Tarif ferme, non remboursable et non annulable' })).toBe(true);
  });

  it('flags a percentage deposit term in a translation', () => {
    expect(
      hasProhibitedCommercialTerms({ translations: { en: { description: 'Pay a 50% deposit to confirm your seat' } } }),
    ).toBe(true);
  });

  it('flags terms hidden in itinerary text and list items', () => {
    expect(hasProhibitedCommercialTerms({ itinerary: [{ description: 'Journée libre', activities: ['No refunds'] }] })).toBe(true);
    expect(hasProhibitedCommercialTerms({ inclusions: ['Conditions de paiement au départ'] })).toBe(true);
  });

  it('passes ordinary descriptive content', () => {
    expect(
      hasProhibitedCommercialTerms({
        title: 'Médina de Tanger à pied',
        description: 'Balade guidée, thé à la menthe et coucher de soleil au cap Spartel.',
        inclusions: ['Guide local', 'Thé'],
        itinerary: [{ title: 'Jour 1', description: 'Arrivée et installation au riad', activities: ['Balade'] }],
      }),
    ).toBe(false);
  });
});
