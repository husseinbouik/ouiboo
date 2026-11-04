import * as fs from 'fs';
import * as path from 'path';
import {
    BLOG_INDEX_PATH,
    BLOG_PATHS,
    BLOG_POSTS,
    BLOG_POST_SLUGS,
    blogIndexCopy,
    blogPostLocale,
    blogPostPath,
    blogSummaries,
    buildArticleJsonLd,
    findBlogPost,
    formatBlogDate,
} from './blog';

/**
 * #781: blog engine census, in the Layer A discipline of
 * guides.test.ts. Three contracts:
 *  1. Route registration — /blog + every post path live in
 *     BLOG_PATHS, which sitemap.ts and robots.ts share.
 *  2. Markdown parity — every post exists as a code-reviewed
 *     markdown file per locale (src/content/blog/<slug>.<locale>.md)
 *     and the rendering collection in lib/blog.ts matches its
 *     frontmatter + body exactly, so the two can never drift.
 *  3. Honesty census — blog copy is editorial, NOT inventory: no
 *     prices, no booking CTAs, no #661 first/only/biggest claims.
 */
const LOCALES = ['fr', 'en', 'ar'] as const;

function allStrings(value: unknown): string[] {
    if (typeof value === 'string') return [value];
    if (Array.isArray(value)) return value.flatMap(allStrings);
    if (value && typeof value === 'object') return Object.values(value).flatMap(allStrings);
    return [];
}

function contentDir(): string {
    const candidates = [
        path.join(process.cwd(), 'src/content/blog'),
        path.join(process.cwd(), 'apps/landing/src/content/blog'),
    ];
    const found = candidates.find((candidate) => fs.existsSync(candidate));
    if (!found) throw new Error(`blog content dir not found in ${candidates.join(', ')}`);
    return found;
}

interface ParsedMarkdown {
    frontmatter: Record<string, string>;
    intro: string;
    sections: Array<{ title: string; text: string }>;
}

function parseMarkdown(slug: string, locale: string): ParsedMarkdown {
    const raw = fs.readFileSync(path.join(contentDir(), `${slug}.${locale}.md`), 'utf8');
    const match = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
    if (!match) throw new Error(`${slug}.${locale}.md: missing frontmatter block`);
    const frontmatter: Record<string, string> = {};
    for (const line of match[1].split('\n')) {
        const idx = line.indexOf(':');
        frontmatter[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
    }
    const blocks = match[2].trim().split(/\n\n+/).map((block) => block.trim()).filter(Boolean);
    const intro = blocks[0];
    const sections: ParsedMarkdown['sections'] = [];
    for (let i = 1; i < blocks.length; i += 2) {
        const heading = blocks[i];
        if (!heading.startsWith('## ')) throw new Error(`${slug}.${locale}.md: expected ## heading, got ${heading}`);
        sections.push({ title: heading.slice(3).trim(), text: blocks[i + 1] });
    }
    return { frontmatter, intro, sections };
}

describe('Blog engine (#781)', () => {
    it('registers the index and every post route for sitemap + robots', () => {
        expect(BLOG_INDEX_PATH).toBe('/blog');
        expect(BLOG_PATHS[0]).toBe('/blog');
        for (const slug of BLOG_POST_SLUGS) {
            expect(BLOG_PATHS).toContain(blogPostPath(slug));
            expect(findBlogPost(slug)?.slug).toBe(slug);
        }
        expect(BLOG_PATHS).toHaveLength(1 + BLOG_POST_SLUGS.length);
        expect(new Set(BLOG_PATHS).size).toBe(BLOG_PATHS.length);
    });

    it('ships at least one real post, complete in fr/en/ar', () => {
        expect(BLOG_POSTS.length).toBeGreaterThanOrEqual(1);
        for (const post of BLOG_POSTS) {
            expect(post.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
            for (const locale of LOCALES) {
                const content = blogPostLocale(post, locale);
                expect(content.title.length).toBeGreaterThan(5);
                expect(content.description.length).toBeGreaterThan(20);
                expect(content.intro.length).toBeGreaterThan(40);
                expect(content.sections.length).toBeGreaterThanOrEqual(3);
                for (const section of content.sections) {
                    expect(section.title.length).toBeGreaterThan(2);
                    expect(section.text.length).toBeGreaterThan(40);
                }
            }
        }
        for (const locale of LOCALES) {
            const copy = blogIndexCopy(locale);
            expect(copy.title.length).toBeGreaterThan(3);
            expect(copy.intro.length).toBeGreaterThan(20);
            expect(copy.readPost.length).toBeGreaterThan(3);
        }
    });

    it('markdown files match the rendering collection (frontmatter + body parity)', () => {
        for (const post of BLOG_POSTS) {
            for (const locale of LOCALES) {
                const parsed = parseMarkdown(post.slug, locale);
                const content = blogPostLocale(post, locale);
                expect(parsed.frontmatter.title).toBe(content.title);
                expect(parsed.frontmatter.description).toBe(content.description);
                expect(parsed.frontmatter.date).toBe(post.date);
                expect(parsed.frontmatter.slug).toBe(post.slug);
                expect(parsed.frontmatter.locale).toBe(locale);
                expect(parsed.intro).toBe(content.intro);
                expect(parsed.sections).toEqual(content.sections);
            }
        }
    });

    it('index summaries are newest-first with date + excerpt per locale', () => {
        for (const locale of LOCALES) {
            const summaries = blogSummaries(locale);
            expect(summaries).toHaveLength(BLOG_POSTS.length);
            const dates = summaries.map((s) => s.date);
            expect(dates).toEqual([...dates].sort().reverse());
            for (const summary of summaries) {
                expect(summary.path).toBe(blogPostPath(summary.slug));
                expect(summary.title.length).toBeGreaterThan(5);
                expect(summary.excerpt.length).toBeGreaterThan(20);
                // ar-MA renders Arabic-Indic digits, so only the
                // Latin-digit locales can assert the literal year.
                if (locale === 'ar') expect(formatBlogDate(summary.date, locale).length).toBeGreaterThan(5);
                else expect(formatBlogDate(summary.date, locale)).toContain('2026');
            }
        }
    });

    it('builds valid Article JSON-LD from the rendered content', () => {
        for (const post of BLOG_POSTS) {
            for (const locale of LOCALES) {
                const jsonLd = buildArticleJsonLd(post, locale);
                expect(jsonLd['@type']).toBe('Article');
                expect(jsonLd.headline).toBe(blogPostLocale(post, locale).title);
                expect(jsonLd.datePublished).toBe(post.date);
                expect(jsonLd.url).toContain(blogPostPath(post.slug));
                expect(JSON.stringify(jsonLd)).not.toMatch(/price|offer/i);
            }
        }
    });

    it('census: no prices, no booking CTAs, no first/only/biggest claims in any locale', () => {
        const banned: Array<[string, RegExp]> = [
            ['currency amount', /\b\d+\s?(MAD|EUR|USD|€|\$)\b/],
            ['price wording', /\b(price|prices|pricing|prix|tarif|سعر|أسعار)\b/i],
            ['booking CTA', /\b(book now|book your|réservez|احجز|احجز الآن)\b/i],
            ['first claim', /\b(first|premier|première|الأول|الأولى)\b/i],
            ['only claim', /\b(only|seul|seule|الوحيد|الوحيدة)\b/i],
            ['biggest claim', /\b(biggest|largest|plus grand|plus grande|الأكبر)\b/i],
        ];
        for (const locale of LOCALES) {
            const strings = [
                ...allStrings(blogIndexCopy(locale)),
                ...BLOG_POSTS.flatMap((post) => allStrings(blogPostLocale(post, locale))),
            ];
            expect(strings.length).toBeGreaterThan(10);
            for (const text of strings) {
                for (const [label, pattern] of banned) {
                    expect({ locale, label, text, match: pattern.test(text) }).toEqual(
                        expect.objectContaining({ match: false }),
                    );
                }
            }
        }
    });
});
