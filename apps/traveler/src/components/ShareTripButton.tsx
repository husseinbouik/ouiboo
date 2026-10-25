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
 * #468: share a trip. On devices with the Web Share API (mobile — the
 * sheet is also the only route to Instagram, which has no web share
 * intent) the button opens the native share sheet directly; everywhere
 * else it opens a menu with WhatsApp / Facebook / X / Telegram intents
 * and a copy-link action with visible confirmation.
 */
export default function ShareTripButton({
  tripId,
  tripTitle,
  className,
}: {
  tripId: string;
  tripTitle: string;
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
        className={className}
        onClick={() => void handleNativeShare()}
        aria-label={t('share.button')}
      >
        <Share2 className="h-4 w-4 me-2" />
        {t('share.button')}
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="outline" className={className} aria-label={t('share.button')}>
          <Share2 className="h-4 w-4 me-2" />
          {t('share.button')}
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
