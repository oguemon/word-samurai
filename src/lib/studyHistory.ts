// 学習履歴ページ用の集計（純関数）。グラフ描画ライブラリに依存する型は一切持ち込まない
import type { QuizSession, ViewEvent } from '../types';
import { HEAT_LEVELS, STUDY_HEATMAP_WEEKS, STUDY_HISTORY_DAYS } from './constants';
import { addDays, isTimelyCorrect, startOfDay } from './stats';

export const HOURS_PER_DAY = 24;
export const DAYS_PER_WEEK = 7;

/** 曜日の表示名。添字は Date#getDay() に対応（0=日） */
export const WEEKDAY_LABELS = ['日', '月', '火', '水', '木', '金', '土'] as const;

export type StudyHeatmap = {
  /** cells[時間帯 0〜23][曜日 0=日〜6=土] = そのマスで学習した単語数（同一単語は1件として集計） */
  cells: number[][];
  /** 最も学習した単語数が多いマスの値（全マス0なら0） */
  max: number;
  /** 集計対象期間の開始日 0:00 */
  from: number;
};

/**
 * 閲覧ログを「時間帯 × 曜日」に集計する。直近 weeks 週（今日を含む weeks×7 日）が対象。
 * 各マスの値は延べ閲覧回数ではなく単語数（同じマスに入る同一単語は1件）。
 */
export const buildStudyHeatmap = (
  log: ViewEvent[],
  now: number,
  weeks: number = STUDY_HEATMAP_WEEKS,
): StudyHeatmap => {
  const from = addDays(startOfDay(now), -(weeks * DAYS_PER_WEEK - 1));
  const buckets = Array.from({ length: HOURS_PER_DAY }, () =>
    Array.from({ length: DAYS_PER_WEEK }, () => new Set<string>()),
  );
  for (const e of log) {
    if (e.at < from) continue;
    const d = new Date(e.at);
    buckets[d.getHours()][d.getDay()].add(e.wordId);
  }
  const cells = buckets.map((row) => row.map((words) => words.size));
  const max = cells.reduce((acc, row) => Math.max(acc, ...row), 0);
  return { cells, max, from };
};

/** マスの濃さ。0＝学習なし、1〜HEAT_LEVELS は最大値に対する相対的な濃さ */
export const heatLevel = (value: number, max: number): number => {
  if (value <= 0 || max <= 0) return 0;
  return Math.max(1, Math.min(HEAT_LEVELS, Math.ceil((value / max) * HEAT_LEVELS)));
};

/** 期間内の各日の 0:00 を古い順に並べる（学習の無い日も欠けさせない） */
const eachDay = (fromDay: number, days: number): number[] =>
  Array.from({ length: days }, (_, i) => addDays(fromDay, i));

export type DailyWordCount = {
  /** その日の 0:00（epoch ms） */
  day: number;
  /** その日に学習した単語数（延べ回数ではなく実質数） */
  words: number;
};

/** 直近 days 日の日別「学習した単語数」。同じ日に同じ単語を何回見ても1件。閲覧が無い日も0で含む（古い順） */
export const dailyStudiedWords = (
  log: ViewEvent[],
  now: number,
  days: number = STUDY_HISTORY_DAYS,
): DailyWordCount[] => {
  const from = addDays(startOfDay(now), -(days - 1));
  const byDay = new Map<number, Set<string>>();
  for (const e of log) {
    if (e.at < from) continue;
    const day = startOfDay(e.at);
    const words = byDay.get(day);
    if (words) {
      words.add(e.wordId);
    } else {
      byDay.set(day, new Set([e.wordId]));
    }
  }
  return eachDay(from, days).map((day) => ({ day, words: byDay.get(day)?.size ?? 0 }));
};

export type DailyTestStat = {
  /** その日の 0:00（epoch ms） */
  day: number;
  /** その日に受けたテストの回数。同一セクションを繰り返し受けても別々に数える */
  tests: number;
  /** その日に出題された総問題数 */
  asked: number;
  /** うち時間内正解（○）の数 */
  timelyCorrect: number;
  /** 平均正解率（0〜1）。その日の全問題に対する時間内正解の割合。出題が無い日は null */
  rate: number | null;
};

/** 直近 days 日の日別「テスト回数と平均正解率」。テストが無い日も0件で含む（古い順） */
export const dailyTestStats = (
  sessions: QuizSession[],
  now: number,
  days: number = STUDY_HISTORY_DAYS,
): DailyTestStat[] => {
  const from = addDays(startOfDay(now), -(days - 1));
  const byDay = new Map<number, { tests: number; asked: number; timelyCorrect: number }>();
  for (const s of sessions) {
    if (s.finishedAt < from) continue;
    const day = startOfDay(s.finishedAt);
    const acc = byDay.get(day) ?? { tests: 0, asked: 0, timelyCorrect: 0 };
    acc.tests += 1;
    acc.asked += s.questions.length;
    acc.timelyCorrect += s.questions.filter(isTimelyCorrect).length;
    byDay.set(day, acc);
  }
  return eachDay(from, days).map((day) => {
    const acc = byDay.get(day) ?? { tests: 0, asked: 0, timelyCorrect: 0 };
    return { day, ...acc, rate: acc.asked === 0 ? null : acc.timelyCorrect / acc.asked };
  });
};

export type StudyHistory = {
  heatmap: StudyHeatmap;
  dailyWords: DailyWordCount[];
  dailyTests: DailyTestStat[];
};

/** 学習履歴ページが必要とする集計を一度にまとめて行う（重い処理はここに集約する） */
export const buildStudyHistory = (input: {
  viewLog: ViewEvent[];
  quizLog: QuizSession[];
  now: number;
}): StudyHistory => ({
  heatmap: buildStudyHeatmap(input.viewLog, input.now),
  dailyWords: dailyStudiedWords(input.viewLog, input.now),
  dailyTests: dailyTestStats(input.quizLog, input.now),
});
