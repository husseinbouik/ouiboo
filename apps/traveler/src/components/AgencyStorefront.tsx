'use client';

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

/**
 * #691 (Council S6): the agency storefront block on the public agency
 * page — language-keyed about, languages, live trip count, median
 * response time, the verified-review aggregate under the #681
 * threshold rule, and the shareable link + QR the agency can put on
 * its own channels. The agency's brand leads; this block only frames
 * facts Ouiboo can stand behind (no invented numbers: response time
 * and averages render only when measured / above threshold).
 */
export interface StorefrontData {
  about?: Record<string, string> | null;
  languages?: string[];
  liveTripCount?: number;
  reviewAggregate?: {
    count: number;
    average: number | null;
    minReviewsForRating: number;
    belowThreshold: boolean;
  } | null;
  medianResponseTimeHours?: number | null;
  sharePath?: string;
}

export default function AgencyStorefront({
  storefront,
  locale,
}: {
  storefront: StorefrontData;
  locale: string;
}) {
  const { t } = useTranslation();
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [shareUrl, setShareUrl] = useState<string>('');

  useEffect(() => {
    if (typeof window === 'undefined' || !storefront.sharePath) return;
    const url = `${window.location.origin}${storefront.sharePath}`;
    setShareUrl(url);
    let cancelled = false;
    void import('qrcode')
      .then((QRCode) => QRCode.toDataURL(url, { margin: 1, width: 200 }))
      .then((dataUrl) => {
        if (!cancelled) setQrDataUrl(dataUrl);
      })
      .catch(() => {
        if (!cancelled) setQrDataUrl(null);
      });
    return () => {
      cancelled = true;
    };
  }, [storefront.sharePath]);

  const about =
    storefront.about?.[locale] ??
    storefront.about?.fr ??
    (storefront.about ? Object.values(storefront.about)[0] : undefined);
  const aggregate = storefront.reviewAggregate ?? null;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <section
      data-testid="agency-storefront"
      className="mt-6 w-full max-w-2xl rounded-2xl border border-border bg-card p-5 text-left shadow-sm"
    >
      {about && (
        <div className="mb-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            {t('agency.storefrontAbout')}
          </h2>
          <p className="mt-1 text-foreground">{about}</p>
        </div>
      )}

      <dl className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
        {(storefront.languages?.length ?? 0) > 0 && (
          <div>
            <dt className="font-medium text-muted-foreground">{t('agency.storefrontLanguages')}</dt>
            <dd>
              {storefront.languages!
                .map((code) => t(`languageNames.${code}`, { defaultValue: code.toUpperCase() }))
                .join(' · ')}
            </dd>
          </div>
        )}
        <div>
          <dt className="sr-only">{t('agency.storefrontLiveTrips', { count: storefront.liveTripCount ?? 0 })}</dt>
          <dd>
            {(storefront.liveTripCount ?? 0) === 1
              ? t('agency.storefrontLiveTripOne')
              : t('agency.storefrontLiveTrips', { count: storefront.liveTripCount ?? 0 })}
          </dd>
        </div>
        {storefront.medianResponseTimeHours != null && (
          <div>
            <dd>{t('agency.storefrontResponseTime', { hours: storefront.medianResponseTimeHours })}</dd>
          </div>
        )}
        {aggregate && (
          <div>
            <dd>
              {aggregate.average != null
                ? t('agency.storefrontReviewsAverage', {
                    average: aggregate.average,
                    count: aggregate.count,
                  })
                : t('agency.storefrontReviews', { count: aggregate.count })}
            </dd>
          </div>
        )}
      </dl>

      {shareUrl && (
        <div className="mt-4 flex items-center gap-4">
          {qrDataUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={qrDataUrl}
              alt={t('agency.storefrontQrAlt')}
              width={96}
              height={96}
              className="rounded-lg border border-border"
              data-testid="agency-storefront-qr"
            />
          )}
          <div className="min-w-0">
            <p className="text-sm font-medium">{t('agency.storefrontShare')}</p>
            <p className="truncate text-sm text-muted-foreground" dir="ltr">
              {shareUrl}
            </p>
            <button
              type="button"
              onClick={copyLink}
              className="mt-2 rounded-full bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground"
            >
              {copied ? t('agency.storefrontCopied') : t('agency.storefrontCopyLink')}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
