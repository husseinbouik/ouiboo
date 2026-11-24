'use client'

import { motion } from 'framer-motion'
import type { CSSProperties, ReactNode } from 'react'
import { MOTION_TOKENS } from '@ouiboo/tokens'

/**
 * Design Council 2026-11-24, M3: ONE shared scroll-reveal system for
 * the landing app (home + /agences). A quiet fade + 16px rise over the
 * shared `slower` motion token (500ms) on the traveller-home ease
 * curve, fired once when the element enters the viewport. Groups
 * stagger by passing an incremental `delay` (80ms steps).
 *
 * Reduced motion: the landing Providers wrap the app in
 * `MotionConfig reducedMotion="user"`, so framer-motion drops the
 * transform/opacity animation for visitors who ask for it, and the
 * shared tokens.css kill-switch covers the CSS side.
 */
const DURATION_S = parseFloat(MOTION_TOKENS.durations.slower) / 1000
const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1]
export const REVEAL_STAGGER_S = 0.08

/** Spread onto any motion.* element for the standard scroll reveal. */
export function scrollReveal(delay = 0) {
  return {
    initial: { opacity: 0, y: 16 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, margin: '-80px' },
    transition: { duration: DURATION_S, ease: EASE, delay },
  } as const
}

/** Hero entrance: container + item variants for the on-load stagger. */
export const heroStagger = {
  hidden: {},
  show: { transition: { staggerChildren: REVEAL_STAGGER_S } },
} as const

export const heroItem = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: DURATION_S, ease: EASE } },
} as const

export default function Reveal({
  children,
  delay = 0,
  className,
  style,
}: {
  children: ReactNode
  delay?: number
  className?: string
  style?: CSSProperties
}) {
  return (
    <motion.div {...scrollReveal(delay)} className={className} style={style}>
      {children}
    </motion.div>
  )
}
