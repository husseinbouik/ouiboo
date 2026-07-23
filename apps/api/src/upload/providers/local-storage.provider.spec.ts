import { BadRequestException, NotFoundException } from '@nestjs/common';
import { LocalStorageProvider } from './local-storage.provider';

describe('LocalStorageProvider', () => {
    const provider = new LocalStorageProvider();

    it('rejects traversal when resolving stored file paths', () => {
        expect(() => provider.getFilePath('../package.json')).toThrow(BadRequestException);
        expect(() => provider.getFilePath('private/../../package.json')).toThrow(BadRequestException);
    });

    it('still reports missing safe files as not found', () => {
        expect(() => provider.getFilePath('missing/safe-file.png')).toThrow(NotFoundException);
    });
});
