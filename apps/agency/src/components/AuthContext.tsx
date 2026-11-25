'use client';

import { createAuthContext } from '@ouiboo/auth';
import type { AuthUser, SubscriptionStatus, TravelLicenceType, VerificationStatusType } from '@ouiboo/types';

/** #1025 (A4): agency session user = shared AuthUser base + agency profile. */
interface User extends AuthUser {
    agencyProfile?: {
        id: string;
        companyName: string;
        ice?: string;
        patente?: string;
        rib?: string;
        bankDetails?: string;
        verificationStatus: VerificationStatusType;
        bio?: string;
        logo?: string;
        subscriptionStatus?: SubscriptionStatus;
        trialEndsAt?: string;
        subscriptionEndsAt?: string;
        subscriptionTermsVersion?: string;
        cancelAtPeriodEnd?: boolean;
        cancellationRequestedAt?: string;
        // #371: legal identity + Law 11-16 travel licence
        legalName?: string;
        rc?: string;
        taxId?: string;
        legalRepresentative?: string;
        businessAddress?: string;
        // #700: public seller phone (checkout seller block).
        businessPhone?: string;
        // #691: storefront about (language-keyed) + languages.
        aboutTranslations?: Record<string, string> | null;
        languages?: string[];
        travelLicenceType?: TravelLicenceType;
        travelLicenceNumber?: string;
        travelLicenceStatus?: string;
        licenceVerifiedAt?: string;
        licenceExpiry?: string;
        // B4: licence issue date + issuing authority (seller block).
        licenceIssuedAt?: string;
        licenceIssuingAuthority?: string;
        licenceRejectionReason?: string;
        // #415: licence document + Ministry-check stamp
        licenceDocumentKey?: string;
        licenceDocumentName?: string;
        licenceMinistryCheckedAt?: string;
        licenceMinistryCheckedBy?: string;
        // #415: RC insurance artefact
        insuranceStatus?: string;
        insuranceInsurer?: string;
        insurancePolicyNumber?: string;
        insuranceInsuredName?: string;
        insuranceValidFrom?: string;
        insuranceExpiry?: string;
        insuranceCoverageLimit?: string;
        insuranceCertificateKey?: string;
        insuranceVerifiedAt?: string;
        insuranceRejectionReason?: string;
        // #415: expiry-sweep auto-pause marker
        verificationPausedAt?: string;
        verificationPauseReason?: string;
        // #421: bank-destination verification (pending submission + review state)
        pendingBankDetails?: string;
        bankAccountHolderName?: string;
        bankAttestationUrl?: string;
        bankDetailsStatus?: string;
        bankDetailsVerifiedAt?: string;
        bankDetailsRejectionReason?: string;
        // #988: Cash Plus destination (pending submission + review state)
        cashPlusBeneficiaryName?: string;
        cashPlusPhone?: string;
        pendingCashPlusBeneficiaryName?: string;
        pendingCashPlusPhone?: string;
        cashPlusEnabled?: boolean;
        cashPlusStatus?: string;
        cashPlusVerifiedAt?: string;
        cashPlusRejectionReason?: string;
        // #419: trip emergency contact (departure pack for travellers)
        emergencyContactName?: string;
        emergencyContactPhone?: string;
    };
}

export const { AuthProvider, useAuth } = createAuthContext<User>({
    queryKey: ['me'],
    navigation: 'replace',
});
