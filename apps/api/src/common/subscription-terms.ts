// #324: the version of the agency subscription terms (auto-renewal, reminder,
// cancellation-at-period-end) an agency accepts when its subscription starts.
// Bump when the terms text changes; the accepted version is stored on
// AgencyProfile.subscriptionTermsVersion at subscription start.
export const CURRENT_SUBSCRIPTION_TERMS_VERSION = '1.0';
