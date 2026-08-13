// Best-effort in-memory rate limit. Netlify Functions are stateless between
// cold starts, so this won't catch a determined, distributed attacker — but
// it stops the common case (a script hammering one IP) for free, with no
// extra infrastructure. If abuse becomes a real problem, upgrade this to a
// Neon-backed counter or Netlify's edge rate limiting.
const hits = new Map<string, number[]>();

export function isRateLimited(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const timestamps = (hits.get(key) || []).filter((t) => now - t < windowMs);
  timestamps.push(now);
  hits.set(key, timestamps);
  return timestamps.length > max;
}
