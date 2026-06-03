import { generateWorkItemPrefix } from './work-items.utils';

describe('generateWorkItemPrefix', () => {
  it('returns first letter of each of first 3 words for 3-word name', () => {
    expect(generateWorkItemPrefix('HEMS One Rewrite')).toBe('HOR');
  });

  it('returns first 2 letters of word1 + first letter of word2 for 2-word name', () => {
    expect(generateWorkItemPrefix('Task Board')).toBe('TAB');
  });

  it('returns first 3 letters for single-word name', () => {
    expect(generateWorkItemPrefix('Horizon')).toBe('HOR');
  });

  it('always returns uppercase', () => {
    expect(generateWorkItemPrefix('alpha beta gamma')).toBe('ABG');
    expect(generateWorkItemPrefix('ab cd')).toBe('ABC');
    expect(generateWorkItemPrefix('xyz')).toBe('XYZ');
  });

  it('uses only first 3 words when more than 3 are present', () => {
    expect(generateWorkItemPrefix('Alpha Beta Gamma Delta')).toBe('ABG');
  });

  it('handles extra whitespace gracefully', () => {
    expect(generateWorkItemPrefix('  Task   Board  ')).toBe('TAB');
  });
});
