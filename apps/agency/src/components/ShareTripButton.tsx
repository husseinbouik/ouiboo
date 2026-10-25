'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Check, Link2, Share2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@ouiboo/ui';
import {
  buildSharePayload,
  canUseNativeShare,
  copyShareLink,
  getShareTargets,
  type ShareTargetId,
} from '@ouiboo/utils';
import { TRAVELER_URL } from '@/lib/site';

const TARGET_LABEL_KEYS: Record<ShareTargetId, string> = {
  whatsapp: 'share.whatsapp',
  facebook: 'share.facebook',
  x: 'share.x',
  telegram: 'share.telegram',
};

/**
 * #468: share one of the agency's own trips. Always links to the public
 * traveller-facing trip URL (never the dashboard URL). On devices with
 * the Web Share API the button opens the native share sheet directly
 * (also the only route to Instagram, which has no web share intent);
 * everywhere else it opens a menu with WhatsApp / Facebook / X /
 * Telegram intents and a copy-link action with visible confirmation.
 */
export default function ShareTripButton({
  tripId,
  tripTitle,
  iconOnly = false,
  className,
}: {
  tripId: string;
  tripTitle: string;
  iconOnly?: boolean;
  className?: string;
}) {
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
    travelerBaseUrl: TRAVELER_URL,
    tripId,
    tripTitle,
    textTemplate: t('share.text'),
    source: 'agency-share',
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

  if (nativeShare) {
    return (
      <Button
        type="button"
        variant="outline"
        size="sm"
        className={className}
        onClick={() => void handleNativeShare()}
        aria-label={t('share.button')}
      >
        <Share2 className="h-4 w-4" />
        {!iconOnly && <span className="ms-2">{t('share.button')}</span>}
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={className}
          aria-label={t('share.button')}
        >
          <Share2 className="h-4 w-4" />
          {!iconOnly && <span className="ms-2">{t('share.button')}</span>}
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
