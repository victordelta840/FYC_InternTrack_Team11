/**
 * Levenshtein distance (iterative, O(m*n) time, O(n) space).
 * Used for fuzzy matching import headers to canonical fields.
 */
export function levenshtein(a: string, b: string): number {
  const s = a.toLowerCase();
  const t = b.toLowerCase();
  if (s === t) return 0;
  if (!s.length) return t.length;
  if (!t.length) return s.length;

  let prev = new Array(t.length + 1);
  for (let j = 0; j <= t.length; j++) prev[j] = j;

  for (let i = 1; i <= s.length; i++) {
    const curr = new Array(t.length + 1);
    curr[0] = i;
    for (let j = 1; j <= t.length; j++) {
      const cost = s[i - 1] === t[j - 1] ? 0 : 1;
      curr[j] = Math.min(curr[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
    }
    prev = curr;
  }
  return prev[t.length];
}

export function bestMatch(input: string, candidates: string[], maxDistance = 3): string | null {
  let best: { name: string; d: number } | null = null;
  for (const c of candidates) {
    const d = levenshtein(input, c);
    if (d <= maxDistance && (!best || d < best.d)) best = { name: c, d };
  }
  return best?.name ?? null;
}
