import { ForbiddenException } from '@nestjs/common';
import { UploadController } from './upload.controller';

/**
 * #665 (Council S6): the generic upload endpoint must not mint
 * instantly-public, unattached files. Public trip assets are agency
 * work; payment proofs go through the private intent (or the
 * booking-bound endpoint) and never receive a public URL.
 */
function makeController() {
  const calls: Array<{ folder: string }> = [];
  const service: any = {
    uploadFile: jest.fn(async (_file: any, folder: string) => {
      calls.push({ folder });
      return { url: '', filename: `${folder}/file.png`, size: 10 };
    }),
  };
  return { controller: new UploadController(service), calls };
}

const file: any = { buffer: Buffer.from('x'), size: 10, mimetype: 'image/png' };

describe('UploadController intents (#665)', () => {
  it('rejects a traveller declaring the public trip-asset purpose through the generic endpoint', async () => {
    const { controller, calls } = makeController();
    await expect(
      controller.uploadFile(file, { intent: 'trip-asset' } as any, { user: { userId: 'traveler-1', role: 'TRAVELER' } }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(calls).toHaveLength(0);
  });

  it('binds an omitted intent for a traveller to their own avatar folder — the default is not a loophole', async () => {
    const { controller, calls } = makeController();
    await controller.uploadFile(file, { intent: undefined } as any, {
      user: { userId: 'traveler-1', role: 'TRAVELER' },
    });
    expect(calls).toEqual([{ folder: 'avatars/traveler-1' }]);
  });

  it('binds an explicit avatar intent to the caller profile for any role', async () => {
    const { controller, calls } = makeController();
    await controller.uploadFile(file, { intent: 'avatar' } as any, {
      user: { userId: 'agency-user-1', role: 'AGENCY', agencyId: 'agency-1' },
    });
    expect(calls).toEqual([{ folder: 'avatars/agency-user-1' }]);
  });

  it('stores a payment proof privately under the caller segment (signed-URL ownership keeps working)', async () => {
    const { controller, calls } = makeController();
    await controller.uploadFile(file, { intent: 'payment-proof' } as any, {
      user: { userId: 'traveler-1', role: 'TRAVELER' },
    });
    expect(calls).toEqual([{ folder: 'private/traveler-1/payment-proofs' }]);
  });

  it('keeps identity documents private and trip assets agency-scoped', async () => {
    const { controller, calls } = makeController();
    await controller.uploadFile(file, { intent: 'identity-document' } as any, {
      user: { userId: 'agency-user-1', role: 'AGENCY', agencyId: 'agency-1' },
    });
    await controller.uploadFile(file, { intent: 'trip-asset' } as any, {
      user: { userId: 'agency-user-1', role: 'AGENCY', agencyId: 'agency-1' },
    });
    expect(calls).toEqual([{ folder: 'private/agency-user-1' }, { folder: 'trips/agency-1' }]);
  });
});
