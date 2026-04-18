import { describe, it, expect } from 'vitest';
import { t } from '../index';

describe('t()', () => {
  it('returns the string in the requested language', () => {
    expect(t('tr', 'picker.back')).toBe('Geri');
    expect(t('en', 'picker.back')).toBe('Back');
    expect(t('zh', 'picker.back')).toBe('返回');
  });

  it('falls back to English when a key is missing for the target lang', () => {
    expect(t('zh', 'nonexistent.key')).toBe('nonexistent.key');
  });

  it('returns the raw key when no language has the string', () => {
    expect(t('tr', 'totally.unknown')).toBe('totally.unknown');
  });
});
