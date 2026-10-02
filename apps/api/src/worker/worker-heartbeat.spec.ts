import {
  assertWorkerHeartbeatFresh,
  DEFAULT_WORKER_HEARTBEAT_MAX_AGE_MS,
} from './worker-heartbeat';

describe('worker heartbeat', () => {
  const now = 100_000;

  it('accepts a recent heartbeat', () => {
    expect(() =>
      assertWorkerHeartbeatFresh(
        String(now - DEFAULT_WORKER_HEARTBEAT_MAX_AGE_MS + 1),
        now,
      ),
    ).not.toThrow();
  });

  it('rejects a stale heartbeat', () => {
    expect(() =>
      assertWorkerHeartbeatFresh(
        String(now - DEFAULT_WORKER_HEARTBEAT_MAX_AGE_MS - 1),
        now,
      ),
    ).toThrow('Worker heartbeat is stale or invalid');
  });

  it.each(['not-a-number', String(now + 1)])(
    'rejects invalid heartbeat value %s',
    (value) => {
      expect(() => assertWorkerHeartbeatFresh(value, now)).toThrow(
        'Worker heartbeat is stale or invalid',
      );
    },
  );
});
