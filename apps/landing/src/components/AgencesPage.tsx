'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import Reveal, { heroItem, heroStagger, REVEAL_STAGGER_S } from './Reveal'
import SiteHeader from './SiteHeader'
import SiteFooter from './SiteFooter'

// #749 (Council S11 §4 + founder decisions 2026-10-31): the dedicated
// agency page — the forwardable, findable artefact of the beta's only
// funnel. MVP thickness, seven sections: navy hero (the deal + the
// founder named + a WhatsApp conversation as the primary action — no
// form before a human conversation), the 3-document stepper, the money
// story with the post-beta guarantee in writing, Example-labelled
// proof artefacts, owner-voice objections, the honesty panel, and a
// final WhatsApp CTA with sign-up demoted to a quiet text link.
// FR authored first; AR mirrors (RTL verified); EN follows.
// Claims discipline (S11): no first/only, no audience-size claims, no
// 48-hour promise anywhere — verification is "checked before listing"
// (founder declined to underwrite an SLA), "verified" never bare.
// No founder photo exists on file: an initials mark stands in; the
// photo is founder-hands-later, never a stock/AI face.

const NAVY = '#0A192F'
const ORANGE = '#FF6B35'

// The founder's own number — the same one already published as the
// staging traveller support contact; the /agences CTA is a personal
// recruitment conversation, so it goes to the same place.
const WHATSAPP_NUMBER = '212632718980'
const FOUNDER_NAME = 'Hussein Bouik'
const FOUNDER_INITIALS = 'HB'

// Conversion events, fired in the landing's existing analytics
// convention: pushes onto window.dataLayer (the gtag bootstrap array
// AnalyticsConsent initialises when a GA id is configured). The events
// are recorded on the array whether or not an id is set, so the
// funnel is measurable the moment analytics is switched on — and the
// beta KPI (contacted agencies reaching verification) can count
// whatsapp_click per source tag.
function trackEvent(event: string, params: Record<string, string>) {
  if (typeof window === 'undefined') return
  const w = window as unknown as { dataLayer?: unknown[] }
  w.dataLayer = w.dataLayer || []
  w.dataLayer.push({ event, ...params })
}

function ShieldCheck({ className = 'h-[19px] w-[19px]' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M12 3l7 2.6v5.2c0 4.6-3 7.7-7 9.2-4-1.5-7-4.6-7-9.2V5.6L12 3z" fill={ORANGE} />
      <path d="M9 11.6l2.1 2.1 4-4.2" stroke={NAVY} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function Arrow() {
  return (
    <span aria-hidden="true" className="inline-block rtl:-scale-x-100">
      →
    </span>
  )
}

function WhatsAppGlyph({ className = 'h-[20px] w-[20px]' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38a9.9 9.9 0 0 0 4.79 1.22c5.46 0 9.9-4.45 9.9-9.91C23.94 6.45 17.5 2 12.04 2zm0 18.13a8.2 8.2 0 0 1-4.19-1.15l-.3-.18-3.12.82.83-3.04-.19-.31a8.2 8.2 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.25-8.24a8.2 8.2 0 0 1 8.24 8.24c0 4.54-3.7 8.24-8.25 8.24zm4.52-6.16c-.25-.13-1.47-.72-1.69-.8-.23-.09-.39-.13-.56.12-.16.25-.64.8-.78.97-.14.16-.29.18-.54.06-.25-.13-1.05-.39-1.99-1.23-.74-.66-1.23-1.47-1.38-1.72-.14-.25-.01-.38.11-.51.11-.11.25-.29.37-.43.12-.15.16-.25.25-.41.08-.17.04-.31-.02-.43-.06-.13-.56-1.35-.77-1.84-.2-.48-.41-.42-.56-.43h-.48c-.17 0-.43.06-.66.25-.22.25-.86.85-.86 2.07 0 1.22.89 2.4 1.01 2.56.13.17 1.75 2.67 4.23 3.74.59.26 1.05.41 1.41.52.6.19 1.13.16 1.56.1.48-.07 1.47-.58 1.74-1.16.27-.58.27-1.07.19-1.17-.08-.1-.23-.16-.48-.29z" />
    </svg>
  )
}

// Deterministic decorative QR-style pattern for the Example Booking
// Pass artefact — an illustration, not a scannable code.
function QrPattern() {
  const cells = [
    1, 1, 1, 0, 1, 0, 1, 1, 1,
    1, 0, 1, 0, 0, 1, 1, 0, 1,
    1, 1, 1, 0, 1, 1, 0, 1, 0,
    0, 0, 0, 1, 0, 0, 1, 0, 1,
    1, 0, 1, 1, 1, 0, 0, 1, 0,
    0, 1, 0, 0, 1, 1, 1, 0, 1,
    1, 0, 1, 0, 0, 1, 0, 1, 1,
    0, 1, 0, 1, 1, 0, 1, 0, 0,
    1, 1, 0, 0, 1, 0, 1, 1, 1,
  ]
  return (
    <svg viewBox="0 0 90 90" className="h-[92px] w-[92px]" aria-hidden="true" role="presentation">
      <rect width="90" height="90" fill="#ffffff" />
      {cells.map((on, i) => {
        const x = (i % 9) * 10
        const y = Math.floor(i / 9) * 10
        return on ? <rect key={i} x={x} y={y} width="10" height="10" fill={NAVY} /> : null
      })}
    </svg>
  )
}

export default function AgencesPage() {
  const { t, i18n } = useTranslation()
  const currentLang = i18n.language
  const isRTL = currentLang === 'ar'
  const agencyUrl = process.env.NEXT_PUBLIC_AGENCY_URL || 'http://localhost:3002'
  const supportEmail = process.env.NEXT_PUBLIC_SUPPORT_EMAIL || 'ouibouuu@gmail.com'

  useEffect(() => {
    document.documentElement.lang = currentLang
    document.documentElement.dir = isRTL ? 'rtl' : 'ltr'
    trackEvent('agences_view', { page: 'agences', source: 'agences', lang: currentLang })
  }, [currentLang, isRTL])

  const whatsappHref = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
    t('hw.agencesPage.hero.whatsappMessage'),
  )}`

  const whatsappCta = (placement: string, className: string) => (
    <a
      href={whatsappHref}
      target="_blank"
      rel="noreferrer"
      onClick={() => trackEvent('whatsapp_click', { source: 'agences', placement, lang: currentLang })}
      className={className}
      style={{ backgroundColor: ORANGE }}
    >
      <WhatsAppGlyph />
      {t('hw.agencesPage.hero.ctaWhatsapp')}
    </a>
  )

  const qaKeys = ['exclusive', 'leave', 'client', 'cancel', 'provide', 'golive', 'french', 'computer'] as const
  const honestyItems = t('hw.agencesPage.honesty.items', { returnObjects: true }) as string[]

  return (
    <div className="hw-root font-sans" style={{ backgroundColor: 'var(--hw-page)', color: 'var(--hw-ink)' }}>
      {/* ---------- Hero (navy, agency palette leadership) ---------- */}
      <section className="relative overflow-hidden text-white" style={{ backgroundColor: NAVY }}>
        {/* Header: the ONE shared landing header (Council surface 3,
            Option A) — identical spec to the home page's. */}
        <SiteHeader contextAction="home" anchorBase="/" className="relative z-20" />

        <motion.div
          className="relative z-[2] mx-auto max-w-[1200px] px-6 pb-[72px] pt-[38px] max-sm:pb-14"
          variants={heroStagger}
          initial="hidden"
          animate="show"
        >
          <motion.div variants={heroItem} className="text-xs font-bold uppercase tracking-[0.16em]" style={{ color: ORANGE }}>
            {t('hw.agencesPage.hero.eyebrow')}
          </motion.div>
          <motion.h1 variants={heroItem} className="mb-5 mt-4 max-w-[760px] text-[clamp(2rem,4.4vw,3.2rem)] font-extrabold leading-[1.12] tracking-[-0.015em]">
            {t('hw.agencesPage.hero.titleA')}
            <br />
            {t('hw.agencesPage.hero.titleB')}
            <br />
            <span style={{ color: ORANGE }}>{t('hw.agencesPage.hero.titleC')}</span>
          </motion.h1>
          <motion.p variants={heroItem} className="max-w-[640px] text-[clamp(1.02rem,1.6vw,1.2rem)] leading-[1.6] text-white/[0.88]">
            {t('hw.agencesPage.hero.lead')}
          </motion.p>

          <motion.div variants={heroItem} className="mt-9 flex flex-wrap items-start gap-x-10 gap-y-8">
            <div className="flex items-start gap-4">
              <span
                className="flex h-[54px] w-[54px] shrink-0 items-center justify-center rounded-full font-display text-[17px] font-extrabold text-white ring-2 ring-white/25"
                style={{ backgroundColor: '#10233F' }}
                aria-hidden="true"
              >
                {FOUNDER_INITIALS}
              </span>
              <span>
                <span className="block text-[17px] font-bold leading-tight">{FOUNDER_NAME}</span>
                <span className="block text-[14px] leading-tight text-white/[0.7]">{t('hw.agencesPage.hero.founderRole')}</span>
                <span className="mt-2 block max-w-[380px] text-[14.5px] leading-[1.55] text-white/[0.85]">
                  {t('hw.agencesPage.hero.founderLine')}
                </span>
              </span>
            </div>
            <div>
              {whatsappCta(
                'hero',
                'inline-flex items-center gap-2.5 whitespace-nowrap rounded-full px-[26px] py-[14px] text-[15.5px] font-semibold text-deep-blue shadow-[0_10px_24px_-8px_rgba(255,107,53,.55)] max-sm:px-5 max-sm:text-[14.5px]',
              )}
              <span className="mt-3 block text-[14px] font-medium text-white/[0.75]">
                {t('hw.agencesPage.hero.ctaNote')}
              </span>
            </div>
          </motion.div>
        </motion.div>
      </section>

      <main id="main-content" tabIndex={-1}>
        {/* ---------- 2 · How it starts ---------- */}
        <section className="py-[92px] max-sm:py-16" style={{ backgroundColor: 'var(--hw-sand)' }}>
          <div className="mx-auto max-w-[1200px] px-6">
            <Reveal className="mb-11 max-w-[720px]">
              <div className="text-xs font-bold uppercase tracking-[0.16em]" style={{ color: 'var(--hw-accent)' }}>
                {t('hw.agencesPage.steps.eyebrow')}
              </div>
              <h2 className="mb-3 mt-3 text-[clamp(1.7rem,3.2vw,2.35rem)] font-extrabold leading-[1.15] tracking-[-0.015em]" style={{ color: 'var(--hw-heading)' }}>
                {t('hw.agencesPage.steps.title')}
              </h2>
              <p className="text-[16.5px]" style={{ color: 'var(--hw-muted)' }}>
                {t('hw.agencesPage.steps.intro')}
              </p>
            </Reveal>
            <div className="grid grid-cols-1 gap-10 lg:grid-cols-3 lg:gap-[26px]">
              {(['step1', 'step2', 'step3'] as const).map((step, i) => (
                <Reveal key={step} delay={i * REVEAL_STAGGER_S} className="relative">
                  <span
                    className="flex h-[46px] w-[46px] items-center justify-center rounded-full font-display text-[19px] font-extrabold text-deep-blue shadow-[0_8px_18px_-6px_rgba(255,107,53,.5)]"
                    style={{ backgroundColor: ORANGE }}
                    aria-hidden="true"
                  >
                    {i + 1}
                  </span>
                  <h3 className="mb-[6px] mt-4 text-[18.5px] font-bold" style={{ color: 'var(--hw-heading)' }}>
                    {t(`hw.agencesPage.steps.${step}.title`)}
                  </h3>
                  <p className="max-w-[420px] text-[15.5px] leading-[1.6]" style={{ color: 'var(--hw-muted)' }}>
                    {t(`hw.agencesPage.steps.${step}.text`)}
                  </p>
                </Reveal>
              ))}
            </div>
            <div className="mt-11">
              <span
                className="inline-flex items-center gap-[9px] rounded-full border px-[18px] py-[11px] text-[14.5px] font-semibold"
                style={{ backgroundColor: 'var(--hw-card)', borderColor: 'var(--hw-line)', color: 'var(--hw-heading)' }}
              >
                <ShieldCheck className="h-[18px] w-[18px]" />
                {t('hw.agencesPage.steps.chip')}
              </span>
            </div>
          </div>
        </section>

        {/* ---------- 3 · Money ---------- */}
        <section className="py-[92px] max-sm:py-16">
          <div className="mx-auto max-w-[1200px] px-6">
            <Reveal className="mb-11 max-w-[720px]">
              <div className="text-xs font-bold uppercase tracking-[0.16em]" style={{ color: 'var(--hw-accent)' }}>
                {t('hw.agencesPage.money.eyebrow')}
              </div>
              <h2 className="mb-3 mt-3 text-[clamp(1.7rem,3.2vw,2.35rem)] font-extrabold leading-[1.15] tracking-[-0.015em]" style={{ color: 'var(--hw-heading)' }}>
                {t('hw.agencesPage.money.title')}
              </h2>
            </Reveal>
            {/* Council Option A: the money story as a formal
                payment-record panel — the same facts the three cards
                carried (paid directly, nothing through Ouiboo, 0 MAD
                today), presented as one worked example an agency can
                screenshot and share internally. The written fee
                guarantee below it stays verbatim. */}
            <Reveal className="max-w-[880px] rounded-[20px] border p-[28px_28px_24px]" style={{ backgroundColor: 'var(--hw-record)', borderColor: 'var(--hw-record-border)' }}>
              <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
                <span className="font-display text-[16px] font-bold" style={{ color: 'var(--hw-heading)' }}>
                  {t('hw.agencesPage.money.panel.title')}
                </span>
                <span
                  className="rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide"
                  style={{ backgroundColor: 'var(--hw-sand)', color: 'var(--hw-heading)' }}
                >
                  {t('hw.agencesPage.money.panel.chip')}
                </span>
              </div>
              {(
                [
                  ['totalLabel', 'totalValue'],
                  ['depositLabel', 'depositValue'],
                  ['balanceLabel', 'balanceValue'],
                  ['throughLabel', 'throughValue'],
                  ['feeLabel', 'feeValue'],
                ] as const
              ).map(([label, value]) => (
                <div
                  key={label}
                  className="flex items-baseline justify-between gap-6 border-b border-dashed py-[11px] text-[14.5px] last:border-b-0"
                  style={{ borderColor: 'var(--hw-line)', color: 'var(--hw-ink)' }}
                >
                  <span>{t(`hw.agencesPage.money.panel.${label}`)}</span>
                  <b className="whitespace-nowrap" style={{ color: 'var(--hw-heading)' }}>
                    {t(`hw.agencesPage.money.panel.${value}`)}
                  </b>
                </div>
              ))}
              <p className="mt-4 max-w-[820px] text-[15px] leading-[1.65]" style={{ color: 'var(--hw-muted)' }}>
                <b style={{ color: 'var(--hw-heading)' }}>{t('hw.agencesPage.money.guaranteeTitle')}:</b>{' '}
                {t('hw.agencesPage.money.guarantee')}
              </p>
            </Reveal>
          </div>
        </section>

        {/* ---------- 4 · Proof (Example artefacts) ---------- */}
        <section className="py-[92px] max-sm:py-16" style={{ backgroundColor: 'var(--hw-sand)' }}>
          <div className="mx-auto max-w-[1200px] px-6">
            <Reveal className="mb-11 max-w-[720px]">
              <div className="text-xs font-bold uppercase tracking-[0.16em]" style={{ color: 'var(--hw-accent)' }}>
                {t('hw.agencesPage.proof.eyebrow')}
              </div>
              <h2 className="mb-3 mt-3 text-[clamp(1.7rem,3.2vw,2.35rem)] font-extrabold leading-[1.15] tracking-[-0.015em]" style={{ color: 'var(--hw-heading)' }}>
                {t('hw.agencesPage.proof.title')}
              </h2>
              <p className="text-[16.5px]" style={{ color: 'var(--hw-muted)' }}>
                {t('hw.agencesPage.proof.intro')}
              </p>
            </Reveal>
            <div className="grid grid-cols-1 items-start gap-[26px] lg:grid-cols-2">
              {/* Verification record artefact */}
              <Reveal className="rounded-[20px] border p-[28px_28px_24px]" style={{ backgroundColor: 'var(--hw-record)', borderColor: 'var(--hw-record-border)' }}>
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <span className="font-display text-[15px] font-bold" style={{ color: 'var(--hw-heading)' }}>
                    {t('hw.agencesPage.proof.recordTitle')}
                  </span>
                  <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold uppercase tracking-wide text-amber-900">
                    {t('hw.agencesPage.proof.exampleChip')}
                  </span>
                </div>
                <div className="flex flex-col gap-[11px] text-[15px] leading-[1.6]" style={{ color: 'var(--hw-muted)' }}>
                  <div>
                    <b className="font-semibold" style={{ color: 'var(--hw-heading)' }}>
                      {t('hw.agencesPage.proof.recordLicenceLabel')}
                    </b>{' '}
                    — {t('hw.agencesPage.proof.recordLicence')}
                  </div>
                  <div>
                    <b className="font-semibold" style={{ color: 'var(--hw-heading)' }}>
                      {t('hw.agencesPage.proof.recordInsuranceLabel')}
                    </b>{' '}
                    — {t('hw.agencesPage.proof.recordInsurance')}
                  </div>
                  <div className="mt-[3px] border-t pt-[11px] text-sm" style={{ borderColor: 'var(--hw-line)' }}>
                    {t('hw.agencesPage.proof.recordNote')}
                  </div>
                </div>
              </Reveal>

              {/* Booking Pass + storefront artefact */}
              <Reveal delay={REVEAL_STAGGER_S} className="rounded-[20px] border p-[28px_28px_24px]" style={{ backgroundColor: 'var(--hw-card)', borderColor: 'var(--hw-line)' }}>
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <span className="font-display text-[15px] font-bold" style={{ color: 'var(--hw-heading)' }}>
                    {t('hw.agencesPage.proof.passTitle')}
                  </span>
                  <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold uppercase tracking-wide text-amber-900">
                    {t('hw.agencesPage.proof.exampleChip')}
                  </span>
                </div>
                <div className="flex flex-wrap items-start gap-6">
                  <div className="rounded-[14px] border p-3" style={{ borderColor: 'var(--hw-line)', backgroundColor: '#ffffff' }}>
                    <QrPattern />
                  </div>
                  <p className="max-w-[300px] text-[15px] leading-[1.6]" style={{ color: 'var(--hw-muted)' }}>
                    {t('hw.agencesPage.proof.passText')}
                  </p>
                </div>
                <div className="mt-6 border-t pt-5" style={{ borderColor: 'var(--hw-line)' }}>
                  <h3 className="mb-[6px] text-[16.5px] font-bold" style={{ color: 'var(--hw-heading)' }}>
                    {t('hw.agencesPage.proof.storefrontTitle')}
                  </h3>
                  <p className="text-[15px] leading-[1.6]" style={{ color: 'var(--hw-muted)' }}>
                    {t('hw.agencesPage.proof.storefrontText')}
                  </p>
                </div>
              </Reveal>
            </div>
          </div>
        </section>

        {/* ---------- 5 · Objections Q&A ---------- */}
        <section className="py-[92px] max-sm:py-16">
          <div className="mx-auto max-w-[1200px] px-6">
            <Reveal className="mb-11 max-w-[720px]">
              <div className="text-xs font-bold uppercase tracking-[0.16em]" style={{ color: 'var(--hw-accent)' }}>
                {t('hw.agencesPage.qa.eyebrow')}
              </div>
              <h2 className="mb-3 mt-3 text-[clamp(1.7rem,3.2vw,2.35rem)] font-extrabold leading-[1.15] tracking-[-0.015em]" style={{ color: 'var(--hw-heading)' }}>
                {t('hw.agencesPage.qa.title')}
              </h2>
            </Reveal>
            <div className="flex max-w-[820px] flex-col gap-[14px]">
              {qaKeys.map((key, i) => (
                <Reveal key={key} delay={i * REVEAL_STAGGER_S}>
                <details
                  key={key}
                  open={i === 0}
                  className="hw-faq rounded-2xl border px-6"
                  style={{ backgroundColor: 'var(--hw-card)', borderColor: 'var(--hw-line)' }}
                >
                  <summary
                    className="flex cursor-pointer list-none items-center justify-between gap-4 py-5 font-display text-[17px] font-bold [&::-webkit-details-marker]:hidden"
                    style={{ color: 'var(--hw-heading)' }}
                  >
                    {t(`hw.agencesPage.qa.items.${key}.q`)}
                    <span
                      className="hw-faq-plus flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full border-[1.5px] text-lg font-semibold"
                      style={{ borderColor: 'var(--hw-line)', color: 'var(--hw-accent)' }}
                      aria-hidden="true"
                    >
                      +
                    </span>
                  </summary>
                  <div className="max-w-[700px] pb-[22px] text-[15.5px] leading-[1.6]" style={{ color: 'var(--hw-muted)' }}>
                    {t(`hw.agencesPage.qa.items.${key}.a`)}
                  </div>
                </details>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ---------- 6 · Honesty panel ---------- */}
        <section className="py-[92px] text-white max-sm:py-16" style={{ backgroundColor: NAVY }}>
          <Reveal className="mx-auto max-w-[1200px] px-6">
            <div className="text-xs font-bold uppercase tracking-[0.16em]" style={{ color: ORANGE }}>
              {t('hw.agencesPage.honesty.eyebrow')}
            </div>
            <h2 className="mb-8 mt-3 max-w-[720px] text-[clamp(1.7rem,3.2vw,2.35rem)] font-extrabold leading-[1.15] tracking-[-0.015em]">
              {t('hw.agencesPage.honesty.title')}
            </h2>
            <ul className="grid max-w-[900px] grid-cols-1 gap-x-10 gap-y-4 sm:grid-cols-2">
              {Array.isArray(honestyItems) &&
                honestyItems.map((item) => (
                  <li key={item} className="flex items-start gap-[11px] text-[15.5px] leading-[1.6] text-white/[0.88]">
                    <span className="mt-[3px] font-extrabold" style={{ color: ORANGE }} aria-hidden="true">
                      ✓
                    </span>
                    {item}
                  </li>
                ))}
            </ul>
            <p className="mt-9 max-w-[760px] border-t border-white/[0.14] pt-6 text-[15px] leading-[1.65] text-white/[0.72]">
              {t('hw.agencesPage.honesty.legal')}
            </p>
          </Reveal>
        </section>

        {/* ---------- 7 · Final CTA ---------- */}
        <section className="py-[92px] max-sm:py-16">
          <Reveal className="mx-auto max-w-[1200px] px-6">
            <div className="flex flex-wrap items-start gap-x-12 gap-y-9">
              <div className="flex items-start gap-4">
                <span
                  className="flex h-[54px] w-[54px] shrink-0 items-center justify-center rounded-full font-display text-[17px] font-extrabold text-white"
                  style={{ backgroundColor: NAVY }}
                  aria-hidden="true"
                >
                  {FOUNDER_INITIALS}
                </span>
                <span>
                  <span className="block text-[17px] font-bold leading-tight" style={{ color: 'var(--hw-heading)' }}>
                    {FOUNDER_NAME}
                  </span>
                  <span className="block text-[14px] leading-tight" style={{ color: 'var(--hw-muted)' }}>
                    {t('hw.agencesPage.hero.founderRole')}
                  </span>
                </span>
              </div>
              <div className="max-w-[560px]">
                <h2 className="text-[clamp(1.6rem,3vw,2.2rem)] font-extrabold leading-[1.15] tracking-[-0.015em]" style={{ color: 'var(--hw-heading)' }}>
                  {t('hw.agencesPage.final.title')}
                </h2>
                <p className="mb-6 mt-3 text-[16px] leading-[1.6]" style={{ color: 'var(--hw-muted)' }}>
                  {t('hw.agencesPage.final.text')}
                </p>
                {whatsappCta(
                  'final',
                  'inline-flex items-center gap-2.5 whitespace-nowrap rounded-full px-[26px] py-[14px] text-[15.5px] font-semibold text-deep-blue shadow-[0_10px_24px_-8px_rgba(255,107,53,.55)] max-sm:px-5 max-sm:text-[14.5px]',
                )}
                <div className="mt-6 flex flex-col gap-2 text-[14.5px]" style={{ color: 'var(--hw-muted)' }}>
                  <span>
                    {t('hw.agencesPage.final.emailLabel')} :{' '}
                    <a href={`mailto:${supportEmail}`} className="font-semibold underline underline-offset-4" style={{ color: 'var(--hw-heading)' }}>
                      {supportEmail}
                    </a>
                  </span>
                  <a href={`${agencyUrl}/signup?lang=${currentLang}`} className="hover:underline hover:underline-offset-4">
                    {t('hw.agencesPage.final.signupQuiet')} <Arrow />
                  </a>
                </div>
              </div>
            </div>
          </Reveal>
        </section>
      </main>

      {/* ---------- Footer: the ONE shared navy trust footer
          (Council surface 3, Option A) — replaces the slim footer
          that dropped the Trust column. Extra mobile bottom padding
          clears the sticky WhatsApp bar. ---------- */}
      <SiteFooter anchorBase="/" className="max-lg:pb-[110px]" />

      {/* ---------- Sticky mobile WhatsApp bar ---------- */}
      <div
        className="fixed inset-x-0 bottom-0 z-40 border-t px-4 pb-[max(12px,env(safe-area-inset-bottom))] pt-3 lg:hidden"
        style={{ backgroundColor: NAVY, borderColor: 'rgba(255,255,255,0.14)' }}
      >
        {whatsappCta(
          'sticky',
          'flex items-center justify-center gap-2.5 rounded-full px-5 py-[13px] text-[15px] font-semibold text-deep-blue',
        )}
      </div>

      <style jsx global>{`
        /* Shared with the homepage (#735): the --hw-* theme variables so
           .dark (next-themes, system preference) renders a true dark
           page here too. Light values = the approved design. */
        /* Design Council Phase 1: --hw-* are aliases of the shared
           @ouiboo/tokens variables only - no forked palette values.
           The shared tokens carry the light/dark values, so one alias
           set serves both themes. */
        .hw-root {
          --hw-page: var(--background);
          --hw-sand: var(--secondary);
          --hw-card: var(--popover);
          --hw-panel: var(--muted);
          --hw-panel-border: var(--border);
          --hw-record: var(--popover);
          --hw-record-border: var(--border);
          --hw-checkline: var(--paper);
          --hw-line: var(--border);
          --hw-divider: var(--border);
          --hw-ink: var(--foreground);
          --hw-heading: var(--deep-blue);
          --hw-muted: var(--muted-foreground);
          --hw-accent: var(--accent);
          --hw-chip: var(--lead);
        }
        .dark .hw-root {
          --hw-heading: var(--foreground);
        }
        .hw-faq[open ] .hw-faq-plus {
          background-color: ${ORANGE};
          border-color: ${ORANGE};
          color: #0a192f;
          transform: rotate(45deg);
        }
        .hw-faq .hw-faq-plus {
          transition: transform 0.2s ease, background-color 0.2s ease;
        }
      `}</style>
    </div>
  )
}
