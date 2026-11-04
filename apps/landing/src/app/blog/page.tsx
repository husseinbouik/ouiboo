import type { Metadata } from 'next'
import Link from 'next/link'
import { getInitialLanguage } from '@ouiboo/i18n/server'
import { BLOG_INDEX_PATH, blogIndexCopy, blogSummaries, formatBlogDate } from '../../lib/blog'
import { absoluteLandingUrl } from '../../lib/site'

/**
 * #781: the blog index — editorial content in the Layer A pattern
 * (#683): server-rendered, indexable by design, and NOT inventory —
 * no trip cards, no prices, no booking CTAs. Posts are
 * code-reviewed markdown files in the repo (see lib/blog.ts); v1
 * has no CMS and no admin editor UI, deliberately.
 */
export async function generateMetadata(): Promise<Metadata> {
  const locale = await getInitialLanguage()
  const copy = blogIndexCopy(locale)
  return {
    title: copy.title,
    description: copy.intro,
    alternates: { canonical: absoluteLandingUrl(BLOG_INDEX_PATH) },
    robots: { index: true, follow: true },
  }
}

export default async function BlogIndexPage() {
  const locale = await getInitialLanguage()
  const copy = blogIndexCopy(locale)
  const posts = blogSummaries(locale)

  return (
    <main id="main-content" tabIndex={-1} className="min-h-screen bg-background px-6 py-16 text-foreground sm:py-24">
      <article className="mx-auto max-w-3xl">
        <Link href="/" className="text-sm font-semibold text-orange-700 hover:underline">
          Ouiboo
        </Link>
        <h1 className="mt-6 text-4xl font-bold tracking-tight">{copy.title}</h1>
        <p className="mt-6 text-lg leading-8 text-muted-foreground">{copy.intro}</p>

        <section className="mt-12 space-y-6">
          {posts.map((post) => (
            <div key={post.slug} className="rounded-3xl border border-border bg-card p-7 shadow-sm">
              <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                <time dateTime={post.date}>{formatBlogDate(post.date, locale)}</time>
              </p>
              <h2 className="mt-2 text-2xl font-bold">{post.title}</h2>
              <p className="mt-2 leading-7 text-muted-foreground">{post.excerpt}</p>
              <Link
                href={post.path}
                className="mt-4 inline-block font-semibold text-orange-700 hover:underline"
              >
                {copy.readPost} <span aria-hidden="true" className="inline-block rtl:-scale-x-100">→</span>
              </Link>
            </div>
          ))}
        </section>
      </article>
    </main>
  )
}
