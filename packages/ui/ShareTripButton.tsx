'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Check, Link2, Share2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  buildSharePayload,
  canUseNativeShare,
  copyShareLink,
  getShareTargets,
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
 */
export function ShareTripButton({
  tripId,
  tripTitle,
  travelerBaseUrl,
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

  const payload = buildSharePayload({
    travelerBaseUrl,
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
