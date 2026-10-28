import { detectContactExchange } from './contact-exchange.util';

/**
 * #444 (Council P2-05): contact-exchange detection.
 *
 * The detector guards the pre-booking phase only (post-booking contact
 * exchange is by design), and it must be precision-first: flagging an
 * honest traveller's ordinary message is worse than missing an
 * obfuscated attempt. These tests pin both directions — the strong
 * leakage shapes are caught, and ordinary trip conversation (prices,
 * dates, seat counts, Ouiboo links, the bare word "WhatsApp") is not.
 */
describe('detectContactExchange (#444)', () => {
  describe('detects the strong leakage shapes', () => {
    it('detects a Moroccan mobile in local form, spaced or compact', () => {
      expect(detectContactExchange('Call me on 0612345678 please')).toEqual(['PHONE']);
      expect(detectContactExchange('Mon numero: 06 12 34 56 78')).toEqual(['PHONE']);
      expect(detectContactExchange('Reach the guide at 07.12.34.56.78')).toEqual(['PHONE']);
    });

    it('detects a Moroccan mobile in international form', () => {
      expect(detectContactExchange('WhatsApp: +212 6 12 34 56 78')).toEqual(['PHONE']);
      expect(detectContactExchange('Dial 00212612345678')).toEqual(['PHONE']);
    });

    it('detects another international number written with a leading +', () => {
      expect(detectContactExchange('My French number is +33 6 12 34 56 78')).toEqual(['PHONE']);
    });

    it('detects an e-mail address', () => {
      expect(detectContactExchange('Write to me at atlas.tours@example.com instead')).toEqual([
        'EMAIL',
      ]);
    });

    it('detects a 24-digit Moroccan RIB, spaced in groups or compact', () => {
      expect(
        detectContactExchange('Virement sur le RIB 1234 5678 9012 3456 7890 1234 merci'),
      ).toEqual(['BANK_DETAILS']);
      expect(detectContactExchange('RIB: 123456789012345678901234')).toEqual(['BANK_DETAILS']);
    });

    it('detects an IBAN', () => {
      expect(detectContactExchange('IBAN MA64 1234 5678 9012 3456 7890 1234')).toEqual([
        'BANK_DETAILS',
      ]);
    });

    it('detects messaging and social links as contact links', () => {
      expect(detectContactExchange('Message me here: https://wa.me/212612345678')).toContain(
        'EXTERNAL_CONTACT_LINK',
      );
      expect(detectContactExchange('See instagram.com/atlastours for more')).toEqual([
        'EXTERNAL_CONTACT_LINK',
      ]);
      expect(detectContactExchange('Group chat: https://chat.whatsapp.com/AbCdEf')).toEqual([
        'EXTERNAL_CONTACT_LINK',
      ]);
      expect(detectContactExchange('t.me/atlastours')).toEqual(['EXTERNAL_CONTACT_LINK']);
    });

    it('detects a generic external link', () => {
      expect(detectContactExchange('Book on our own site: https://atlas-tours.example.com/book')).toEqual(
        ['EXTERNAL_LINK'],
      );
    });

    it('reports several categories together, in stable order', () => {
      expect(
        detectContactExchange(
          'Email atlas@example.com or call 0612345678, details at https://example.com/x',
        ),
      ).toEqual(['PHONE', 'EMAIL', 'EXTERNAL_LINK']);
    });
  });

  describe('never flags ordinary conversation', () => {
    it('ignores empty and plain text', () => {
      expect(detectContactExchange('')).toEqual([]);
      expect(detectContactExchange(null)).toEqual([]);
      expect(detectContactExchange(undefined)).toEqual([]);
      expect(detectContactExchange('Hello, is the trip still available on Friday?')).toEqual([]);
    });

    it('ignores prices, guest counts and dates', () => {
      expect(detectContactExchange('The price is 2000 MAD for 2 people, deposit 500')).toEqual([]);
      expect(detectContactExchange('We are 4 adults and 2 children')).toEqual([]);
      expect(detectContactExchange('Departure on 12/05/2026 at 08:30, back 14/05/2026')).toEqual([]);
      expect(detectContactExchange('The hike is 12 km, about 5 hours')).toEqual([]);
    });

    it('ignores the bare name of a messaging app', () => {
      expect(detectContactExchange('Do you use WhatsApp? I prefer to stay here.')).toEqual([]);
      expect(detectContactExchange('We will share the meeting point the day before')).toEqual([]);
    });

    it('ignores Ouiboo links (sharing a trip is a supported flow)', () => {
      expect(detectContactExchange('This is the trip: https://ouiboo.com/trip/abc123')).toEqual([]);
      expect(detectContactExchange('See ouiboo.com/trip/abc123 for the itinerary')).toEqual([]);
    });

    it('ignores short digit fragments and landline-style numbers', () => {
      expect(detectContactExchange('My booking reference ends with 123456')).toEqual([]);
      expect(detectContactExchange('The office landline is 0522123456')).toEqual([]);
    });
  });
});
