// セクションごとに一意な色を割り当てる補助。
// セクションの通し位置から色相環を等分し、鮮やかな背景色を作る。
// 文字色は背景の相対輝度から白/黒のコントラスト比が高い方を選び、WCAG AA（4.5:1）を満たす。

/** バッジ背景の彩度・明度（鮮やかさと可読性の両立点） */
const BADGE_SATURATION = 0.8;
const BADGE_LIGHTNESS = 0.47;

/** セクションの通し位置（0始まり）から割り当てる色相（0–359） */
export const sectionHue = (index: number, total: number): number => {
  if (total <= 0 || index < 0) return 0;
  return Math.round((index * 360) / total) % 360;
};

/** HSL（h:0–360, s/l:0–1）を RGB（各 0–1）へ変換 */
const hslToRgb = (h: number, s: number, l: number): [number, number, number] => {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const hp = h / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));
  const m = l - c / 2;
  const [r, g, b] =
    hp < 1
      ? [c, x, 0]
      : hp < 2
        ? [x, c, 0]
        : hp < 3
          ? [0, c, x]
          : hp < 4
            ? [0, x, c]
            : hp < 5
              ? [x, 0, c]
              : [c, 0, x];
  return [r + m, g + m, b + m];
};

/** sRGB（各 0–1）の相対輝度（WCAG） */
const relativeLuminance = ([r, g, b]: [number, number, number]): number => {
  const lin = (v: number): number => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
};

/** 相対輝度 l1, l2 のコントラスト比 */
const contrast = (l1: number, l2: number): number =>
  (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);

const badgeLuminance = (index: number, total: number): number =>
  relativeLuminance(hslToRgb(sectionHue(index, total), BADGE_SATURATION, BADGE_LIGHTNESS));

export type SectionBadge = {
  /** 背景色（CSS の色文字列） */
  bg: string;
  /** 文字色。白か黒のうちコントラスト比が高い方 */
  fg: string;
};

/** セクションバッジの背景色と、AA を満たす文字色を返す */
export const sectionBadge = (index: number, total: number): SectionBadge => {
  const hue = sectionHue(index, total);
  const lum = badgeLuminance(index, total);
  // 純白/純黒のうちコントラスト比が高い方を採用（どの色相でも最低 4.5:1 以上になる）
  const fg = contrast(lum, 1) >= contrast(lum, 0) ? '#ffffff' : '#000000';
  return {
    bg: `hsl(${hue}, ${Math.round(BADGE_SATURATION * 100)}%, ${Math.round(BADGE_LIGHTNESS * 100)}%)`,
    fg,
  };
};

/** バッジ背景と文字色のコントラスト比（a11y 確認・テスト用） */
export const sectionBadgeContrast = (index: number, total: number): number => {
  const lum = badgeLuminance(index, total);
  return Math.max(contrast(lum, 1), contrast(lum, 0));
};
