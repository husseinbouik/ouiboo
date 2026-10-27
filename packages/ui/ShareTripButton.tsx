'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Check, Link2, Share2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  buildSharePayload,
  canUseNativeShare,
  copyShareLink,
  getShareTargets,
  isSharingEnabled,
  resolveShareBaseUrl,
  type ShareTargetId,
} from '@ouiboo/utils';
import { Button } from './Button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './DropdownMenu';

const TARGET_LABEL_KEYS: Record<ShareTargetId, string> = {
  whatsapp: 'share.whatsapp',
  facebook: 'share.facebook',
  x: 'share.x',
  telegram: 'share.telegram',
};

export interface ShareTripButtonProps {
  tripId: string;
  tripTitle: string;
  /** Origin of the traveller app — the share link always points there. */
  travelerBaseUrl: string;
  /**
   * #468: may the page's own origin replace a missing/loopback
   * travelerBaseUrl? Set ONLY by the traveller app — it serves the public
   * trip pages, so its origin is the share target's origin. The agency app
   * leaves this off: with no public base configured it renders nothing
   * rather than sharing a localhost (or agency-origin) link.
   */
  allowRuntimeOriginFallback?: boolean;
  /**
   * #561 (Council S3 P1-3): when sharing is gated off, render a disabled
   * share affordance with "sharing opens at public launch" copy instead
   * of nothing. Opt-in per surface: the agency app sets it for signed-in
   * agency users (a fully built feature must be discoverable); surfaces
   * that leave it off keep the B12 render-nothing behaviour exactly.
   */
  showDisabledWhenOff?: boolean;
  /** Value of the `src` parameter on the shared URL (attribution). */
  source?: string;
  iconOnly?: boolean;
  size?: 'default' | 'sm';
  className?: string;
}

/**
 * #468: share a trip via its public traveller-facing URL. On devices with
 * the Web Share API the button opens the native share sheet directly (the
 * sheet is also the only route to Instagram, which has no web share
 * intent); everywhere else it opens a menu with WhatsApp / Facebook / X /
 * Telegram intents and a copy-link action with visible confirmation.
 * Shared by the traveller and agency apps — the apps only supply their
 * base URL and share source.
 *
 * Council B12: sharing is gated OFF by default for the closed beta
 * (NEXT_PUBLIC_SHARING_ENABLED, see isSharingEnabled in @ouiboo/utils) —
 * the button renders nothing in either app until the flag is set to
 * 'true' deliberately at public launch.
 */
export function ShareTripButton({
  tripId,
  tripTitle,
  travelerBaseUrl,
  allowRuntimeOriginFallback = false,
  showDisabledWhenOff = false,
  source,
  iconOnly = false,
  size = 'default',
  className,
}: ShareTripButtonProps) {
  const { t } = useTranslation();
  const [nativeShare, setNativeShare] = useState(false);
  const [copied, setCopied] = useState(false);
  const copiedTimer = useRef<number | null>(null);

  // Detect after mount: navigator does not exist during SSR, and picking
  // the variant on first client render would cause a hydration mismatch.
  useEffect(() => {
    setNativeShare(canUseNativeShare());
  }, []);

  useEffect(
    () => () => {
      if (copiedTimer.current) window.clearTimeout(copiedTimer.current);
    },
    [],
  );

  // Council B12 gate (after hooks, per the rules of hooks): no share
  // affordance at all while sharing is disabled — unless the surface
  // opted into the #561 disabled state, which explains the gate instead
  // of hiding the feature.
  if (!isSharingEnabled()) {
    if (!showDisabledWhenOff) {
      return null;
    }
    if (iconOnly) {
      return (
        <Button
          type="button"
          variant="outline"
          size={size}
          className={className}
          disabled
          aria-disabled="true"
          title={t('share.opensAtLaunch')}
          aria-label={t('share.opensAtLaunch')}
        >
          <Share2 className="h-4 w-4" />
        </Button>
      );
    }
    return (
      <span className="inline-flex flex-col gap-1">
        <Button
          type="button"
          variant="outline"
          size={size}
          className={className}
          disabled
          aria-disabled="true"
          aria-label={t('share.opensAtLaunch')}
        >
          <Share2 className="h-4 w-4" />
          <span className="ms-2">{t('share.button')}</span>
        </Button>
        <span className="text-xs text-muted-foreground">{t('share.opensAtLaunch')}</span>
      </span>
    );
  }

  // #468: resolve the share base so a deployed build can never emit a
  // localhost link (both apps default NEXT_PUBLIC_TRAVELER_URL to a
  // loopback URL, and the variable was missing on the staging projects).
  // No safe public base -> no share action at all.
  const shareBaseUrl = resolveShareBaseUrl(travelerBaseUrl, {
    runtimeOrigin: typeof window !== 'undefined' ? window.location.origin : undefined,
    allowRuntimeOriginFallback,
  });
  if (shareBaseUrl === null) {
    return null;
  }

  const payload = buildSharePayload({
    travelerBaseUrl: shareBaseUrl,
    tripId,
    tripTitle,
    textTemplate: t('share.text'),
    source,
  });

  const handleNativeShare = async () => {
    try {
      await navigator.share({ title: tripTitle, text: payload.text, url: payload.url });
    } catch {
      // AbortError (user dismissed the sheet) and share failures both
      // end here: the button simply does nothing visible.
    }
  };

  const handleCopy = async () => {
    const ok = await copyShareLink(payload.url);
    if (!ok) return;
    setCopied(true);
    if (copiedTimer.current) window.clearTimeout(copiedTimer.current);
    copiedTimer.current = window.setTimeout(() => setCopied(false), 2000);
  };

  const label = (
    <>
      <Share2 className="h-4 w-4" />
      {!iconOnly && <span className="ms-2">{t('share.button')}</span>}
    </>
  );

  if (nativeShare) {
    return (
      <Button
        type="button"
        variant="outline"
        size={size}
        className={className}
        onClick={() => void handleNativeShare()}
        aria-label={t('share.button')}
      >
        {label}
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size={size}
          className={className}
          aria-label={t('share.button')}
        >
          {label}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-52">
        {getShareTargets(payload).map((target) => (
          <DropdownMenuItem key={target.id} asChild>
            <a href={target.intentUrl} target="_blank" rel="noopener noreferrer">
              {t(TARGET_LABEL_KEYS[target.id])}
            </a>
          </DropdownMenuItem>
        ))}
        <DropdownMenuItem
          onSelect={(event) => {
            // Keep the menu open so the "copied" confirmation is visible.
            event.preventDefault();
            void handleCopy();
          }}
        >
          {copied ? (
            <Check className="h-4 w-4 me-2 text-emerald-500" />
          ) : (
            <Link2 className="h-4 w-4 me-2" />
          )}
          {copied ? t('share.copied') : t('share.copyLink')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
