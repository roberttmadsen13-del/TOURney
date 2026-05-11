import { describe, it, expect } from 'vitest';

// Tests the esc() logic — mirrors lib/util.js DOM-based implementation.
// jsdom environment provides document.createElement.
function esc(s) {
  if (s === null || s === undefined) return '';
  const d = document.createElement('div');
  d.textContent = String(s);
  return d.innerHTML;
}

describe('esc()', () => {
  it('escapes ampersand', () => {
    expect(esc('a & b')).toBe('a &amp; b');
  });
  it('escapes angle brackets', () => {
    expect(esc('<script>alert(1)</script>')).toBe('&lt;script&gt;alert(1)&lt;/script&gt;');
  });
  it('returns empty string for null/undefined', () => {
    expect(esc(null)).toBe('');
    expect(esc(undefined)).toBe('');
  });
});
