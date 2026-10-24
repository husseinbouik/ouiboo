import * as Helvetica from 'pdfkit/standard-fonts/Helvetica';
import * as HelveticaBold from 'pdfkit/standard-fonts/HelveticaBold';
import {
    InvoicePdfService,
    PDFDocument,
    resolvePDFDocumentConstructor,
} from './invoice-pdf.service';

/**
 * Regression coverage for the invoice PDF download 500s (#359).
 *
 * The deployed runtime logs disproved the round-1 font-only diagnosis:
 * before rendering reached font selection, the Vercel bundle exposed
 * pdfkit as an ESM namespace object and the service treated that object
 * as the class, throwing "PDFDocument is not a constructor". The
 * standard-font imports remain as protection for the next step in the
 * render path; the constructor interop is locked separately below.
 */
describe('InvoicePdfService PDF bundle contracts (#359)', () => {
    it('resolves pdfkit to a constructor function', () => {
        expect(typeof PDFDocument).toBe('function');
        const doc = new PDFDocument({ size: 'A4', margin: 50 });
        expect(doc).toBeInstanceOf(PDFDocument);
        doc.end();
    });

    it('unwraps namespace-shaped pdfkit modules', () => {
        class NamespacePDFDocument {}
        class NamedPDFDocument {}

        expect(resolvePDFDocumentConstructor({ default: NamespacePDFDocument })).toBe(
            NamespacePDFDocument,
        );
        expect(resolvePDFDocumentConstructor({ PDFDocument: NamedPDFDocument })).toBe(
            NamedPDFDocument,
        );
        expect(resolvePDFDocumentConstructor(NamespacePDFDocument)).toBe(NamespacePDFDocument);
    });

    it('rejects module shapes that do not contain a constructor', () => {
        expect(() => resolvePDFDocumentConstructor({ default: {} })).toThrow(
            'pdfkit did not resolve to a PDF document constructor',
        );
    });

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
