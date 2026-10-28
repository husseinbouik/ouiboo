import {
    currentPublicMediaBase,
    derivePublicMediaUrl,
    derivePublicMediaUrls,
    extractPublicMediaKey,
} from './media-url.util';

describe('media-url.util (#447 read-time derivation)', () => {
    const NEW_BASE = 'https://ouiboo-api.vercel.app/media';

    it('re-derives a URL persisted under an old public base onto the current base', () => {
        const stored = 'https://old-bucket.s3.eu-west-1.amazonaws.com/trips/agency-1/photo.jpg';
        expect(derivePublicMediaUrl(stored, NEW_BASE)).toBe(
            'https://ouiboo-api.vercel.app/media/trips/agency-1/photo.jpg',
        );
    });

    it('re-derives a raw storage key', () => {
        expect(derivePublicMediaUrl('trips/agency-1/photo.jpg', NEW_BASE)).toBe(
            'https://ouiboo-api.vercel.app/media/trips/agency-1/photo.jpg',
        );
    });

    it('re-derives an API /media path minted by a previous deployment host', () => {
        const stored = 'https://ouiboo-api-staging.vercel.app/media/trips/agency-1/photo.jpg?x=1';
        expect(derivePublicMediaUrl(stored, NEW_BASE)).toBe(
            'https://ouiboo-api.vercel.app/media/trips/agency-1/photo.jpg',
        );
    });

    it('leaves external (non-platform) URLs untouched', () => {
        const external = 'https://images.unsplash.com/photo-123?w=800';
        expect(derivePublicMediaUrl(external, NEW_BASE)).toBe(external);
        expect(extractPublicMediaKey(external)).toBeNull();
    });

    it('passes through null/empty references', () => {
        expect(derivePublicMediaUrl(null, NEW_BASE)).toBeNull();
        expect(derivePublicMediaUrl(undefined, NEW_BASE)).toBeUndefined();
        expect(derivePublicMediaUrl('', NEW_BASE)).toBe('');
    });

    it('derives a whole gallery and rejects traversal-shaped keys', () => {
        expect(
            derivePublicMediaUrls(
                ['https://cdn.old.example/trips/a/1.jpg', 'trips/a/2.jpg'],
                NEW_BASE,
            ),
        ).toEqual([
            'https://ouiboo-api.vercel.app/media/trips/a/1.jpg',
            'https://ouiboo-api.vercel.app/media/trips/a/2.jpg',
        ]);
        expect(extractPublicMediaKey('trips/../secret.jpg')).toBeNull();
    });

    it('resolves the current base from env in provider order', () => {
        expect(currentPublicMediaBase({ S3_PUBLIC_URL: 'https://cdn.example.com/' } as NodeJS.ProcessEnv)).toBe('https://cdn.example.com');
        expect(
            currentPublicMediaBase({ STORAGE_PROVIDER: 's3', S3_BUCKET: 'bkt', S3_REGION: 'eu-west-1' } as NodeJS.ProcessEnv),
        ).toBe('https://bkt.s3.eu-west-1.amazonaws.com');
        expect(currentPublicMediaBase({ API_URL: 'https://api.example.com/api/v1' } as NodeJS.ProcessEnv)).toBe(
            'https://api.example.com/media',
        );
    });
});
