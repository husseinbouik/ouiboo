'use client';

import React, { useState } from 'react';
import Image, { type ImageProps } from 'next/image';
import { Logo } from './Logo';
import { cn } from './utils';
import { resolveBlurDataURL } from './blur-placeholder';

/**
 * Council Session #3 P0-2 (#550): trip image with a branded failure
 * state. Before this component, every image surface rendered a bare
 * next/image with no onError handling — a single failed load (dead URL,
 * optimizer failure, flaky network) left a permanent blank white void
 * on the traveller card carousel, the trip gallery and the agency
 * list/hero. SafeImage swaps a failed (or missing) source for a palette
 * fallback carrying the brand mark, so an image failure degrades to a
 * branded placeholder instead of a broken-looking page.
 *
 * The failure is tracked per source value: when `src` changes (e.g.
 * the carousel advances), a previously failed different source does not
 * suppress the new one.
 *
 * #486: blur-up placeholder. Unless the caller opts out
 * (`blur={false}`), the image renders with next/image
 * `placeholder="blur"` and a blurDataURL resolved by
 * `resolveBlurDataURL` — the stored per-image placeholder when the
 * caller passes one (`blurDataURL` prop), otherwise the built-in
 * brand-palette placeholder. Existing media without a stored
 * placeholder therefore still blurs up instead of popping in.
 */
export interface SafeImageProps extends Omit<ImageProps, 'onError'> {
  /** Classes for the fallback box (e.g. sizing for non-fill usages). */
  fallbackClassName?: string;
  /**
   * #486: stored blur placeholder for this image (data-URL). When
   * omitted, the built-in palette placeholder is used. Ignored when
   * `blur` is false.
   */
  blurDataURL?: string;
  /** #486: set false to disable the blur-up placeholder entirely. */
  blur?: boolean;
}

export function SafeImage({
  src,
  alt,
  className,
  fill,
  fallbackClassName,
  blurDataURL,
  blur = true,
  placeholder,
  style,
  ...rest
}: SafeImageProps) {
  const [failedSrc, setFailedSrc] = useState<ImageProps['src'] | null>(null);
  const failed = !src || failedSrc === src;

  if (failed) {
    return (
      <div
        role="img"
        aria-label={typeof alt === 'string' ? alt : undefined}
        data-safe-image-fallback="true"
        style={style}
        className={cn(
          'bg-sand flex items-center justify-center overflow-hidden',
          fill && 'absolute inset-0',
          fallbackClassName,
        )}
      >
        <Logo size={44} className="opacity-60" aria-hidden="true" />
      </div>
    );
  }

  // #488: `style` (which may carry a viewTransitionName) is forwarded so
  // the card cover and the detail hero can be paired as one shared
  // element; #486: blur-up is on unless explicitly disabled or the
  // caller already chose a placeholder mode.
  const useBlur = blur && !placeholder;

  return (
    <Image
      src={src}
      alt={alt}
      className={className}
      fill={fill}
      style={style}
      {...(useBlur
        ? {
            placeholder: 'blur' as const,
            blurDataURL: resolveBlurDataURL(blurDataURL),
          }
        : { placeholder })}
      onError={() => setFailedSrc(src)}
      {...rest}
    />
  );
}

SafeImage.displayName = 'SafeImage';
