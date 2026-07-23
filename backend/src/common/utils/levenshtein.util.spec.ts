import { levenshtein, bestMatch } from './levenshtein.util';

describe('levenshtein', () => {
  it('returns 0 for identical strings (case-insensitive)', () => {
    expect(levenshtein('email', 'EMAIL')).toBe(0);
  });

  it('returns 1 for single-char substitution', () => {
    expect(levenshtein('email', 'emsil')).toBe(1);
  });

  it('returns >0 for typos', () => {
    expect(levenshtein('date', 'dtae')).toBeGreaterThan(0);
  });
});

describe('bestMatch', () => {
  it('resolves fuzzy alias for email', () => {
    expect(bestMatch('emial', ['email', 'roll_number', 'date'])).toBe('email');
  });

  it('returns null when nothing is close enough', () => {
    expect(bestMatch('xyzzy', ['email', 'roll_number'], 2)).toBeNull();
  });
});
