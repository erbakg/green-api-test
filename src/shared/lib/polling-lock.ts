const leaseDurationMs = 12_000;

interface LockRecord {
  owner: string;
  expiresAt: number;
}

function getStorage() {
  try {
    return globalThis.localStorage;
  } catch {
    return null;
  }
}

function createOwnerId() {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function createPollingLock(scope: string) {
  const storage = getStorage();
  const owner = createOwnerId();
  const key = `whatsapp-desk-polling-lock:${encodeURIComponent(scope)}`;

  const read = (): LockRecord | null => {
    if (!storage) {
      return null;
    }

    try {
      const raw = storage.getItem(key);
      const record: unknown = raw ? JSON.parse(raw) : null;

      if (typeof record === 'object' && record !== null && 'owner' in record && 'expiresAt' in record
        && typeof record.owner === 'string' && typeof record.expiresAt === 'number') {
        return record as LockRecord;
      }
    } catch {
      return null;
    }

    return null;
  };

  return {
    tryAcquire() {
      if (!storage) {
        return true;
      }

      const current = read();

      if (current && current.owner !== owner && current.expiresAt > Date.now()) {
        return false;
      }

      try {
        storage.setItem(key, JSON.stringify({ owner, expiresAt: Date.now() + leaseDurationMs } satisfies LockRecord));
        return read()?.owner === owner;
      } catch {
        return true;
      }
    },
    release() {
      if (!storage || read()?.owner !== owner) {
        return;
      }

      try {
        storage.removeItem(key);
      } catch {
        // Ignore storage failures; the lease will expire shortly.
      }
    },
  };
}
