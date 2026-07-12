import { describe, expect, it } from 'vitest';
import { dictionary } from '../data/dictionary';
import { sectionBadge, sectionBadgeContrast, sectionHue } from './sectionColor';

describe('sectionHue', () => {
  it('通し位置で色相環を等分する', () => {
    expect(sectionHue(0, 4)).toBe(0);
    expect(sectionHue(1, 4)).toBe(90);
    expect(sectionHue(2, 4)).toBe(180);
    expect(sectionHue(3, 4)).toBe(270);
  });

  it('total が 0 や index が負でも 0 を返す（落ちない）', () => {
    expect(sectionHue(0, 0)).toBe(0);
    expect(sectionHue(-1, 4)).toBe(0);
  });
});

describe('sectionBadge', () => {
  it('鮮やかな hsl 背景色と、白または黒の文字色を返す', () => {
    const badge = sectionBadge(1, 4);
    expect(badge.bg).toBe('hsl(90, 80%, 47%)');
    expect(['#ffffff', '#000000']).toContain(badge.fg);
  });
});

describe('sectionBadgeContrast（a11y）', () => {
  it('どの色相でも WCAG AA（4.5:1）以上のコントラストを満たす', () => {
    const totals = [4, 8, dictionary.sections.length];
    for (const total of totals) {
      for (let i = 0; i < total; i++) {
        expect(sectionBadgeContrast(i, total)).toBeGreaterThanOrEqual(4.5);
      }
    }
  });
});
