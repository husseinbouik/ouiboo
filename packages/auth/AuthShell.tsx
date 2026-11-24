'use client';

/**
 * Split-screen auth shell (#1023, finding D2).
 *
 * The forgot/reset pages in traveler and agency each inlined the
 * same split-screen skeleton — image panel with wordmark and side
 * copy on one side, an animated form column on the other — with only
 * the panel side, background, image and accent differing. This shell
 * owns that skeleton once; each app passes its panel configuration
 * and renders the (also shared) form as children.
 *
 * Login/signup are deliberately NOT on this shell: their Phase 2/4
 * council redesigns diverged (traveler's navy identity card vs
 * agency's split screen) and their behaviour differs (#857 role
 * gate, #982 restored-user bounce) — see the #1023 PR notes.
 */
import Image from 'next/image';
import { motion } from 'framer-motion';
import type { ReactNode } from 'react';

export interface AuthShellProps {
  /** Which side the image panel sits on. Traveler: 'left', agency: 'right'. */
  panelSide?: 'left' | 'right';
  /** Panel background classes (e.g. 'bg-deep-blue', 'bg-primary'). */
  panelClassName: string;
  imageSrc: string;
  imageAlt: string;
  /** Image opacity classes (e.g. 'opacity-60', 'opacity-40'). */
  imageOpacityClassName?: string;
  /** The app's side wordmark element (each app keeps its own component). */
  wordmark: ReactNode;
  sideTitle: string;
  sideSubtitle: string;
  children: ReactNode;
}

export function AuthShell({
  panelSide = 'left',
  panelClassName,
  imageSrc,
  imageAlt,
  imageOpacityClassName = 'opacity-60',
  wordmark,
  sideTitle,
  sideSubtitle,
  children,
}: AuthShellProps) {
  const panel = (
    <div className={`hidden lg:flex lg:w-1/2 relative overflow-hidden ${panelClassName}`}>
      <motion.div
        initial={{ scale: 1.1, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 1.5 }}
        className="absolute inset-0"
      >
        <Image
          src={imageSrc}
          alt={imageAlt}
          className={`w-full h-full object-cover ${imageOpacityClassName}`}
          fill
          sizes="50vw"
        />
      </motion.div>
      <div className="relative z-10 flex flex-col justify-between p-12 text-white w-full h-full">
        {wordmark}
        <div className="mb-12 space-y-4">
          <h2 className="text-4xl font-bold leading-tight">{sideTitle}</h2>
          <p className="text-lg text-gray-200 max-w-md">{sideSubtitle}</p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex bg-background">
      {panelSide === 'left' ? panel : null}
      <div className="flex-1 flex items-center justify-center p-8 lg:p-12">
        <motion.div
          initial={{ opacity: 0, x: panelSide === 'left' ? 20 : -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
          className="w-full max-w-md space-y-8"
        >
          {children}
        </motion.div>
      </div>
      {panelSide === 'right' ? panel : null}
    </div>
  );
}
