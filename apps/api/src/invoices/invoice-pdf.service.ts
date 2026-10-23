import { Injectable } from '@nestjs/common';
import * as PDFDocument from 'pdfkit';
import type { serializeInvoice } from './invoices.service';

export type InvoicePdfData = ReturnType<typeof serializeInvoice>;

const formatDate = (value: string | Date) => {
    const date = value instanceof Date ? value : new Date(value);
    return date.toISOString().slice(0, 10);
};

const formatPeriod = (start: string | Date, end: string | Date) => {
    const startDate = start instanceof Date ? start : new Date(start);
    // periodEnd is exclusive (first day of the next month); show the last
    // day of the billed month instead.
    const shownEnd = new Date(end instanceof Date ? end : new Date(end));
    shownEnd.setUTCDate(shownEnd.getUTCDate() - 1);
    return `${formatDate(startDate)} to ${formatDate(shownEnd)}`;
};

/**
 * Renders an invoice PDF on demand from the stored invoice record. The
 * invoice row snapshots issuer/agency legal details and line items at
 * issuance, so the PDF is reproducible byte-for-semantics at any later date.
 */
@Injectable()
export class InvoicePdfService {
    render(invoice: InvoicePdfData): Promise<Buffer> {
        return new Promise((resolve, reject) => {
            const doc = new PDFDocument({ size: 'A4', margin: 50 });
            const chunks: Buffer[] = [];
            doc.on('data', (chunk: Buffer) => chunks.push(chunk));
            doc.on('end', () => resolve(Buffer.concat(chunks)));
            doc.on('error', reject);

            const issuerName = invoice.issuerName || 'Ouiboo';
            doc.font('Helvetica-Bold').fontSize(18).text(issuerName, { align: 'left' });
            doc.font('Helvetica').fontSize(10);
            if (invoice.issuerIce) doc.text(`ICE: ${invoice.issuerIce}`);
            if (invoice.issuerRc) doc.text(`RC: ${invoice.issuerRc}`);
            if (invoice.issuerAddress) doc.text(invoice.issuerAddress);

            doc.moveDown();
            doc.font('Helvetica-Bold').fontSize(16).text('Platform Service Fee Invoice');
            doc.font('Helvetica').fontSize(11);
            doc.text(`Invoice number: ${invoice.number}`);
            doc.text(`Issued: ${formatDate(invoice.issuedAt)}`);
            doc.text(`Billing period: ${formatPeriod(invoice.periodStart, invoice.periodEnd)}`);
            doc.text(`Status: ${invoice.status}`);

            doc.moveDown();
            doc.font('Helvetica-Bold').fontSize(12).text('Billed to');
            doc.font('Helvetica').fontSize(11);
            doc.text(invoice.agencyName);
            doc.text(`ICE: ${invoice.agencyIce}`);

            doc.moveDown();
            doc.font('Helvetica-Bold').fontSize(12).text('Platform service fee details');
            doc.font('Helvetica').fontSize(10);
            doc.text(
                `Platform service fee on paid bookings collected by the agency during the period. ` +
                `Rate applied: ${invoice.commissionRate}% of the booking total.`,
            );

            doc.moveDown(0.5);
            const colX = { date: 50, description: 120, gross: 330, rate: 410, commission: 460 };
            const line = (y: number, date: string, description: string, gross: string, rate: string, commission: string) => {
                doc.text(date, colX.date, y, { width: 65 });
                doc.text(description, colX.description, y, { width: 200 });
                doc.text(gross, colX.gross, y, { width: 75, align: 'right' });
                doc.text(rate, colX.rate, y, { width: 45, align: 'right' });
                doc.text(commission, colX.commission, y, { width: 85, align: 'right' });
            };
            doc.font('Helvetica-Bold');
            line(doc.y, 'Date', 'Booking', `Gross (${invoice.currency})`, 'Rate %', `Fee (${invoice.currency})`);
            doc.font('Helvetica');
            doc.moveDown(0.3);
            for (const item of invoice.lineItems) {
                if (doc.y > 720) {
                    doc.addPage();
                }
                const y = doc.y;
                line(
                    y,
                    formatDate(item.bookingDate),
                    item.description,
                    item.grossAmount ?? '0.00',
                    item.commissionRate,
                    item.commissionAmount ?? '0.00',
                );
                doc.y = y + 14;
            }

            doc.moveDown();
            doc.font('Helvetica').fontSize(11);
            doc.text(`Gross bookings total: ${invoice.subtotalAmount} ${invoice.currency}`, { align: 'right' });
            doc.font('Helvetica-Bold').fontSize(12);
            doc.text(`Platform service fee due: ${invoice.totalAmount} ${invoice.currency}`, { align: 'right' });

            doc.moveDown(2);
            doc.font('Helvetica').fontSize(9).fillColor('#666666');
            doc.text(
                'Ouiboo is a technology provider; the agency is the seller of the trips listed above ' +
                'and collected the booking amounts directly. This invoice covers only the Ouiboo platform service fee.',
            );

            doc.end();
        });
    }
}
