import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getInitialLanguage } from '@ouiboo/i18n/server'
import {
  BLOG_INDEX_PATH,
  BLOG_POST_SLUGS,
  blogIndexCopy,
  blogPostLocale,
  blogPostPath,
  buildArticleJsonLd,
  findBlogPost,
  formatBlogDate,
} from '../../../lib/blog'
import { VERIFICATION_PATH, guidesContent } from '../../../lib/guides'
import { absoluteLandingUrl } from '../../../lib/site'

/**
 * #781: one template for every blog post, in the Layer A pattern
 * (#683) — server-rendered from the repo's markdown content
 * collection (lib/blog.ts mirrors src/content/blog/*.md, parity
 * enforced by tests), indexable by design, editorial only: no trip
 * prices, no booking CTAs, no first/only claims.
 */
export function generateStaticParams() {
  return BLOG_POST_SLUGS.map((slug) => ({ slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const post = findBlogPost(slug)
  if (!post) return {}
  const locale = await getInitialLanguage()
  const content = blogPostLocale(post, locale)
  return {
    title: content.title,
    description: content.description,
    alternates: { canonical: absoluteLandingUrl(blogPostPath(slug)) },
    openGraph: {
      type: 'article',
      title: content.title,
      description: content.description,
      url: absoluteLandingUrl(blogPostPath(slug)),
      publishedTime: post.date,
    },
    robots: { index: true, follow: true },
  }
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const post = findBlogPost(slug)
  if (!post) notFound()
  const locale = await getInitialLanguage()
  const copy = blogIndexCopy(locale)
  const content = blogPostLocale(post, locale)
  const shared = guidesContent(locale)
  const jsonLd = buildArticleJsonLd(post, locale)

  return (
    <main id="main-content" tabIndex={-1} className="min-h-screen bg-background px-6 py-16 text-foreground sm:py-24">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <article className="mx-auto max-w-3xl">
        <Link href="/" className="text-sm font-semibold text-orange-700 hover:underline">
          Ouiboo
        </Link>
        <h1 className="mt-6 text-4xl font-bold tracking-tight">{content.title}</h1>
        <p className="mt-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          <time dateTime={post.date}>{formatBlogDate(post.date, locale)}</time>
        </p>
        <p className="mt-6 text-lg leading-8 text-muted-foreground">{content.intro}</p>

        {content.sections.map((section) => (
          <section key={section.title} className="mt-12">
            <h2 className="text-2xl font-bold">{section.title}</h2>
            <p className="mt-3 leading-7 text-muted-foreground">{section.text}</p>
          </section>
        ))}

        <section className="mt-12">
          <h2 className="text-2xl font-bold">{copy.relatedTitle}</h2>
          <p className="mt-4">
            <Link href={VERIFICATION_PATH} className="font-semibold text-orange-700 hover:underline">
              {shared.verificationLink}
            </Link>
          </p>
          <p className="mt-4">
            <Link href={BLOG_INDEX_PATH} className="font-semibold text-orange-700 hover:underline">
              {copy.backToBlog} <span aria-hidden="true" className="inline-block rtl:-scale-x-100">→</span>
            </Link>
          </p>
        </section>
      </article>
    </main>
  )
}
