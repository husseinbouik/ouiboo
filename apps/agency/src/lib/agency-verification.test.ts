import {
  activationBlockArtefactKey,
  activationBlockMessageKey,
  effectiveArtefactStatus,
  effectiveInsuranceStatus,
  effectiveLicenceStatus,
  getAgencyActivationState,
  getVerificationPause,
} from './agency-verification';

const NOW = new Date('2026-10-25T12:00:00.000Z');
const FUTURE = '2027-01-01T00:00:00.000Z';
const PAST = '2026-01-01T00:00:00.000Z';

describe('effectiveArtefactStatus (#415 mirror of the API derivation)', () => {
  it('defaults a missing status to NOT_SUBMITTED', () => {
    expect(effectiveArtefactStatus(undefined, FUTURE, NOW)).toBe('NOT_SUBMITTED');
    expect(effectiveArtefactStatus(null, null, NOW)).toBe('NOT_SUBMITTED');
  });

  it('passes non-VERIFIED stored statuses through unchanged', () => {
    expect(effectiveArtefactStatus('PENDING_REVIEW', PAST, NOW)).toBe('PENDING_REVIEW');
    expect(effectiveArtefactStatus('REJECTED', PAST, NOW)).toBe('REJECTED');
    expect(effectiveArtefactStatus('EXPIRED', FUTURE, NOW)).toBe('EXPIRED');
  });

  it('keeps a VERIFIED artefact with a future expiry VERIFIED', () => {
    expect(effectiveArtefactStatus('VERIFIED', FUTURE, NOW)).toBe('VERIFIED');
  });

  it('derives EXPIRED for a VERIFIED artefact past its expiry', () => {
    expect(effectiveArtefactStatus('VERIFIED', PAST, NOW)).toBe('EXPIRED');
  });

  it('never reads a VERIFIED artefact without a usable expiry as verified', () => {
    expect(effectiveArtefactStatus('VERIFIED', null, NOW)).toBe('PENDING_REVIEW');
    expect(effectiveArtefactStatus('VERIFIED', 'not-a-date', NOW)).toBe('PENDING_REVIEW');
  });
});

describe('effective licence / insurance status', () => {
  it('derives the licence status from the licence fields', () => {
    expect(
      effectiveLicenceStatus({ travelLicenceStatus: 'VERIFIED', licenceExpiry: PAST }, NOW),
    ).toBe('EXPIRED');
    expect(
      effectiveLicenceStatus({ travelLicenceStatus: 'VERIFIED', licenceExpiry: FUTURE }, NOW),
    ).toBe('VERIFIED');
    expect(effectiveLicenceStatus(undefined, NOW)).toBe('NOT_SUBMITTED');
  });

  it('derives the insurance status from the insurance fields', () => {
    expect(
      effectiveInsuranceStatus({ insuranceStatus: 'VERIFIED', insuranceExpiry: PAST }, NOW),
    ).toBe('EXPIRED');
    expect(
      effectiveInsuranceStatus({ insuranceStatus: 'VERIFIED', insuranceExpiry: null }, NOW),
    ).toBe('PENDING_REVIEW');
    expect(effectiveInsuranceStatus(undefined, NOW)).toBe('NOT_SUBMITTED');
  });
});

describe('getAgencyActivationState (#415 mirror of the API activation gate)', () => {
  const fullyVerified = {
    verificationStatus: 'VERIFIED',
    travelLicenceStatus: 'VERIFIED',
    licenceExpiry: FUTURE,
    insuranceStatus: 'VERIFIED',
    insuranceExpiry: FUTURE,
  };

  it('is fully verified only when identity, licence and insurance all pass', () => {
    expect(getAgencyActivationState(fullyVerified, NOW)).toEqual({
      fullyVerified: true,
      licenceStatus: 'VERIFIED',
      insuranceStatus: 'VERIFIED',
      block: null,
    });
  });

  it('blocks on identity first, whatever the artefacts say', () => {
    const state = getAgencyActivationState(
      { ...fullyVerified, verificationStatus: 'PENDING' },
      NOW,
    );
    expect(state.fullyVerified).toBe(false);
    expect(state.block).toEqual({ artefact: 'identity', status: 'UNVERIFIED' });
    expect(getAgencyActivationState(undefined, NOW).block).toEqual({
      artefact: 'identity',
      status: 'UNVERIFIED',
    });
  });

  it('blocks on the licence before insurance, including derived expiry', () => {
    expect(
      getAgencyActivationState({ ...fullyVerified, licenceExpiry: PAST }, NOW).block,
    ).toEqual({ artefact: 'licence', status: 'EXPIRED' });
    // A VERIFIED licence with no expiry on file is not verified-forever.
    expect(
      getAgencyActivationState({ ...fullyVerified, licenceExpiry: null }, NOW).block,
    ).toEqual({ artefact: 'licence', status: 'PENDING_REVIEW' });
  });

  it('blocks on RC insurance when identity and licence pass', () => {
    expect(
      getAgencyActivationState({ ...fullyVerified, insuranceStatus: 'NOT_SUBMITTED' }, NOW)
        .block,
    ).toEqual({ artefact: 'insurance', status: 'NOT_SUBMITTED' });
    expect(
      getAgencyActivationState({ ...fullyVerified, insuranceExpiry: PAST }, NOW).block,
    ).toEqual({ artefact: 'insurance', status: 'EXPIRED' });
  });

  it('maps blocks to the shared i18n keys', () => {
    expect(activationBlockArtefactKey({ artefact: 'insurance', status: 'EXPIRED' })).toBe(
      'verification.artefact.insurance',
    );
    expect(activationBlockMessageKey({ artefact: 'identity', status: 'UNVERIFIED' })).toBe(
      'verification.block.identity',
    );
    expect(activationBlockMessageKey({ artefact: 'licence', status: 'EXPIRED' })).toBe(
      'onboarding.licence.status.EXPIRED',
    );
    expect(activationBlockMessageKey({ artefact: 'insurance', status: 'NOT_SUBMITTED' })).toBe(
      'onboarding.insurance.status.NOT_SUBMITTED',
    );
  });
});

describe('getVerificationPause', () => {
  it('is not paused for a fully verified agency', () => {
    expect(
      getVerificationPause(
        {
          travelLicenceStatus: 'VERIFIED',
          licenceExpiry: FUTURE,
          insuranceStatus: 'VERIFIED',
          insuranceExpiry: FUTURE,
          verificationPausedAt: null,
        },
        NOW,
      ),
    ).toEqual({ paused: false, licenceExpired: false, insuranceExpired: false });
  });

  it('pauses on the sweep stamp even before a derived expiry is visible', () => {
    const pause = getVerificationPause(
      {
        travelLicenceStatus: 'VERIFIED',
        licenceExpiry: FUTURE,
        insuranceStatus: 'VERIFIED',
        insuranceExpiry: FUTURE,
        verificationPausedAt: '2026-10-25T02:00:00.000Z',
      },
      NOW,
    );
    expect(pause.paused).toBe(true);
  });

  it('pauses and names the artefact when the licence or the insurance expired', () => {
    expect(
      getVerificationPause(
        {
          travelLicenceStatus: 'VERIFIED',
          licenceExpiry: PAST,
          insuranceStatus: 'VERIFIED',
          insuranceExpiry: FUTURE,
        },
        NOW,
      ),
    ).toEqual({ paused: true, licenceExpired: true, insuranceExpired: false });

    expect(
      getVerificationPause(
        {
          travelLicenceStatus: 'VERIFIED',
          licenceExpiry: FUTURE,
          insuranceStatus: 'EXPIRED',
          insuranceExpiry: PAST,
        },
        NOW,
      ),
    ).toEqual({ paused: true, licenceExpired: false, insuranceExpired: true });
  });
});
