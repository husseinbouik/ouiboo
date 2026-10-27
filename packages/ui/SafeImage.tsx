'use client';

import React, { useState } from 'react';
import Image, { type ImageProps } from 'next/image';
import { Logo } from './Logo';
import { cn } from './utils';

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
 */
export interface SafeImageProps extends Omit<ImageProps, 'onError'> {
  /** Classes for the fallback box (e.g. sizing for non-fill usages). */
  fallbackClassName?: string;
}

export function SafeImage({
  src,
  alt,
  className,
  fill,
  fallbackClassName,
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

  return (
    <Image
      src={src}
      alt={alt}
      className={className}
      fill={fill}
      onError={() => setFailedSrc(src)}
      {...rest}
    />
  );
}

SafeImage.displayName = 'SafeImage';
