/**
 * @jest-environment jsdom
 */
import { isPushSupported, urlBase64ToUint8Array } from './push-notifications';

describe('push-notifications helpers (#784)', () => {
  it('converts a base64url VAPID key to bytes', () => {
    // 'SGVsbG8' is base64url for the ASCII bytes of "Hello".
    const bytes = urlBase64ToUint8Array('SGVsbG8');
    expect(Array.from(bytes)).toEqual([72, 101, 108, 108, 111]);
  });

  it('handles url-safe characters and missing padding', () => {
    // Bytes [251, 255, 190] encode as '-_--' in base64url.
    const bytes = urlBase64ToUint8Array('-_--');
    expect(Array.from(bytes)).toEqual([251, 255, 190]);
  });

  it('reports push as unsupported when PushManager is absent (jsdom)', () => {
    expect('PushManager' in window).toBe(false);
    expect(isPushSupported()).toBe(false);
  });
});
