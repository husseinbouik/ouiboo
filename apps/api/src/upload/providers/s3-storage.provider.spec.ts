import { BadRequestException } from '@nestjs/common';
import { S3StorageProvider } from './s3-storage.provider';
import { PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';

describe('S3StorageProvider', () => {
    const originalBucket = process.env.S3_BUCKET;
    const originalPublicUrl = process.env.S3_PUBLIC_URL;
    const originalRegion = process.env.S3_REGION;

    const makeProvider = () => new S3StorageProvider();

    const binaryFile = {
        originalname: 'proof.png',
        mimetype: 'image/png',
        size: 3,
        buffer: Buffer.from([1, 2, 3]),
    } as Express.Multer.File;

    const restoreEnv = (name: string, value: string | undefined) => {
        if (value === undefined) delete process.env[name];
        else process.env[name] = value;
    };

    beforeEach(() => {
        process.env.S3_BUCKET = 'test-bucket';
        process.env.S3_PUBLIC_URL = 'https://cdn.example.com';
        process.env.S3_REGION = 'us-east-1';
    });

    afterAll(() => {
        restoreEnv('S3_BUCKET', originalBucket);
        restoreEnv('S3_PUBLIC_URL', originalPublicUrl);
        restoreEnv('S3_REGION', originalRegion);
    });

    describe('upload', () => {
        it('does not expose a public URL for private-prefix keys', async () => {
            const provider = makeProvider();
            const send = jest.spyOn((provider as any).s3Client, 'send').mockResolvedValue({});

            const result = await provider.upload(binaryFile, 'private/payment-proofs/booking-1');

            expect(result.url).toBe('');
            expect(result.key).toMatch(/^private\/payment-proofs\/booking-1\/[0-9a-f-]{36}\.png$/);
            const put = send.mock.calls[0][0] as PutObjectCommand;
            expect(put).toBeInstanceOf(PutObjectCommand);
            expect(put.input.Key).toBe(result.key);
            expect(put.input.ServerSideEncryption).toBe('AES256');
            send.mockRestore();
        });

        it('returns a public URL for non-private keys', async () => {
            const provider = makeProvider();
            jest.spyOn((provider as any).s3Client, 'send').mockResolvedValue({});

            const result = await provider.upload(binaryFile, 'trip-images');

            expect(result.url).toMatch(/^https:\/\/cdn\.example\.com\/trip-images\/[0-9a-f-]{36}\.png$/);
            expect(result.key).toMatch(/^trip-images\//);
        });
    });

    describe('getFilePath', () => {
        it('refuses to issue a direct path for private keys', () => {
            const provider = makeProvider();
            expect(() => provider.getFilePath('private/payment-proofs/booking-1/x.png')).toThrow(BadRequestException);
        });

        it('still resolves public keys to the configured public URL', () => {
            const provider = makeProvider();
            expect(provider.getFilePath('trip-images/x.png')).toBe('https://cdn.example.com/trip-images/x.png');
        });
    });

    describe('read', () => {
        it('returns buffered private object content with content type', async () => {
            const provider = makeProvider();
            const send = jest.spyOn((provider as any).s3Client, 'send').mockResolvedValue({
                Body: { transformToByteArray: () => Promise.resolve(new Uint8Array([1, 2, 3])) },
                ContentType: 'image/png',
            });

            const result = await provider.read('private/payment-proofs/booking-1/x.png');

            expect(result.data).toEqual(Buffer.from([1, 2, 3]));
            expect(result.contentType).toBe('image/png');
            const get = send.mock.calls[0][0] as GetObjectCommand;
            expect(get).toBeInstanceOf(GetObjectCommand);
            expect(get.input.Key).toBe('private/payment-proofs/booking-1/x.png');
            send.mockRestore();
        });
    });
});