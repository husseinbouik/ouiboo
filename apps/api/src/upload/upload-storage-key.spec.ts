import 'reflect-metadata';
import { JwtService } from '@nestjs/jwt';
import { UploadService } from './upload.service';
import { UploadSafetyService } from './upload-safety.service';

const TEST_SECRET = ['unit', 'test', 'signing', 'key'].join('-');

/**
 * Storage-key resolution and deletion (#251/B23).
 *
 * Account deletion and message-attachment moderation both start from a
 * database file reference (a raw storage key or one of the public URL
 * shapes the providers mint) and must land on the exact storage key to
 * delete. These tests pin the accepted shapes and the rejections.
 */
describe('UploadService.resolveStorageKey / deleteFile (#251/B23)', () => {
    const jwt = new JwtService({ secret: TEST_SECRET });
    const deleteObject = jest.fn();
    let service: UploadService;

    beforeEach(async () => {
        jest.clearAllMocks();
        deleteObject.mockResolvedValue(undefined);
        service = new UploadService({ validate: jest.fn() } as unknown as UploadSafetyService, jwt);
        // Wait out the real provider init, then substitute the storage stub.
        await (service as unknown as { initialization: Promise<void> }).initialization;
        (service as unknown as { storageProvider: unknown }).storageProvider = { delete: deleteObject };
    });

    it.each([
        ['raw private key', 'private/user-1/licence.pdf', 'private/user-1/licence.pdf'],
        ['raw trips key', 'trips/agency-1/photo.png', 'trips/agency-1/photo.png'],
        ['S3 public-url form', 'https://cdn.ouiboo.test/trips/agency-1/photo.png', 'trips/agency-1/photo.png'],
        ['S3 virtual-hosted form', 'https://ouiboo.s3.eu-west-3.amazonaws.com/private/user-1/rc.pdf', 'private/user-1/rc.pdf'],
        ['local media URL form', 'http://localhost:3010/api/v1/media/trips/agency-1/photo.png', 'trips/agency-1/photo.png'],
        ['query string is ignored', 'https://cdn.ouiboo.test/trips/agency-1/photo.png?v=2', 'trips/agency-1/photo.png'],
    ])('resolves %s', (_label, reference, expected) => {
        expect(service.resolveStorageKey(reference)).toBe(expected);
    });

    it.each([
        ['empty value', ''],
        ['null', null],
        ['undefined', undefined],
        ['external URL', 'https://evil.example.com/id-scan.jpg'],
        ['API download URL (carries no key)', 'https://api.ouiboo.test/api/v1/bookings/booking-1/payment-proof/file'],
        ['path traversal attempt', 'trips/../../etc/passwd'],
        ['unrelated path', 'https://cdn.ouiboo.test/avatars/user-1.png'],
    ])('does not resolve %s', (_label, reference) => {
        expect(service.resolveStorageKey(reference as string)).toBeNull();
    });

    it('deleteFile passes the validated key to the provider', async () => {
        await service.deleteFile('private/user-1/licence.pdf');
        expect(deleteObject).toHaveBeenCalledWith('private/user-1/licence.pdf');
    });

    it('deleteFileByReference deletes the object behind a stored URL', async () => {
        await expect(
            service.deleteFileByReference('https://cdn.ouiboo.test/trips/agency-1/photo.png'),
        ).resolves.toBe(true);
        expect(deleteObject).toHaveBeenCalledWith('trips/agency-1/photo.png');
    });

    it('deleteFileByReference is a no-op for non-platform references', async () => {
        await expect(
            service.deleteFileByReference('https://evil.example.com/id-scan.jpg'),
        ).resolves.toBe(false);
        expect(deleteObject).not.toHaveBeenCalled();
    });
});
