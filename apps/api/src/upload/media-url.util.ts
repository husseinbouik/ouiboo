/**
 * #447 (Council P2-08): persisted-URL provider coupling.
 *
 * Trip images and agency logos were stored in DB rows as FULL URLs minted
 * from the S3_PUBLIC_URL / API origin that happened to be configured at
 * upload time (#411's root cause: change the public base and every stored
 * row points at the old host). The stored value is now treated as a file
 * REFERENCE, not an address: at read time the storage key is recovered
 * from the reference and the URL is re-derived from the CURRENT public
 * base. Rows written by older deployments (old host, bucket URL, raw key,
 * or an /api/v1/media path) keep working through the same path — that is
 * the back-compat read path. References that are not platform media at
 * all (external URLs) are returned untouched.
 */

/** Public media lives under this storage root (upload.controller resolveFolder). */
const PUBLIC_MEDIA_ROOT = 'trips/';

/**
 * The public base URLs are derived from, mirroring the storage providers:
 * an explicit S3_PUBLIC_URL wins; an S3 deployment without one serves from
 * the bucket URL; otherwise the API serves media itself under /media.
 */
export function currentPublicMediaBase(env: NodeJS.ProcessEnv = process.env): string {
    if (env.S3_PUBLIC_URL) {
        return env.S3_PUBLIC_URL.replace(/\/+$/, '');
    }
    if ((env.STORAGE_PROVIDER || 'local') === 's3' && env.S3_BUCKET) {
        const region = env.S3_REGION || 'us-east-1';
        return `https://${env.S3_BUCKET}.s3.${region}.amazonaws.com`;
    }
    const apiUrl = env.API_URL || 'http://localhost:3010/api/v1';
    let origin = 'http://localhost:3010';
    try {
        origin = new URL(apiUrl).origin;
    } catch {
        // Keep the localhost default; a malformed API_URL is a config error
        // surfaced elsewhere — media derivation must not throw on reads.
    }
    return `${origin}/media`;
}

/**
 * Recover the storage key from a stored media reference, or null when the
 * reference is not platform media (external URL, API download URL, junk).
 */
export function extractPublicMediaKey(reference: string | null | undefined): string | null {
    if (!reference) return null;
    const withoutQuery = reference.split(/[?#]/)[0];
    let decoded = withoutQuery;
    try {
        decoded = decodeURIComponent(withoutQuery);
    } catch {
        // Keep the raw value; the segment checks below reject garbage.
    }
    const normalized = decoded.replace(/\\/g, '/');
    const nestedAt = normalized.indexOf(`/${PUBLIC_MEDIA_ROOT}`);
    const candidate = nestedAt >= 0
        ? normalized.slice(nestedAt + 1)
        : normalized.startsWith(PUBLIC_MEDIA_ROOT)
            ? normalized
            : null;
    if (!candidate) return null;
    const segments = candidate.split('/').filter(Boolean);
    if (segments.length < 2) return null;
    for (const segment of segments) {
        if (segment === '.' || segment === '..' || !/^[a-zA-Z0-9._-]+$/.test(segment)) {
            return null;
        }
    }
    return segments.join('/');
}

/** Re-derive a stored media reference against the current public base. */
export function derivePublicMediaUrl(
    reference: string | null | undefined,
    base: string = currentPublicMediaBase(),
): string | null | undefined {
    if (!reference) return reference;
    const key = extractPublicMediaKey(reference);
    if (!key) return reference;
    return `${base.replace(/\/+$/, '')}/${key}`;
}

/** List form of derivePublicMediaUrl (trip image galleries). */
export function derivePublicMediaUrls(
    references: readonly string[] | null | undefined,
    base: string = currentPublicMediaBase(),
): string[] {
    if (!references) return [];
    return references.map((reference) => derivePublicMediaUrl(reference, base) as string);
}
