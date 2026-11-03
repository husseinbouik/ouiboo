import { MessagesController } from './messages.controller';

describe('MessagesController rate-limit contract', () => {
  it('protects sends with the distributed, fail-closed rate-limit guard', () => {
    const handler = MessagesController.prototype.sendMessage;
    const rateLimit = Reflect.getMetadata('ouiboo:rate-limit', handler);

    expect(rateLimit).toEqual({
      points: 20,
      windowMs: 60_000,
      keyPrefix: 'messages:send',
    });
    expect(Reflect.getMetadata('ouiboo:rate-limit-sensitive', handler)).toBe(true);
  });
});
