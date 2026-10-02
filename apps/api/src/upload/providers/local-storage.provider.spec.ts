import { BadRequestException, NotFoundException } from '@nestjs/common';
import { LocalStorageProvider } from './local-storage.provider';
import * as fs from 'fs';
import * as path from 'path';

describe('LocalStorageProvider', () => {
    const provider = new LocalStorageProvider();

    it('rejects traversal when resolving stored file paths', () => {
        expect(() => provider.getFilePath('../package.json')).toThrow(BadRequestException);
        expect(() => provider.getFilePath('private/../../package.json')).toThrow(BadRequestException);
    });

    it('still reports missing safe files as not found', () => {
        expect(() => provider.getFilePath('missing/safe-file.png')).toThrow(NotFoundException);
    });

    it('does not expose a public URL for private-prefix uploads', async () => {
        const file = {
            originalname: 'proof.png',
            mimetype: 'image/png',
            size: 3,
            buffer: Buffer.from([1, 2, 3]),
        } as Express.Multer.File;

        const uploaded = await provider.upload(file, 'private/test-read');

        expect(uploaded.url).toBe('');
        expect(uploaded.key).toMatch(/^private\/test-read\/[0-9a-f-]{36}\.png$/);

        const result = await provider.read(uploaded.key);
        expect(result.data).toEqual(Buffer.from([1, 2, 3]));
        expect(result.contentType).toBe('image/png');

        await provider.delete(uploaded.key);
        const relativeDir = path.resolve(process.cwd(), 'private-uploads', 'test-read');
        if (fs.existsSync(relativeDir)) fs.rmdirSync(relativeDir);
    });
});
