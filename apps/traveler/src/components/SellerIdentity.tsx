'use client';

import React from 'react';
import { useTranslation } from 'react-i18next';
import { BadgeCheck } from 'lucide-react';

/**
 * #371: seller-of-record display (implementation plan §6).
 *
 * Travellers must see who actually sells the trip — OuiBoo is the
 * marketplace, never the seller. The legal name wins over the commercial
 * name, and the Law 11-16 licence number is shown only while the licence
 * is verified and unexpired (the API already withholds the number for
 * unverified licences on the public profile endpoint; the trip/checkout
 * payloads carry the raw fields, so the same derivation runs here).
 * Final legal wording is pending counsel; format follows plan §6.
 */
export interface SellerAgencyInfo {
    companyName?: string | null;
    legalName?: string | null;
    /** B4: licence type (ODV/DV) — part of the seller block. */
    travelLicenceType?: string | null;
    travelLicenceNumber?: string | null;
    travelLicenceStatus?: string | null;
    licenceExpiry?: string | Date | null;
    /** B4: licence date of issue + issuing authority (Law 31-08 block). */
    licenceIssuedAt?: string | Date | null;
    licenceIssuingAuthority?: string | null;
    /** Pre-derived by the API (public profile endpoint). */
    licenceVerified?: boolean;
    /** #413 (Council B10): when the licence document was checked. */
    licenceVerifiedAt?: string | Date | null;
    insuranceStatus?: string | null;
    /** #413 (Council B10): when the RC insurance was evidenced. */
    insuranceVerifiedAt?: string | Date | null;
}

function toValidDate(value: string | Date | null | undefined): Date | null {
    if (!value) return null;
    const date = value instanceof Date ? value : new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * #413 (Council B10): the what+when verification statement — each part is
 * present only when that check actually passed, and carries the date it
 * happened. No date, no claim.
 */
export function getVerificationChecks(agency: SellerAgencyInfo, now: Date = new Date()) {
    const licenceCheckedDate = isLicenceVerifiedForDisplay(agency, now)
        ? toValidDate(agency.licenceVerifiedAt)
        : null;
    const insuranceEvidencedDate =
        agency.insuranceStatus === 'VERIFIED' ? toValidDate(agency.insuranceVerifiedAt) : null;
    return { licenceCheckedDate, insuranceEvidencedDate };
}

export function isLicenceVerifiedForDisplay(agency: SellerAgencyInfo, now: Date = new Date()): boolean {
    if (typeof agency.licenceVerified === 'boolean') {
        return agency.licenceVerified;
    }
    if (agency.travelLicenceStatus !== 'VERIFIED') {
        return false;
    }
    if (agency.licenceExpiry) {
        const expiry = agency.licenceExpiry instanceof Date
            ? agency.licenceExpiry
            : new Date(agency.licenceExpiry);
        if (!Number.isNaN(expiry.getTime()) && expiry.getTime() <= now.getTime()) {
            return false;
        }
    }
    return true;
}

export function getSellerDisplay(agency: SellerAgencyInfo, now: Date = new Date()) {
    const name = agency.legalName?.trim() || agency.companyName?.trim() || '';
    const licenceVerified = isLicenceVerifiedForDisplay(agency, now);
    // B4: the complete seller block needs the licence type, issue date,
    // and issuing authority alongside the number. All three are licence
    // facts, so they are withheld unless the licence is verified (the
    // public profile endpoint already nulls them; trip/checkout payloads
    // carry raw fields, so the gate is applied here too). A verified
    // legacy record missing either issue field reports
    // `licenceDetailsPending` so the surface shows the honest gap
    // instead of a fabricated value.
    const issuedAt = licenceVerified ? toValidDate(agency.licenceIssuedAt) : null;
    const issuingAuthority = licenceVerified ? agency.licenceIssuingAuthority?.trim() || null : null;
    return {
        name,
        licenceVerified,
        licenceNumber: licenceVerified ? (agency.travelLicenceNumber ?? null) : null,
        licenceType: licenceVerified ? (agency.travelLicenceType ?? null) : null,
        licenceIssuedAt: issuedAt,
        licenceIssuingAuthority: issuingAuthority,
        licenceDetailsPending: licenceVerified && (!issuedAt || !issuingAuthority),
    };
}

export default function SellerIdentity({
    agency,
    className = '',
}: {
    agency: SellerAgencyInfo | null | undefined;
    className?: string;
}) {
    const { t, i18n } = useTranslation();

    if (!agency) {
        return null;
    }
    const {
        name,
        licenceVerified,
        licenceNumber,
        licenceType,
        licenceIssuedAt,
        licenceIssuingAuthority,
        licenceDetailsPending,
    } = getSellerDisplay(agency);
    if (!name) {
        return null;
    }

    // #413 (Council B10): explicit what+when — only the checks that passed,
    // each with the actual date from the agency's verification record.
    const { licenceCheckedDate, insuranceEvidencedDate } = getVerificationChecks(agency);
    const formatDate = (date: Date) =>
        new Intl.DateTimeFormat(i18n.language || 'en', { dateStyle: 'medium' }).format(date);
    const checks: string[] = [];
    if (licenceCheckedDate) {
        const date = formatDate(licenceCheckedDate);
        checks.push(
            t('seller.licenceChecked', { date, defaultValue: `Licence document checked on ${date}` }),
        );
    }
    if (insuranceEvidencedDate) {
        const date = formatDate(insuranceEvidencedDate);
        checks.push(
            t('seller.insuranceEvidenced', { date, defaultValue: `RC insurance evidenced on ${date}` }),
        );
    }

    return (
        <div className={`text-sm text-muted-foreground ${className}`} data-testid="seller-identity">
            <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span>
                    {t('seller.organisedAndSoldBy', { name, defaultValue: `Organised and sold by ${name}` })}
                </span>
                {licenceVerified && licenceNumber && (
                    <span className="inline-flex items-center gap-1 font-medium text-foreground">
                        <BadgeCheck className="h-4 w-4 text-emerald-600" aria-hidden="true" />
                        {licenceType
                            ? t('seller.licenceTyped', {
                                  type: licenceType,
                                  number: licenceNumber,
                                  defaultValue: `Travel-agent licence: ${licenceType} ${licenceNumber}`,
                              })
                            : t('seller.licence', { number: licenceNumber, defaultValue: `Travel-agent licence: ${licenceNumber}` })}
                    </span>
                )}
            </p>
            {licenceVerified && licenceIssuedAt && licenceIssuingAuthority && (
                <p className="text-xs">
                    {t('seller.licenceIssued', {
                        date: formatDate(licenceIssuedAt),
                        authority: licenceIssuingAuthority,
                        defaultValue: `Issued on ${formatDate(licenceIssuedAt)} by ${licenceIssuingAuthority}`,
                    })}
                </p>
            )}
            {licenceDetailsPending && (
                <p className="text-xs">
                    {t('seller.licenceDetailsPending', 'Licence issue details are being confirmed with the agency.')}
                </p>
            )}
            {checks.length > 0 && <p className="text-xs">{checks.join(' · ')}</p>}
            <p className="text-xs">{t('seller.poweredBy', 'Powered by OuiBoo')}</p>
        </div>
    );
}
