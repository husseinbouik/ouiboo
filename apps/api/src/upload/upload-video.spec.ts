import { BadRequestException } from '@nestjs/common';
import { UploadController } from './upload.controller';
import { UploadSafetyService } from './upload-safety.service';
import { MAX_REVIEW_VIDEO_SIZE_BYTES, MAX_UPLOAD_SIZE_BYTES } from './upload.constants';

/**
 * #783 (Council S6 Phase 3): video reviews — the `review-video`
 * upload intent. Videos are private from birth (`url: ""`), bound to
 * the caller's own `review-videos/` segment, capped at 50MB, and
 * restricted to MP4/WebM/MOV — enforced server-side per intent, in
 * the controller (mime + size per intent) and in the safety service
 * (container magic bytes), never through the generic image pipe.
 */
function makeController() {
  const calls: Array<{ folder: string }> = [];
  const service: any = {
    uploadFile: jest.fn(async (_file: any, folder: string) => {
      calls.push({ folder });
      // Mirrors both storage providers: private keys never get a URL.
      const isPrivate = folder === 'private' || folder.startsWith('private/');
      return { url: isPrivate ? '' : 'https://example.test/file', filename: `${folder}/file`, size: _file.size };
    }),
  };
  return { controller: new UploadController(service), calls };
}

const traveler = { user: { userId: 'traveler-1', role: 'TRAVELER' } };
const mp4File: any = { buffer: Buffer.from('x'), size: 1024, mimetype: 'video/mp4' };
const pngFile: any = { buffer: Buffer.from('x'), size: 1024, mimetype: 'image/png' };

describe('UploadController review-video intent (#783)', () => {
  it('stores a review video privately under the caller review-videos segment, with no public URL', async () => {
    const { controller, calls } = makeController();
    const result: any = await controller.uploadFile(mp4File, { intent: 'review-video' } as any, traveler);
    expect(calls).toEqual([{ folder: 'private/traveler-1/review-videos' }]);
    expect(result.url).toBe('');
  });

  it('accepts a video up to the 50MB video cap', async () => {
    const { controller, calls } = makeController();
    const big = { ...mp4File, size: MAX_REVIEW_VIDEO_SIZE_BYTES };
    await controller.uploadFile(big, { intent: 'review-video' } as any, traveler);
    expect(calls).toHaveLength(1);
  });

  it('rejects a video above the 50MB cap', async () => {
    const { controller, calls } = makeController();
    const big = { ...mp4File, size: MAX_REVIEW_VIDEO_SIZE_BYTES + 1 };
    await expect(
      controller.uploadFile(big, { intent: 'review-video' } as any, traveler),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(calls).toHaveLength(0);
  });

  it('rejects a non-video file sent with the review-video intent', async () => {
    const { controller, calls } = makeController();
    await expect(
      controller.uploadFile(pngFile, { intent: 'review-video' } as any, traveler),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(calls).toHaveLength(0);
  });

  it('rejects a video sent with any other intent (review-photo, avatar, payment-proof)', async () => {
    const { controller, calls } = makeController();
    for (const intent of ['review-photo', 'avatar', 'payment-proof', 'identity-document'] as const) {
      await expect(
        controller.uploadFile(mp4File, { intent } as any, traveler),
      ).rejects.toBeInstanceOf(BadRequestException);
    }
    expect(calls).toHaveLength(0);
  });

  it('keeps the 5MB cap on non-video intents even though the pipe bounds 50MB', async () => {
    const { controller, calls } = makeController();
    const bigPng = { ...pngFile, size: MAX_UPLOAD_SIZE_BYTES + 1 };
    await expect(
      controller.uploadFile(bigPng, { intent: 'review-photo' } as any, traveler),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(calls).toHaveLength(0);
  });
});

// Minimal container fixtures: only the signature bytes the safety
// service inspects.
function mp4Buffer(brand = 'isom'): Buffer {
  return Buffer.concat([
    Buffer.from([0x00, 0x00, 0x00, 0x18]),
    Buffer.from('ftyp', 'ascii'),
    Buffer.from(brand.padEnd(4, ' '), 'ascii'),
    Buffer.from([0x00, 0x00, 0x02, 0x00]),
    Buffer.from('isomiso2', 'ascii'),
  ]);
}
function webmBuffer(): Buffer {
  return Buffer.concat([
    Buffer.from([0x1a, 0x45, 0xdf, 0xa3]),
    Buffer.from([0x93, 0x42, 0x82, 0x88]),
    Buffer.from('webm', 'ascii'),
  ]);
}
function pngBuffer(): Buffer {
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    Buffer.from([0x00, 0x00, 0x00, 0x0d]),
    Buffer.from('IHDR', 'ascii'),
    Buffer.from([0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01]),
  ]);
}

describe('UploadSafetyService video branch (#783)', () => {
  const safety = new UploadSafetyService();
  const asFile = (buffer: Buffer, mimetype: string, size = buffer.length): any => ({
    buffer,
    mimetype,
    size,
  });

  it('accepts real MP4, WebM and MOV (QuickTime brand) containers', () => {
    expect(() => safety.validate(asFile(mp4Buffer(), 'video/mp4'))).not.toThrow();
    expect(() => safety.validate(asFile(webmBuffer(), 'video/webm'))).not.toThrow();
    expect(() => safety.validate(asFile(mp4Buffer('qt'), 'video/quicktime'))).not.toThrow();
  });

  it('rejects content that does not match the declared video type', () => {
    // A PNG relabelled as MP4, and containers swapped between types.
    expect(() => safety.validate(asFile(pngBuffer(), 'video/mp4'))).toThrow(BadRequestException);
    expect(() => safety.validate(asFile(mp4Buffer(), 'video/webm'))).toThrow(BadRequestException);
    expect(() => safety.validate(asFile(webmBuffer(), 'video/mp4'))).toThrow(BadRequestException);
    // An MP4-branded file declared as QuickTime (brand is not `qt  `).
    expect(() => safety.validate(asFile(mp4Buffer('isom'), 'video/quicktime'))).toThrow(
      BadRequestException,
    );
  });

  it('rejects a video above the 50MB cap at the safety layer too', () => {
    const file = asFile(mp4Buffer(), 'video/mp4', MAX_REVIEW_VIDEO_SIZE_BYTES + 1);
    expect(() => safety.validate(file)).toThrow(BadRequestException);
  });
});
