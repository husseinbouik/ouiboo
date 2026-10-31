'use client';

import React from 'react';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';

/**
 * #700 (Council S6): the complete Law 31-08 Art. 29(2) seller block —
 * the agency's legal name, address, phone and IF/RC identifiers,
 * rendered at checkout and repeated on the booking confirmation.
 * Values come from the agency's verified profile; a field the record
 * does not carry is shown as an honest gap, never invented.
 */
export interface SellerBlockAgency {
    id?: string;
    companyName?: string | null;
    legalName?: string | null;
    businessAddress?: string | null;
    businessPhone?: string | null;
    rc?: string | null;
    taxId?: string | null;
}

export function sellerBlockFields(agency: SellerBlockAgency) {
    return {
        name: agency.legalName?.trim() || agency.companyName?.trim() || '',
        address: agency.businessAddress?.trim() || null,
        phone: agency.businessPhone?.trim() || null,
        rc: agency.rc?.trim() || null,
        taxId: agency.taxId?.trim() || null,
    };
}

export default function SellerBlock({
    agency,
    className = '',
    showRecordLink = false,
}: {
    agency: SellerBlockAgency | null | undefined;
    className?: string;
    showRecordLink?: boolean;
}) {
    const { t } = useTranslation();
    if (!agency) return null;
    const fields = sellerBlockFields(agency);
    if (!fields.name) return null;

    const missing = !fields.address || !fields.phone || !fields.rc || !fields.taxId;
    const row = (label: string, value: string | null) => (
        <div className="flex flex-wrap gap-x-2">
            <dt className="font-semibold text-foreground">{label}:</dt>
            <dd className="text-muted-foreground">{value ?? t('sellerBlock.notYetProvided')}</dd>
        </div>
    );

    return (
        <section data-testid="seller-block" className={`text-sm ${className}`} aria-label={t('sellerBlock.title')}>
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                {t('sellerBlock.title')}
            </p>
            <dl className="mt-2 space-y-1.5">
                <div className="flex flex-wrap gap-x-2">
                    <dt className="font-semibold text-foreground">{t('sellerBlock.legalName')}:</dt>
                    <dd className="text-muted-foreground">{fields.name}</dd>
                </div>
                {row(t('sellerBlock.address'), fields.address)}
                {row(t('sellerBlock.phone'), fields.phone)}
                {row(t('sellerBlock.rc'), fields.rc)}
                {row(t('sellerBlock.taxId'), fields.taxId)}
            </dl>
            {missing && <p className="mt-2 text-xs text-muted-foreground">{t('sellerBlock.incompleteNote')}</p>}
            {showRecordLink && agency.id && (
                <p className="mt-2 text-xs">
                    <Link href={`/agency/${agency.id}#verification-record`} className="font-semibold text-sunset-orange hover:underline">
                        {t('sellerBlock.verificationRecordLink')}
                    </Link>
                </p>
            )}
        </section>
    );
}
