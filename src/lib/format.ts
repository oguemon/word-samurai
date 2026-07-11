import { DAY_MS } from './constants';
import { startOfDay } from './stats';

const pad2 = (n: number): string => String(n).padStart(2, '0');

export const formatTime = (t: number): string => {
  const d = new Date(t);
  return `${d.getHours()}:${pad2(d.getMinutes())}`;
};

export const formatMonthDay = (t: number): string => {
  const d = new Date(t);
  return `${d.getMonth() + 1}月${d.getDate()}日`;
};

/** 日別グループの見出し: 今日 / 昨日 / M月D日（年が違えば YYYY年M月D日） */
export const formatDayLabel = (day: number, now: number): string => {
  const today = startOfDay(now);
  if (day === today) return '今日';
  if (day === today - DAY_MS) return '昨日';
  const d = new Date(day);
  const yearNow = new Date(now).getFullYear();
  return d.getFullYear() === yearNow ? formatMonthDay(day) : `${d.getFullYear()}年${formatMonthDay(day)}`;
};

/** 日時表示: 今日 14:32 / 昨日 9:05 / 7月2日 18:05 */
export const formatDateTime = (t: number, now: number): string =>
  `${formatDayLabel(startOfDay(t), now)} ${formatTime(t)}`;

export const formatSeconds = (ms: number): string => `${(ms / 1000).toFixed(2)}秒`;

/** 割合の%表示。分母0は「—」 */
export const formatRate = (numerator: number, denominator: number): string => {
  if (denominator === 0) return '—';
  return `${Math.round((numerator / denominator) * 100)}%`;
};
