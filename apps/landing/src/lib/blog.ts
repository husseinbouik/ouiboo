import type { SupportedLanguage } from '@ouiboo/i18n/server'
import { absoluteLandingUrl } from './site'

/**
 * #781 (Council S6 Tier 3, Phase 3 un-parked): the blog engine, v1 —
 * the smallest honest version. Posts are code-reviewed markdown
 * files in the repo (`src/content/blog/<slug>.<locale>.md`, with
 * frontmatter: title, description, date, slug, locale) — there is
 * deliberately NO CMS and NO admin editor UI in v1; publishing a
 * post is a pull request, exactly like the city guides (#683).
 *
 * This module is the rendering collection for those files: the same
 * frontmatter + body, structured for the index and post templates.
 * `blog.test.ts` parses the markdown files and fails if the two ever
 * drift apart, and applies the Layer A honesty census to the blog
 * copy: editorial content, NOT inventory — no trip prices, no
 * booking CTAs, no first/only/biggest claims.
 *
 * Routes are registered here (BLOG_PATHS) so sitemap.ts + robots.ts
 * index /blog exactly like the guides: indexable by design while the
 * rest of the landing stays behind the beta noindex gate.
 */

export const BLOG_INDEX_PATH = '/blog'
export const blogPostPath = (slug: string): string => `/blog/${slug}`

export interface BlogSection {
  title: string
  text: string
}

export interface BlogPostLocale {
  title: string
  description: string
  intro: string
  sections: BlogSection[]
}

export interface BlogPost {
  slug: string
  /** ISO date (yyyy-mm-dd), the frontmatter `date`. */
  date: string
  locales: Record<SupportedLanguage, BlogPostLocale>
}

export interface BlogIndexCopy {
  title: string
  intro: string
  readPost: string
  backToBlog: string
  relatedTitle: string
}

export const BLOG_INDEX_COPY: Record<SupportedLanguage, BlogIndexCopy> = {
  fr: {
    title: 'Le blog Ouiboo',
    intro:
      "Des articles pour comprendre comment Ouiboo fonctionne et préparer vos voyages au Maroc — écrits par l'équipe Ouiboo, sans promesses que nous ne pouvons pas tenir.",
    readPost: "Lire l'article",
    backToBlog: 'Tous les articles',
    relatedTitle: 'À lire aussi',
  },
  en: {
    title: 'The Ouiboo blog',
    intro:
      'Articles on how Ouiboo works and on preparing trips in Morocco — written by the Ouiboo team, with no promises we cannot keep.',
    readPost: 'Read the article',
    backToBlog: 'All articles',
    relatedTitle: 'Keep reading',
  },
  ar: {
    title: 'مدونة Ouiboo',
    intro:
      'مقالات لفهم كيفية عمل Ouiboo وللتحضير لرحلاتكم في المغرب — يكتبها فريق Ouiboo، دون وعود لا يمكننا الوفاء بها.',
    readPost: 'قراءة المقال',
    backToBlog: 'كل المقالات',
    relatedTitle: 'اقرأ أيضاً',
  },
}

const VERIFICATION_POST: BlogPost = {
  slug: 'comment-ouiboo-verifie-les-agences',
  date: '2026-11-04',
  locales: {
    fr: {
      title: "Comment Ouiboo vérifie les agences avant qu'elles publient des voyages",
      description:
        "Les contrôles qu'une agence passe avant de publier des voyages sur Ouiboo : licence de voyage, assurance responsabilité civile et identité du vendeur — et ce que la vérification ne promet pas.",
      intro:
        "Ouiboo est une plateforme technologique : les agences vendent leurs propres voyages, et les voyageurs paient l'agence directement. Avant qu'une agence puisse publier des voyages sur Ouiboo, elle passe une porte de vérification. Cet article reprend, étape par étape, ce qui est contrôlé — et ce que la vérification ne prétend pas.",
      sections: [
        {
          title: 'La licence de voyage',
          text: "L'agence soumet sa licence de voyage au titre de la loi 11-16 (organisateur-distributeur — ODV — pour les agences qui organisent des voyages). Le numéro de licence, sa date de délivrance et son autorité de délivrance sont enregistrés, et le document de licence est confronté à la liste de l'autorité de délivrance lorsqu'elle est disponible.",
        },
        {
          title: "L'assurance responsabilité civile",
          text: "Le certificat d'assurance RC (responsabilité civile) de l'agence est enregistré — assureur, numéro de police et dates de validité — et doit être en vigueur pour que des voyages puissent être publiés.",
        },
        {
          title: "L'identité du vendeur",
          text: "La raison sociale, l'immatriculation et l'adresse de l'agence sont enregistrés, afin que le vendeur de référence montré aux voyageurs soit l'entreprise réelle derrière l'annonce.",
        },
        {
          title: "L'expiration est appliquée",
          text: "Quand une licence ou une police d'assurance expire ou échoue à la vérification, les annonces de l'agence se mettent automatiquement en pause — sans période de grâce.",
        },
        {
          title: 'Ce que la vérification ne promet pas',
          text: "La vérification énonce ce qui a été contrôlé et quand ; elle ne garantit le résultat d'aucun voyage. Ouiboo fournit la technologie ; l'agence est le vendeur du voyage et est responsable de sa réalisation.",
        },
      ],
    },
    en: {
      title: 'How Ouiboo checks agencies before they publish trips',
      description:
        'The checks an agency passes before publishing trips on Ouiboo — travel licence, civil-liability insurance and seller identity — and what verification does not promise.',
      intro:
        'Ouiboo is a technology platform: agencies sell their own trips, and travellers pay the agency directly. Before an agency can publish trips on Ouiboo, it passes a verification gate. This article walks through what is checked, step by step — and what verification does not claim.',
      sections: [
        {
          title: 'The travel licence',
          text: "The agency submits its Law 11-16 travel licence (organiser-distributor — ODV — for agencies that organise trips). The licence number, issue date and issuing authority are recorded, and the licence document is checked against the issuing authority's list where one is available.",
        },
        {
          title: 'Civil-liability insurance',
          text: "The agency's RC (responsabilité civile) insurance certificate is recorded — insurer, policy number and validity dates — and must be in force for trips to publish.",
        },
        {
          title: 'Seller identity',
          text: "The agency's legal name, registration and address are recorded, so the seller of record shown to travellers is the real business behind the listing.",
        },
        {
          title: 'Expiry is enforced',
          text: "When a licence or insurance policy expires or fails verification, the agency's listings pause automatically — there is no grace period.",
        },
        {
          title: 'What verification does not promise',
          text: "Verification states what was checked and when; it is not a guarantee of any trip's outcome. Ouiboo provides the technology; the agency is the seller of the trip and is responsible for delivering it.",
        },
      ],
    },
    ar: {
      title: 'كيف تتحقق Ouiboo من الوكالات قبل أن تنشر رحلاتها',
      description:
        'الفحوص التي تجتازها الوكالة قبل أن تنشر رحلات على Ouiboo — رخصة السفر وتأمين المسؤولية المدنية وهوية البائع — وما لا يعد به التحقق.',
      intro:
        'OuiBoo منصة تقنية: تبيع الوكالات رحلاتها بنفسها، ويدفع المسافرون للوكالة مباشرة. وقبل أن تنشر وكالة رحلات على Ouiboo، تجتاز بوابة تحقق. يعرض هذا المقال، خطوة بخطوة، ما يُفحص — وما لا يدعيه التحقق.',
      sections: [
        {
          title: 'رخصة السفر',
          text: 'تقدم الوكالة رخصة سفرها بموجب القانون 11-16 (منظم-موزع — ODV — للوكالات التي تنظم الرحلات). يُسجل رقم الرخصة وتاريخ إصدارها وجهة إصدارها، ويُقارن مستند الرخصة بقائمة جهة الإصدار حيثما توفرت.',
        },
        {
          title: 'تأمين المسؤولية المدنية',
          text: 'تُسجل شهادة تأمين المسؤولية المدنية (RC) للوكالة — المؤمِّن ورقم البوليصة وتواريخ الصلاحية — ويجب أن تكون سارية لكي تُنشر الرحلات.',
        },
        {
          title: 'هوية البائع',
          text: 'يُسجل الاسم القانوني للوكالة وتسجيلها وعنوانها، لكي يكون البائع المرجعي المعروض للمسافرين هو النشاط الحقيقي وراء الإعلان.',
        },
        {
          title: 'الانتهاء مطبق',
          text: 'عند انتهاء رخصة أو بوليصة تأمين أو فشلها في التحقق، تتوقف إعلانات الوكالة تلقائياً — دون أي فترة سماح.',
        },
        {
          title: 'ما لا يعد به التحقق',
          text: 'يذكر التحقق ما فُحص ومتى؛ وليس ضماناً لنتيجة أي رحلة. يوفر Ouiboo التقنية؛ والوكالة هي بائع الرحلة والمسؤولة عن تنفيذها.',
        },
      ],
    },
  },
}

/** All posts, newest first — the index renders this order. */
export const BLOG_POSTS: readonly BlogPost[] = [VERIFICATION_POST].sort((a, b) =>
  b.date.localeCompare(a.date),
)

export const BLOG_POST_SLUGS: readonly string[] = BLOG_POSTS.map((post) => post.slug)

/** Every blog route — sitemap + robots share this list. */
export const BLOG_PATHS: readonly string[] = [
  BLOG_INDEX_PATH,
  ...BLOG_POSTS.map((post) => blogPostPath(post.slug)),
]

export function blogIndexCopy(locale: SupportedLanguage): BlogIndexCopy {
  return BLOG_INDEX_COPY[locale]
}

export interface BlogPostSummary {
  slug: string
  path: string
  date: string
  title: string
  /** The index excerpt: the post description, as authored. */
  excerpt: string
}

export function blogSummaries(locale: SupportedLanguage): BlogPostSummary[] {
  return BLOG_POSTS.map((post) => ({
    slug: post.slug,
    path: blogPostPath(post.slug),
    date: post.date,
    title: post.locales[locale].title,
    excerpt: post.locales[locale].description,
  }))
}

export function findBlogPost(slug: string): BlogPost | undefined {
  return BLOG_POSTS.find((post) => post.slug === slug)
}

export function blogPostLocale(post: BlogPost, locale: SupportedLanguage): BlogPostLocale {
  return post.locales[locale]
}

const DATE_LOCALES: Record<SupportedLanguage, string> = {
  fr: 'fr-FR',
  en: 'en-GB',
  ar: 'ar-MA',
}

/** Human date for the index + post byline. Parsed at UTC noon so the
 * rendered day never shifts with the server's timezone. */
export function formatBlogDate(isoDate: string, locale: SupportedLanguage): string {
  return new Intl.DateTimeFormat(DATE_LOCALES[locale], {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${isoDate}T12:00:00Z`))
}

/** Article schema for a post, derived from the same content the page
 * renders — no offers, no prices (editorial, not inventory). */
export function buildArticleJsonLd(post: BlogPost, locale: SupportedLanguage) {
  const content = post.locales[locale]
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: content.title,
    description: content.description,
    datePublished: post.date,
    inLanguage: locale,
    url: absoluteLandingUrl(blogPostPath(post.slug)),
    mainEntityOfPage: absoluteLandingUrl(blogPostPath(post.slug)),
    author: { '@type': 'Organization', name: 'Ouiboo' },
    publisher: { '@type': 'Organization', name: 'Ouiboo' },
  }
}
