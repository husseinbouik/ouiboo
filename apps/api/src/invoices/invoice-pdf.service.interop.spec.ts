import { InvoicePdfService } from './invoice-pdf.service';

jest.mock('pdfkit', () => {
    const actual = jest.requireActual('pdfkit');
    return {
        __esModule: true,
        default: actual,
    };
});

/**
 * Simulates the module shape proven by the deployed Vercel runtime logs:
 * pdfkit arrives as an ESM namespace ({ default: PDFDocument }) rather
 * than as the constructor directly. Rendering must still produce a PDF.
 */
describe('InvoicePdfService with namespace-shaped pdfkit (#359)', () => {
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
