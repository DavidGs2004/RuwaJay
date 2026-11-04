// Keep private-media requests bounded and scoped to the signed-in account.
export function createMediaResolver({ getUid, resolve, now = Date.now, concurrency = 2, cooldownMs = 60000 }) {
  const cache = new Map();
  const pending = new Map();
  const blocked = new Map();
  const waiters = [];
  let active = 0;
  const keyFor = (uid, reference) => JSON.stringify([uid, reference]);
  const sessionError = () => new Error('La cuenta cambió. Intenta con la sesión actual.');
  const cachedUrl = reference => {
    if (!reference) return '';
    if (!reference.startsWith('supabase://')) return reference;
    const key = keyFor(getUid(), reference);
    const entry = cache.get(key);
    if (!entry || entry.expiresAt <= now()) {
      cache.delete(key);
      return null;
    }
    return entry.url;
  };
  const enter = async () => {
    while (active >= concurrency) await new Promise(done => waiters.push(done));
    active++;
  };
  const leave = () => {
    active--;
    waiters.shift()?.();
  };
  const resolveUrl = async reference => {
    if (!reference?.startsWith('supabase://')) return reference;
    const uid = getUid();
    if (!uid) throw sessionError();
    const cached = cachedUrl(reference);
    if (cached) return cached;
    const key = keyFor(uid, reference);
    if (pending.has(key)) return pending.get(key);
    const request = (async () => {
      await enter();
      try {
        if (getUid() !== uid) throw sessionError();
        const pause = blocked.get(uid);
        if (pause?.until > now()) throw pause.error;
        const result = await resolve(reference, uid);
        if (getUid() !== uid) throw sessionError();
        if (!result?.url) throw new Error('Archivo no disponible.');
        cache.set(key, { url: result.url, expiresAt: now() + Math.max(0, (Number(result.expiresIn) || 300) - 60) * 1000 });
        return result.url;
      } catch (error) {
        const code = String(error.code || '').toLowerCase().replaceAll('_', '-');
        if ([429,503].includes(error.status) || code === 'resource-exhausted') {
          if (!blocked.get(uid) || blocked.get(uid).until <= now()) {
            blocked.set(uid, { error, until: now() + cooldownMs });
          }
        }
        throw error;
      } finally {
        leave();
      }
    })().finally(() => pending.delete(key));
    pending.set(key, request);
    return request;
  };
  return { cachedUrl, resolveUrl };
}
