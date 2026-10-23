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
    travelLicenceNumber?: string | null;
    travelLicenceStatus?: string | null;
    licenceExpiry?: string | Date | null;
    /** Pre-derived by the API (public profile endpoint). */
    licenceVerified?: boolean;
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
    return {
        name,
        licenceVerified,
        licenceNumber: licenceVerified ? (agency.travelLicenceNumber ?? null) : null,
    };
}

export default function SellerIdentity({
    agency,
    className = '',
}: {
    agency: SellerAgencyInfo | null | undefined;
    className?: string;
}) {
    const { t } = useTranslation();

    if (!agency) {
        return null;
    }
    const { name, licenceVerified, licenceNumber } = getSellerDisplay(agency);
    if (!name) {
        return null;
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
                        {t('seller.licence', { number: licenceNumber, defaultValue: `Travel-agent licence: ${licenceNumber}` })}
                    </span>
                )}
            </p>
            <p className="text-xs">{t('seller.poweredBy', 'Powered by OuiBoo')}</p>
        </div>
    );
}
