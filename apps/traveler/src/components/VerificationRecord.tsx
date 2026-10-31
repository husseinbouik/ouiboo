'use client';

import React from 'react';
import { useTranslation } from 'react-i18next';
import { BadgeCheck, ShieldAlert } from 'lucide-react';
import { isLicenceVerifiedForDisplay, type SellerAgencyInfo } from './SellerIdentity';

/**
 * #688 (Council S6): the Public Verification Record — the checkable
 * display of the verification work Ouiboo already performs (#458):
 * legal name, licence number/authority/expiry, RC insurer + validity
 * window, the date Ouiboo checked, the live status, and the rule that
 * a lapse auto-pauses the agency's trips. Metadata only — the
 * underlying documents stay private, and the copy says the documents
 * were checked (no live registry lookup exists to claim).
 *
 * Accepts either the public-profile payload (which carries the API's
 * derived `verificationRecord`) or any SellerAgencyInfo-shaped agency
 * object (trip / booking payloads), deriving the same record locally.
 */
export interface VerificationRecordAgency extends SellerAgencyInfo {
    id?: string;
    insuranceInsurer?: string | null;
    insuranceExpiry?: string | Date | null;
    verificationStatus?: string | null;
    verificationRecord?: {
        legalName?: string | null;
        licenceNumber?: string | null;
        licenceType?: string | null;
        issuingAuthority?: string | null;
        licenceExpiry?: string | null;
        licenceStatus?: string | null;
        insurer?: string | null;
        insuranceValidFrom?: string | null;
        insuranceExpiry?: string | null;
        insuranceStatus?: string | null;
        checkedOn?: string | null;
        status?: string | null;
        tripsPaused?: boolean;
    } | null;
}

function toValidDate(value: string | Date | null | undefined): Date | null {
    if (!value) return null;
    const date = value instanceof Date ? value : new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
}

export function deriveVerificationRecord(agency: VerificationRecordAgency, now: Date = new Date()) {
    if (agency.verificationRecord) {
        const record = agency.verificationRecord;
        return {
            legalName: record.legalName ?? agency.legalName ?? agency.companyName ?? '',
            licenceNumber: record.licenceNumber ?? null,
            licenceType: record.licenceType ?? null,
            issuingAuthority: record.issuingAuthority ?? null,
            licenceExpiry: toValidDate(record.licenceExpiry),
            licenceStatus: record.licenceStatus ?? null,
            insurer: record.insurer ?? null,
            insuranceValidFrom: toValidDate(record.insuranceValidFrom),
            insuranceExpiry: toValidDate(record.insuranceExpiry),
            insuranceStatus: record.insuranceStatus ?? null,
            checkedOn: toValidDate(record.checkedOn),
            status: record.status ?? null,
            tripsPaused: Boolean(record.tripsPaused),
        };
    }
    const licenceVerified = isLicenceVerifiedForDisplay(agency, now);
    const insuranceVerified = agency.insuranceStatus === 'VERIFIED';
    const stamps = [toValidDate(agency.licenceVerifiedAt), toValidDate(agency.insuranceVerifiedAt)].filter(
        (d): d is Date => d !== null,
    );
    const umbrella = agency.verificationStatus ?? (licenceVerified && insuranceVerified ? 'VERIFIED' : null);
    return {
        legalName: agency.legalName ?? agency.companyName ?? '',
        licenceNumber: licenceVerified ? (agency.travelLicenceNumber ?? null) : null,
        licenceType: licenceVerified ? (agency.travelLicenceType ?? null) : null,
        issuingAuthority: licenceVerified ? (agency.licenceIssuingAuthority ?? null) : null,
        licenceExpiry: licenceVerified ? toValidDate(agency.licenceExpiry) : null,
        licenceStatus: agency.travelLicenceStatus ?? null,
        insurer: insuranceVerified ? (agency.insuranceInsurer ?? null) : null,
        insuranceValidFrom: null,
        insuranceExpiry: insuranceVerified ? toValidDate(agency.insuranceExpiry) : null,
        insuranceStatus: agency.insuranceStatus ?? null,
        checkedOn: stamps.length ? new Date(Math.max(...stamps.map((d) => d.getTime()))) : null,
        status: umbrella,
        tripsPaused: umbrella !== 'VERIFIED',
    };
}

export default function VerificationRecord({
    agency,
    className = '',
}: {
    agency: VerificationRecordAgency | null | undefined;
    className?: string;
}) {
    const { t, i18n } = useTranslation();
    if (!agency) return null;
    const record = deriveVerificationRecord(agency);
    if (!record.legalName) return null;

    const formatDate = (date: Date) =>
        new Intl.DateTimeFormat(i18n.language || 'en', { dateStyle: 'medium' }).format(date);
    const verified = record.status === 'VERIFIED' && !record.tripsPaused;

    const rows: Array<{ label: string; value: string }> = [];
    rows.push({ label: t('verificationRecord.legalName'), value: record.legalName });
    if (record.licenceNumber) {
        rows.push({
            label: t('verificationRecord.licence'),
            value: record.licenceType ? `${record.licenceType} ${record.licenceNumber}` : record.licenceNumber,
        });
    }
    if (record.issuingAuthority) {
        rows.push({ label: t('verificationRecord.authority'), value: record.issuingAuthority });
    }
    if (record.licenceExpiry) {
        rows.push({ label: t('verificationRecord.licenceExpiry'), value: formatDate(record.licenceExpiry) });
    }
    if (record.insurer) {
        rows.push({ label: t('verificationRecord.insurer'), value: record.insurer });
    }
    if (record.insuranceValidFrom || record.insuranceExpiry) {
        const from = record.insuranceValidFrom ? formatDate(record.insuranceValidFrom) : '';
        const until = record.insuranceExpiry ? formatDate(record.insuranceExpiry) : '';
        rows.push({
            label: t('verificationRecord.insuranceValidity'),
            value: from && until ? `${from} – ${until}` : until || from,
        });
    }
    if (record.checkedOn) {
        rows.push({ label: t('verificationRecord.checkedOn'), value: formatDate(record.checkedOn) });
    }

    return (
        <section
            id="verification-record"
            data-testid="verification-record"
            className={`rounded-2xl border border-border/60 bg-muted/20 p-5 text-sm ${className}`}
        >
            <p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                {verified ? (
                    <BadgeCheck className="h-4 w-4 text-emerald-600" aria-hidden="true" />
                ) : (
                    <ShieldAlert className="h-4 w-4 text-amber-600" aria-hidden="true" />
                )}
                {t('verificationRecord.title')}
            </p>
            <dl className="mt-3 space-y-1.5">
                {rows.map((row) => (
                    <div key={row.label} className="flex flex-wrap gap-x-2">
                        <dt className="font-semibold text-foreground">{row.label}:</dt>
                        <dd className="text-muted-foreground">{row.value}</dd>
                    </div>
                ))}
                <div className="flex flex-wrap gap-x-2">
                    <dt className="font-semibold text-foreground">{t('verificationRecord.statusLabel')}:</dt>
                    <dd className="text-muted-foreground">
                        {verified ? t('verificationRecord.statusVerified') : t('verificationRecord.statusNotVerified')}
                    </dd>
                </div>
            </dl>
            <p className="mt-3 text-xs text-muted-foreground">{t('verificationRecord.documentsNote')}</p>
            <p className="mt-1 text-xs text-muted-foreground">{t('verificationRecord.lapseNote')}</p>
        </section>
    );
}
