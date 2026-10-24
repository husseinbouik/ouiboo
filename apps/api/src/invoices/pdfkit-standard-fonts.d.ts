/**
 * pdfkit ships no TypeScript declarations for its standard-font metric
 * modules (public subpath exports `pdfkit/standard-fonts/*`). They are
 * imported for side effects only — see invoice-pdf.service.ts (#359) —
 * so an untyped ambient declaration is all the compiler needs.
 */
declare module 'pdfkit/standard-fonts/Helvetica';
declare module 'pdfkit/standard-fonts/HelveticaBold';
