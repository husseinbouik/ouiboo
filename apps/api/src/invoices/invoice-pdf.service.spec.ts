import * as Helvetica from 'pdfkit/standard-fonts/Helvetica';
import * as HelveticaBold from 'pdfkit/standard-fonts/HelveticaBold';
import { InvoicePdfService } from './invoice-pdf.service';

/**
 * Regression coverage for the invoice PDF download 500s (#359).
 *
 * pdfkit 0.20 resolves its built-in font metrics lazily from
 * js/standard-fonts/*.cjs inside the pdfkit package. Those files were
 * missing from the Vercel serverless bundle, so rendering threw
 * MODULE_NOT_FOUND in the deployed environment while passing locally.
 * invoice-pdf.service.ts imports the two fonts used by the invoice
 * layout through pdfkit's public subpath exports so they are traced
 * into the bundle; these tests lock that contract in.
 */
describe('InvoicePdfService font bundle contract (#359)', () => {
    it('resolves the standard-font metrics for the fonts the layout uses', () => {
        expect(Helvetica.name).toBe('Helvetica');
        expect(Array.isArray(Helvetica.glyphWidths)).toBe(true);
        expect(Helvetica.glyphWidths.length).toBeGreaterThan(0);
        expect(HelveticaBold.name).toBe('Helvetica-Bold');
        expect(Array.isArray(HelveticaBold.glyphWidths)).toBe(true);
        expect(HelveticaBold.glyphWidths.length).toBeGreaterThan(0);
    });

    it('renders a valid PDF buffer end to end', async () => {
        const pdf = new InvoicePdfService();
        const buffer = await pdf.render({
            id: 'invoice-1',
            number: 'INV-2026-0001',
            agencyId: 'agency-1',
            agencyName: 'Atlas Adventures SARL',
            agencyIce: 'ICE-AGENCY-1',
            periodStart: new Date(Date.UTC(2026, 9, 1)),
            periodEnd: new Date(Date.UTC(2026, 10, 1)),
            currency: 'MAD',
            commissionRate: '10.00',
            subtotalAmount: '2000.00',
            totalAmount: '200.00',
            status: 'ISSUED',
            issuerName: null,
            issuerIce: null,
            issuerRc: null,
            issuerAddress: null,
            issuedAt: new Date(Date.UTC(2026, 10, 2)),
            lineItems: [
                {
                    id: 'line-1',
                    bookingId: 'b1',
                    description: 'Sahara Trek',
                    bookingDate: new Date(Date.UTC(2026, 9, 3)),
                    grossAmount: '2000.00',
                    commissionRate: '10.00',
                    commissionAmount: '200.00',
                },
            ],
        } as never);
        expect(buffer.subarray(0, 4).toString('utf8')).toBe('%PDF');
        expect(buffer.length).toBeGreaterThan(500);
    });
});
