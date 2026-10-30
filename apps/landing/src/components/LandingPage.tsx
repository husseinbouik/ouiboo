'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useTranslation } from 'react-i18next'
import { Logo, BetaBadge } from '@ouiboo/ui'
import { CookiePreferencesButton } from './AnalyticsConsent'

// #735 (founder-approved design, "The Honest Window" v7): the homepage is
// rebuilt to the approved mockup — photography-led hero with the founder's
// headline ("Morocco is yours to explore."), a price-less showcase of real
// catalogue trips with dated check lines, how-it-works + the verification
// panel with its labelled example record, the navy agency block, and the
// transparency FAQ. The waitlist section, pricing tiers and the stats band
// are gone (Council S8 kill list); there is no app-screenshot section
// (founder removal) and no North/city framing anywhere (founder removal —
// Ouiboo is Morocco-wide; city names appear only as facts of content: a
// trip's own destination and the photo credit).
//
// Polish round (#735 follow-up, founder phone review): the photo credit
// moved from an absolute overlay into the hero flow (it rendered squeezed
// under the header on mobile), the verification panel gets airier mobile
// type/spacing, the showcase is a scroll-snap rail below lg (3-across
// grid on desktop), and the section colours run through --hw-* CSS
// variables so the next-themes `.dark` class (system default — there is
// no toggle; the app follows prefers-color-scheme) renders a true dark
// page. Hero and the navy agency block are fixed by design in both.

// Fail production builds that are missing the cross-app URLs (#347):
// NEXT_PUBLIC_* values are inlined at build time, so a missing var would
// otherwise bake the localhost fallbacks inside the component into the
// deployed site (this shipped to production once — the hero links pointed
// at http://localhost:3001).
if (
  process.env.NODE_ENV === 'production' &&
  (!process.env.NEXT_PUBLIC_TRAVELER_URL || !process.env.NEXT_PUBLIC_AGENCY_URL)
) {
  throw new Error(
    'NEXT_PUBLIC_TRAVELER_URL and NEXT_PUBLIC_AGENCY_URL must be set for production builds'
  )
}

const NAVY = '#0A192F'
const DEEP = '#060D1A'
const ORANGE = '#FF6B35'
// The remaining section colours live in the --hw-* variables at the
// bottom of this file (light values = the approved design; .dark set =
// the next-themes dark rendering). NAVY/DEEP/ORANGE stay constants:
// the hero, the agency block and the footer are navy in both themes.

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

// The three showcase cards are real catalogue trips (staging seed) of one
// named agency; the dated check line printed on every card is that
// agency's live verification record (licence checked 2026-10-30, RC
// insurance valid to 2027-12-31 — see the agency public record, #688).
const SHOWCASE = [
  {
    key: 'chefchaouen',
    tripId: 'cx0p9pysb1vjittr38cj4si0w',
    img: '/showcase/card-chefchaouen.webp',
    initials: 'AA',
  },
  {
    key: 'merzouga',
    tripId: 'cupk39g43n3rd57r9cocpgoew',
    img: '/showcase/card-merzouga.webp',
    initials: 'AA',
  },
  {
    key: 'atlas',
    tripId: 'cqalhxvuhmq58vkrc6ow9qs4v',
    img: '/showcase/card-atlas.webp',
    initials: 'AA',
  },
] as const

const AGENCY_NAME = 'Atlas Adventures SARL'

export default function LandingPage() {
  const { t, i18n } = useTranslation()
  const currentLang = i18n.language
  const isRTL = currentLang === 'ar'
  const travelerUrl = process.env.NEXT_PUBLIC_TRAVELER_URL || 'http://localhost:3001'
  const agencyUrl = process.env.NEXT_PUBLIC_AGENCY_URL || 'http://localhost:3002'
  const supportEmail = process.env.NEXT_PUBLIC_SUPPORT_EMAIL || 'ouibouuu@gmail.com'

  useEffect(() => {
    document.documentElement.lang = currentLang
    document.documentElement.dir = isRTL ? 'rtl' : 'ltr'
  }, [currentLang, isRTL])

  const tagsFor = (key: string): string[] => {
    const tags = t(`hw.showcase.cards.${key}.tags`, { returnObjects: true })
    return Array.isArray(tags) ? (tags as string[]) : []
  }

  const langMarks = [
    { code: 'en', label: 'EN' },
    { code: 'fr', label: 'FR' },
    { code: 'ar', label: 'AR' },
  ]

  return (
    <div className="hw-root font-sans" style={{ backgroundColor: 'var(--hw-page)', color: 'var(--hw-ink)' }}>
      {/* ---------- Header (absolute over the hero, per the design) ---------- */}
      <header className="absolute inset-x-0 top-0 z-20 text-white">
        <div className="mx-auto flex max-w-[1200px] items-center justify-between px-6 py-5">
          <a href="#top" className="flex items-center gap-2.5" aria-label="Ouiboo">
            <Logo />
            <span className="font-display text-[22px] font-extrabold tracking-tight">Ouiboo</span>
            <BetaBadge />
          </a>
          <nav className="hidden items-center gap-[34px] text-[15px] font-medium min-[901px]:flex" aria-label={t('common.globalNavigationLabel')}>
            <a href="#how" className="opacity-90 hover:underline hover:underline-offset-[5px] hover:opacity-100">
              {t('nav.howItWorks')}
            </a>
            <a href="#guides" className="opacity-90 hover:underline hover:underline-offset-[5px] hover:opacity-100">
              {t('hw.nav.guides')}
            </a>
            <a href="#faq" className="opacity-90 hover:underline hover:underline-offset-[5px] hover:opacity-100">
              {t('hw.nav.faq')}
            </a>
          </nav>
          <div className="flex items-center gap-[18px]">
            <div className="hidden items-center gap-1.5 text-[13.5px] font-semibold tracking-wide sm:flex" role="group" aria-label="Language">
              {langMarks.map((mark, i) => (
                <span key={mark.code} className="flex items-center gap-1.5">
                  {i > 0 && <span className="opacity-40">·</span>}
                  <button
                    type="button"
                    onClick={() => i18n.changeLanguage(mark.code)}
                    aria-pressed={currentLang === mark.code}
                    className={currentLang === mark.code ? 'opacity-100 underline underline-offset-4' : 'opacity-55 hover:opacity-90'}
                  >
                    {mark.label}
                  </button>
                </span>
              ))}
            </div>
            <a
              href={`${travelerUrl}/login?lang=${currentLang}`}
              className="hidden text-[14.5px] font-semibold opacity-95 hover:underline hover:underline-offset-[5px] hover:opacity-100 sm:block"
            >
              {t('hw.nav.login')}
            </a>
            <a
              href={`${travelerUrl}/signup?lang=${currentLang}`}
              className="whitespace-nowrap rounded-full px-[18px] py-[9px] text-sm font-semibold text-white shadow-[0_8px_20px_-8px_rgba(255,107,53,.6)] transition-colors"
              style={{ backgroundColor: ORANGE }}
            >
              {t('hw.nav.signup')}
            </a>
            <a
              href="#agencies"
              className="hidden whitespace-nowrap rounded-full border-[1.5px] border-white/55 px-[18px] py-[9px] text-sm font-semibold hover:bg-white/[0.12] sm:block"
            >
              {t('nav.forAgencies')}
            </a>
          </div>
        </div>
      </header>

      <main id="main-content" tabIndex={-1}>
        {/* ---------- 1 · Hero ---------- */}
        <section id="top" className="relative overflow-hidden text-white" style={{ backgroundColor: NAVY }}>
          <div className="absolute inset-0">
            <Image
              src="/showcase/hero-chefchaouen-1600.webp"
              alt={t('hw.hero.heroAlt')}
              fill
              priority
              sizes="100vw"
              className="object-cover object-[center_32%]"
            />
          </div>
          <div
            aria-hidden="true"
            className="absolute inset-0"
            style={{
              background:
                'linear-gradient(97deg, rgba(6,13,26,.86) 0%, rgba(6,13,26,.62) 46%, rgba(6,13,26,.22) 78%, rgba(6,13,26,.30) 100%)',
            }}
          />
          <div
            aria-hidden="true"
            className="absolute inset-0"
            style={{ background: 'linear-gradient(to top, rgba(6,13,26,.78) 0%, rgba(6,13,26,0) 34%)' }}
          />
          <div className="relative z-[2] mx-auto max-w-[1200px] px-6">
            <div className="max-w-[824px] pb-9 pt-[126px] max-sm:pt-[108px]">
              <span className="inline-flex items-center gap-[9px] rounded-full border border-white/[0.22] bg-[#0A192F]/[0.66] py-2 pe-4 ps-3 text-[13.5px] font-semibold backdrop-blur-[6px]">
                <span
                  className="h-[9px] w-[9px] rounded-full"
                  style={{ backgroundColor: ORANGE, boxShadow: '0 0 0 4px rgba(255,107,53,.25)' }}
                />
                {t('hw.hero.statusPill')}
              </span>
              <h1 className="mb-4 mt-5 text-[clamp(2.1rem,4.6vw,3.35rem)] font-extrabold leading-[1.07] tracking-[-0.015em]">
                {t('hw.hero.titleA')}
                <br />
                {t('hw.hero.titleB')}
              </h1>
              <p className="max-w-[600px] text-[clamp(1.02rem,1.6vw,1.22rem)] leading-[1.6] text-white/[0.88]">
                {t('hw.hero.subline')}
              </p>
              <div className="mb-[14px] mt-6 flex flex-wrap gap-[14px]">
                <a
                  href={`${travelerUrl}/signup?lang=${currentLang}`}
                  className="inline-flex items-center gap-2 whitespace-nowrap rounded-full px-[26px] py-[14px] text-[15.5px] font-semibold text-white shadow-[0_10px_24px_-8px_rgba(255,107,53,.55)] transition-colors max-sm:px-5 max-sm:py-[13px] max-sm:text-[14.5px]"
                  style={{ backgroundColor: ORANGE }}
                >
                  {t('hw.hero.ctaSignup')}
                </a>
                <a
                  href="#showcase"
                  className="inline-flex items-center gap-2 whitespace-nowrap rounded-full border-[1.5px] border-white/55 bg-white/[0.06] px-[26px] py-[14px] text-[15.5px] font-semibold text-white transition-colors hover:border-white hover:bg-white/[0.14] max-sm:px-5 max-sm:py-[13px] max-sm:text-[14.5px]"
                >
                  {t('hw.hero.ctaExplore')}
                </a>
              </div>
              <a
                href="#agencies"
                className="mb-[26px] inline-block text-[14.5px] font-semibold text-white/90 underline decoration-[rgba(255,107,53,.75)] underline-offset-[5px] hover:text-white"
              >
                {t('hw.hero.agencyLink')} <Arrow />
              </a>
              <div className="flex max-w-[680px] items-center gap-[9px] text-sm font-medium text-white/[0.92]">
                <ShieldCheck />
                <span>{t('hw.hero.trustLine')}</span>
              </div>
            </div>
          </div>
          <div className="relative z-[2] mx-auto flex max-w-[1200px] justify-end px-6 pb-5">
            <span className="rounded-full bg-[#060D1A]/[0.45] px-[11px] py-[5px] text-[12.5px] text-white/[0.85] backdrop-blur-[4px]">
              {t('hw.hero.photoCredit')}
            </span>
          </div>
        </section>

        {/* ---------- 2 · Showcase ---------- */}
        <section id="guides" className="pb-[92px] pt-[84px] max-sm:py-16" style={{ backgroundColor: 'var(--hw-sand)' }}>
          <div className="mx-auto max-w-[1200px] px-6">
            <div id="showcase" className="mb-10 flex flex-wrap items-end justify-between gap-[30px]">
              <div className="max-w-[720px]">
                <div className="text-xs font-bold uppercase tracking-[0.16em]" style={{ color: 'var(--hw-accent)' }}>
                  {t('hw.showcase.eyebrow')}
                </div>
                <h2 className="mb-3 mt-3 text-[clamp(1.7rem,3.2vw,2.35rem)] font-extrabold leading-[1.15] tracking-[-0.015em]" style={{ color: 'var(--hw-heading)' }}>
                  {t('hw.showcase.title')}
                </h2>
                <p className="text-[16.5px]" style={{ color: 'var(--hw-muted)' }}>
                  {t('hw.showcase.intro')}
                </p>
              </div>
              <div className="max-w-[340px] rounded-[14px] border p-[13px_18px] text-sm" style={{ backgroundColor: 'var(--hw-card)', borderColor: 'var(--hw-line)', color: 'var(--hw-muted)' }}>
                <b style={{ color: 'var(--hw-heading)' }}>{t('hw.showcase.noteLead')}</b> {t('hw.showcase.note')}
              </div>
            </div>

            <div className="-mx-6 flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-px-6 px-6 pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden lg:mx-0 lg:grid lg:grid-cols-3 lg:gap-[26px] lg:overflow-visible lg:px-0 lg:pb-0">
              {SHOWCASE.map((card) => (
                <article
                  key={card.key}
                  className="flex w-[82vw] max-w-[340px] shrink-0 snap-start flex-col overflow-hidden rounded-[20px] shadow-[0_18px_40px_-18px_rgba(10,25,47,.25)] lg:w-auto lg:max-w-none"
                  style={{ backgroundColor: 'var(--hw-card)' }}
                >
                  <div className="relative aspect-[16/10] overflow-hidden">
                    <Image
                      src={card.img}
                      alt={t(`hw.showcase.cards.${card.key}.imgAlt`)}
                      fill
                      loading="lazy"
                      sizes="(min-width: 1024px) 33vw, 100vw"
                      className="object-cover"
                    />
                  </div>
                  <div className="flex flex-1 flex-col gap-[9px] p-[22px_22px_20px]">
                    <div className="text-xs font-bold uppercase tracking-[0.13em]" style={{ color: 'var(--hw-accent)' }}>
                      {t(`hw.showcase.cards.${card.key}.dest`)}
                    </div>
                    <h3 className="text-[19.5px] font-bold leading-[1.3]" style={{ color: 'var(--hw-heading)' }}>
                      {t(`hw.showcase.cards.${card.key}.title`)}
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {tagsFor(card.key).map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full border px-[10px] py-1 text-xs font-semibold"
                          style={{ backgroundColor: 'var(--hw-sand)', borderColor: 'var(--hw-line)', color: 'var(--hw-ink)' }}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                    <div className="mt-1 flex items-center gap-[10px]">
                      <span
                        className="flex h-8 w-8 items-center justify-center rounded-full font-display text-xs font-bold text-white"
                        style={{ backgroundColor: NAVY }}
                        aria-hidden="true"
                      >
                        {card.initials}
                      </span>
                      <span>
                        <span className="block text-[14.5px] font-semibold leading-tight" style={{ color: 'var(--hw-heading)' }}>
                          {AGENCY_NAME}
                        </span>
                        <span className="block text-[12.5px] leading-tight" style={{ color: 'var(--hw-muted)' }}>
                          {t('hw.showcase.organiser')} · {t(`hw.showcase.cards.${card.key}.city`)}
                        </span>
                      </span>
                    </div>
                    <div
                      className="flex items-start gap-2 rounded-[11px] border p-[10px_12px] text-[12.8px] leading-[1.45]"
                      style={{ backgroundColor: 'var(--hw-checkline)', borderColor: 'var(--hw-line)', color: 'var(--hw-muted)' }}
                    >
                      <ShieldCheck className="mt-[1px] h-4 w-4 shrink-0" />
                      <span>{t('hw.showcase.checkLine')}</span>
                    </div>
                    <a
                      href={`${travelerUrl}/trip/${card.tripId}?lang=${currentLang}`}
                      className="mt-auto border-t pt-3 text-[14.5px] font-semibold"
                      style={{ borderColor: 'var(--hw-divider)', color: 'var(--hw-heading)' }}
                    >
                      {t('hw.showcase.viewTrip')} <span style={{ color: 'var(--hw-accent)' }}><Arrow /></span>
                    </a>
                  </div>
                </article>
              ))}
            </div>

            <div className="mt-[42px] flex flex-wrap items-center gap-[14px]">
              <span className="text-[15px] font-semibold" style={{ color: 'var(--hw-heading)' }}>
                {t('hw.showcase.guidesLabel')}
              </span>
              <Link
                href="/guides"
                className="rounded-full border-[1.5px] px-[18px] py-[9px] text-[14.5px] font-semibold transition-colors"
                style={{ borderColor: 'var(--hw-heading)', color: 'var(--hw-heading)' }}
              >
                {t('hw.showcase.guidesCta')} <Arrow />
              </Link>
              <a href="#how" className="ms-[6px] text-[14.5px] font-semibold" style={{ color: 'var(--hw-accent)' }}>
                {t('hw.showcase.verifyLink')} <Arrow />
              </a>
            </div>
          </div>
        </section>

        {/* ---------- 3 · How it works + verification ---------- */}
        <section id="how" className="py-[92px] max-sm:py-16">
          <div className="mx-auto max-w-[1200px] px-6">
            <div className="mb-11 max-w-[720px]">
              <div className="text-xs font-bold uppercase tracking-[0.16em]" style={{ color: 'var(--hw-accent)' }}>
                {t('hw.how.eyebrow')}
              </div>
              <h2 className="mb-3 mt-3 text-[clamp(1.7rem,3.2vw,2.35rem)] font-extrabold leading-[1.15] tracking-[-0.015em]" style={{ color: 'var(--hw-heading)' }}>
                {t('hw.how.title')}
              </h2>
              <p className="text-[16.5px]" style={{ color: 'var(--hw-muted)' }}>
                {t('hw.how.intro')}
              </p>
            </div>
            <div className="grid grid-cols-1 items-start gap-14 lg:grid-cols-[1.05fr_0.95fr]">
              <div className="flex flex-col gap-[34px]">
                {(['step1', 'step2', 'step3'] as const).map((step, i) => (
                  <div key={step} className="flex gap-5">
                    <span
                      className="flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-full font-display text-[19px] font-extrabold text-white shadow-[0_8px_18px_-6px_rgba(255,107,53,.5)]"
                      style={{ backgroundColor: ORANGE }}
                      aria-hidden="true"
                    >
                      {i + 1}
                    </span>
                    <div>
                      <h3 className="mb-[5px] text-[18.5px] font-bold" style={{ color: 'var(--hw-heading)' }}>
                        {t(`hw.how.steps.${step}.title`)}
                      </h3>
                      <p className="max-w-[480px] text-[15.5px]" style={{ color: 'var(--hw-muted)' }}>
                        {t(`hw.how.steps.${step}.text`)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="rounded-[20px] border p-[28px_28px_24px]" style={{ backgroundColor: 'var(--hw-panel)', borderColor: 'var(--hw-panel-border)' }}>
                <h3 className="mb-4 flex items-center gap-[10px] text-[19px] font-bold" style={{ color: 'var(--hw-heading)' }}>
                  <svg viewBox="0 0 24 24" fill="none" className="h-[22px] w-[22px]" aria-hidden="true">
                    <path d="M12 3l7 2.6v5.2c0 4.6-3 7.7-7 9.2-4-1.5-7-4.6-7-9.2V5.6L12 3z" style={{ fill: 'var(--hw-heading)' }} />
                    <path d="M9 11.6l2.1 2.1 4-4.2" stroke={ORANGE} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  {t('hw.how.panel.title')}
                </h3>
                <ul className="flex flex-col gap-[14px] text-[15px] leading-[1.6] max-lg:gap-5 max-lg:text-base max-lg:leading-[1.65]" style={{ color: 'var(--hw-ink)' }}>
                  {(['licence', 'insurance', 'registration'] as const).map((item) => (
                    <li key={item} className="flex items-start gap-[11px]">
                      <span
                        className="mt-[2px] flex h-[21px] w-[21px] shrink-0 items-center justify-center rounded-full text-xs text-white"
                        style={{ backgroundColor: 'var(--hw-chip)' }}
                        aria-hidden="true"
                      >
                        ✓
                      </span>
                      <span>
                        <b style={{ color: 'var(--hw-heading)' }}>{t(`hw.how.panel.items.${item}.label`)}</b> —{' '}
                        {t(`hw.how.panel.items.${item}.text`)}
                      </span>
                    </li>
                  ))}
                </ul>
                <div className="mt-5 rounded-[13px] border p-[14px_16px] max-lg:mt-7 max-lg:p-[18px_18px_16px]" style={{ backgroundColor: 'var(--hw-record)', borderColor: 'var(--hw-record-border)' }}>
                  <div className="mb-[9px] font-display text-[13.5px] font-bold tracking-[0.02em] max-lg:mb-3 max-lg:text-[15px]" style={{ color: 'var(--hw-heading)' }}>
                    {t('hw.how.panel.recordTitle')}
                  </div>
                  <div className="flex flex-col gap-[7px] text-[13.8px] leading-[1.6] max-lg:gap-[11px] max-lg:text-[15px] max-lg:leading-[1.7]" style={{ color: 'var(--hw-muted)' }}>
                    <div>
                      <b className="font-semibold" style={{ color: 'var(--hw-heading)' }}>
                        {t('hw.how.panel.recordLicenceLabel')}
                      </b>{' '}
                      — {t('hw.how.panel.recordLicence')}
                    </div>
                    <div>
                      <b className="font-semibold" style={{ color: 'var(--hw-heading)' }}>
                        {t('hw.how.panel.recordInsuranceLabel')}
                      </b>{' '}
                      — {t('hw.how.panel.recordInsurance')}
                    </div>
                    <div className="mt-[3px] border-t pt-[9px] text-[13px] max-lg:mt-2 max-lg:pt-3 max-lg:text-sm" style={{ borderColor: 'var(--hw-line)' }}>
                      {t('hw.how.panel.recordNote')}
                    </div>
                  </div>
                </div>
                <Link href="/verification" className="mt-4 inline-block text-[15px] font-semibold" style={{ color: 'var(--hw-accent)' }}>
                  {t('hw.how.panel.panelLink')} <Arrow />
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* ---------- 4 · Agency block ---------- */}
        <section id="agencies" className="py-[92px] text-white max-sm:py-16" style={{ backgroundColor: NAVY }}>
          <div className="mx-auto max-w-[1200px] px-6">
            <div className="text-xs font-bold uppercase tracking-[0.16em]" style={{ color: ORANGE }}>
              {t('hw.agencies.eyebrow')}
            </div>
            <h2 className="mb-[14px] mt-3 max-w-[640px] text-[clamp(1.8rem,3.4vw,2.5rem)] font-extrabold leading-[1.14] tracking-[-0.015em]">
              {t('hw.agencies.titleA')}
              <br />
              {t('hw.agencies.titleB')}
            </h2>
            <p className="max-w-[620px] text-[16.5px] text-white/[0.82]">{t('hw.agencies.lead')}</p>
            <div className="mb-10 mt-7 flex flex-wrap gap-3">
              {(t('hw.agencies.chips', { returnObjects: true }) as string[]).map((chip) => (
                <span
                  key={chip}
                  className="inline-flex items-center gap-[9px] rounded-full border border-white/[0.18] bg-white/[0.07] px-[18px] py-[11px] text-[14.5px] font-semibold"
                >
                  <span className="font-extrabold" style={{ color: ORANGE }} aria-hidden="true">
                    ✓
                  </span>
                  {chip}
                </span>
              ))}
            </div>
            <div className="mb-[42px] grid grid-cols-1 gap-5 sm:grid-cols-2">
              {(['payDirect', 'brand', 'fees', 'exclusive'] as const).map((key) => (
                <div key={key} className="rounded-2xl border border-white/10 bg-[#10233F] p-[24px_24px_20px]">
                  <h3 className="mb-2 text-[16.5px] font-bold" style={{ color: ORANGE }}>
                    {t(`hw.agencies.objections.${key}.title`)}
                  </h3>
                  <p className="text-[15px] leading-[1.6] text-white/[0.85]">{t(`hw.agencies.objections.${key}.text`)}</p>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-5">
              <a
                href={`${agencyUrl}/signup?lang=${currentLang}`}
                className="inline-flex items-center gap-2 whitespace-nowrap rounded-full px-[26px] py-[14px] text-[15.5px] font-semibold text-white shadow-[0_10px_24px_-8px_rgba(255,107,53,.55)]"
                style={{ backgroundColor: ORANGE }}
              >
                {t('hw.agencies.cta')}
              </a>
              <span className="text-[13.8px] text-white/[0.65]">{t('hw.agencies.note')}</span>
            </div>
          </div>
        </section>

        {/* ---------- 5 · Transparency FAQ ---------- */}
        <section id="faq" className="py-[92px] max-sm:py-16" style={{ backgroundColor: 'var(--hw-sand)' }}>
          <div className="mx-auto max-w-[1200px] px-6">
            <div className="mb-11 max-w-[720px]">
              <div className="text-xs font-bold uppercase tracking-[0.16em]" style={{ color: 'var(--hw-accent)' }}>
                {t('hw.faq.eyebrow')}
              </div>
              <h2 className="mb-3 mt-3 text-[clamp(1.7rem,3.2vw,2.35rem)] font-extrabold leading-[1.15] tracking-[-0.015em]" style={{ color: 'var(--hw-heading)' }}>
                {t('hw.faq.title')}
              </h2>
              <p className="text-[16.5px]" style={{ color: 'var(--hw-muted)' }}>
                {t('hw.faq.intro')}
              </p>
            </div>
            <div className="flex max-w-[820px] flex-col gap-[14px]">
              {(['whoPay', 'whoRefund', 'charges', 'whenBook'] as const).map((key, i) => (
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
                    {t(`hw.faq.items.${key}.q`)}
                    <span
                      className="hw-faq-plus flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full border-[1.5px] text-lg font-semibold"
                      style={{ borderColor: 'var(--hw-line)', color: 'var(--hw-accent)' }}
                      aria-hidden="true"
                    >
                      +
                    </span>
                  </summary>
                  <div className="max-w-[700px] pb-[22px] text-[15.5px]" style={{ color: 'var(--hw-muted)' }}>
                    <b style={{ color: 'var(--hw-heading)' }}>{t(`hw.faq.items.${key}.lead`)}</b>
                    {t(`hw.faq.items.${key}.rest`)}
                  </div>
                </details>
              ))}
            </div>
          </div>
        </section>
      </main>

      {/* ---------- 6 · Footer ---------- */}
      <footer className="pb-[34px] pt-16 text-white/[0.78]" style={{ backgroundColor: DEEP }}>
        <div className="mx-auto max-w-[1200px] px-6">
          <div className="mb-12 grid grid-cols-2 gap-10 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
            <div className="max-lg:col-span-2">
              <a href="#top" className="flex items-center gap-2.5 text-white" aria-label="Ouiboo">
                <Logo />
                <span className="font-display text-[22px] font-extrabold tracking-tight">Ouiboo</span>
                <BetaBadge />
              </a>
              <p className="mt-[14px] max-w-[300px] text-[14.5px] leading-[1.6] text-white/[0.66]">{t('hw.footer.tagline')}</p>
            </div>
            <div>
              <h4 className="mb-4 font-display text-sm font-bold uppercase tracking-[0.1em] text-white">{t('hw.footer.colExplore')}</h4>
              <ul className="flex flex-col gap-[11px] text-[14.5px]">
                <li>
                  <Link href="/guides" className="hover:text-white">
                    {t('hw.footer.guides')}
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="mb-4 font-display text-sm font-bold uppercase tracking-[0.1em] text-white">{t('hw.footer.colTrust')}</h4>
              <ul className="flex flex-col gap-[11px] text-[14.5px]">
                <li>
                  <Link href="/verification" className="hover:text-white">
                    {t('hw.footer.verification')}
                  </Link>
                </li>
                <li>
                  <a href="#how" className="hover:text-white">
                    {t('hw.footer.payments')}
                  </a>
                </li>
                <li>
                  <a href="#faq" className="hover:text-white">
                    {t('hw.footer.faq')}
                  </a>
                </li>
                <li>
                  <a href={`mailto:${supportEmail}`} className="hover:text-white">
                    {t('hw.footer.support')}
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="mb-4 font-display text-sm font-bold uppercase tracking-[0.1em] text-white">{t('hw.footer.colAgencies')}</h4>
              <ul className="flex flex-col gap-[11px] text-[14.5px]">
                <li>
                  <a href="#agencies" className="hover:text-white">
                    {t('hw.footer.joinBeta')}
                  </a>
                </li>
                <li>
                  <a href={`${agencyUrl}/login?lang=${currentLang}`} className="hover:text-white">
                    {t('hw.footer.agencyLogin')}
                  </a>
                </li>
                <li>
                  <a href={`${travelerUrl}/login?lang=${currentLang}`} className="hover:text-white">
                    {t('hw.footer.travellerLogin')}
                  </a>
                </li>
              </ul>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-4 border-t border-white/[0.12] pt-6 text-[13.5px] text-white/[0.55]">
            <span>{t('hw.footer.bottomLeft', { year: new Date().getFullYear() })}</span>
            <span className="flex flex-wrap items-center gap-x-5 gap-y-2">
              <a href="/privacy" className="hover:text-white">
                {t('footer.privacy')}
              </a>
              <a href={`${travelerUrl}/copyright-report?lang=${currentLang}`} className="hover:text-white">
                {t('hw.footer.copyright')}
              </a>
              <CookiePreferencesButton className="hover:text-white" />
              <span>{t('hw.footer.madeIn')}</span>
            </span>
          </div>
        </div>
      </footer>

      <style jsx global>{`
        /* #735 polish: theme variables for the Honest Window sections.
           Light values reproduce the approved design exactly; the .dark
           set is applied by next-themes (system preference) on <html>. */
        .hw-root {
          --hw-page: #ffffff;
          --hw-sand: #f6f1e6;
          --hw-card: #ffffff;
          --hw-panel: #f3f7fc;
          --hw-panel-border: #dce6f2;
          --hw-record: #ffffff;
          --hw-record-border: #b9c9de;
          --hw-checkline: #fbf8f1;
          --hw-line: #e3dac4;
          --hw-divider: #f0eadb;
          --hw-ink: #14263f;
          --hw-heading: #0a192f;
          --hw-muted: #5b6b82;
          --hw-accent: #e04e1a;
          --hw-chip: #0a192f;
        }
        .dark .hw-root {
          --hw-page: #060d1a;
          --hw-sand: #0e2447;
          --hw-card: #142c50;
          --hw-panel: #0c2142;
          --hw-panel-border: #24405f;
          --hw-record: #091830;
          --hw-record-border: #33537e;
          --hw-checkline: #0c2142;
          --hw-line: #31507a;
          --hw-divider: #24405f;
          --hw-ink: #d9e3f0;
          --hw-heading: #ffffff;
          --hw-muted: #a3b5cc;
          --hw-accent: #ff8c5a;
          --hw-chip: #ff6b35;
        }
        .hw-faq[open ] .hw-faq-plus {
          background-color: ${ORANGE};
          border-color: ${ORANGE};
          color: #fff;
          transform: rotate(45deg);
        }
        .hw-faq .hw-faq-plus {
          transition: transform 0.2s ease, background-color 0.2s ease;
        }
      `}</style>
    </div>
  )
}
