import { afterEach, describe, expect, it, vi } from 'vitest';

import { createPollingLock } from '@/shared/lib/polling-lock';

function createStorage() {
  const values = new Map<string, string>();

  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  };
}

describe('polling-lock', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('allows only one tab to own a scope at a time', () => {
    vi.stubGlobal('localStorage', createStorage());
    const first = createPollingLock('instance-a');
    const second = createPollingLock('instance-a');

    expect(first.tryAcquire()).toBe(true);
    expect(second.tryAcquire()).toBe(false);

    first.release();

    expect(second.tryAcquire()).toBe(true);
  });
});
