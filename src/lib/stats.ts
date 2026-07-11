import type { QuizQuestionResult, QuizSession, ViewEvent } from '../types';
import {
  DAY_MS,
  RECENT_WRONG_WINDOW_MS,
  WEAK_LIMIT,
  WEAK_MIN_ASKED,
  WEAK_WINDOW_MS,
  WEEK_MS,
} from './constants';

export const startOfDay = (t: number): number => {
  const d = new Date(t);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};

export type DayViewGroup = {
  /** その日の 0:00（epoch ms） */
  day: number;
  items: { wordId: string; lastAt: number; count: number }[];
};

/** 閲覧ログを日別にグループ化する。日は新しい順、日内は最後に見た時刻の新しい順。同日の同一単語は1件にまとめる */
export const groupViewsByDay = (log: ViewEvent[], now: number, days: number): DayViewGroup[] => {
  const since = startOfDay(now) - (days - 1) * DAY_MS;
  const byDay = new Map<number, Map<string, { lastAt: number; count: number }>>();
  for (const e of log) {
    if (e.at < since) continue;
    const day = startOfDay(e.at);
    let words = byDay.get(day);
    if (!words) {
      words = new Map();
      byDay.set(day, words);
    }
    const item = words.get(e.wordId);
    if (item) {
      item.count += 1;
      item.lastAt = Math.max(item.lastAt, e.at);
    } else {
      words.set(e.wordId, { lastAt: e.at, count: 1 });
    }
  }
  return [...byDay.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([day, words]) => ({
      day,
      items: [...words.entries()]
        .map(([wordId, v]) => ({ wordId, ...v }))
        .sort((a, b) => b.lastAt - a.lastAt),
    }));
};

/** 指定単語の直近 windowMs の閲覧回数 */
export const countRecentViews = (
  log: ViewEvent[],
  wordId: string,
  now: number,
  windowMs: number = WEEK_MS,
): number => {
  const since = now - windowMs;
  return log.filter((e) => e.wordId === wordId && e.at >= since).length;
};

type TimedQuestion = QuizQuestionResult & { finishedAt: number };

const questionsInWindow = (sessions: QuizSession[], now: number, windowMs: number): TimedQuestion[] => {
  const since = now - windowMs;
  const result: TimedQuestion[] = [];
  for (const s of sessions) {
    if (s.finishedAt < since) continue;
    for (const q of s.questions) result.push({ ...q, finishedAt: s.finishedAt });
  }
  return result;
};

/** ○（時間内正解）の判定。正解率の分子はこれのみ */
export const isTimelyCorrect = (q: Pick<QuizQuestionResult, 'correct' | 'timedOut'>): boolean =>
  q.correct && !q.timedOut;

/** 指定単語の直近 windowMs の出題数と時間内正解数 */
export const wordAccuracy = (
  sessions: QuizSession[],
  wordId: string,
  now: number,
  windowMs: number = WEEK_MS,
): { asked: number; timelyCorrect: number } => {
  const questions = questionsInWindow(sessions, now, windowMs).filter((q) => q.wordId === wordId);
  return {
    asked: questions.length,
    timelyCorrect: questions.filter(isTimelyCorrect).length,
  };
};

export type WrongWordSummary = { wordId: string; lastWrongAt: number; wrongCount: number };

/** 直近 windowMs で誤答または時間切れになった単語（新しい順・重複排除） */
export const recentWrongWords = (
  sessions: QuizSession[],
  now: number,
  windowMs: number = RECENT_WRONG_WINDOW_MS,
): WrongWordSummary[] => {
  const wrongs = questionsInWindow(sessions, now, windowMs).filter((q) => !isTimelyCorrect(q));
  const byWord = new Map<string, WrongWordSummary>();
  for (const q of wrongs) {
    const item = byWord.get(q.wordId);
    if (item) {
      item.wrongCount += 1;
      item.lastWrongAt = Math.max(item.lastWrongAt, q.finishedAt);
    } else {
      byWord.set(q.wordId, { wordId: q.wordId, lastWrongAt: q.finishedAt, wrongCount: 1 });
    }
  }
  return [...byWord.values()].sort((a, b) => b.lastWrongAt - a.lastWrongAt);
};

export type WeakWordSummary = { wordId: string; asked: number; timelyCorrect: number; rate: number };

/** 直近 windowMs で minAsked 回以上出題され、時間内正解率が低い順の単語（最大 limit 件） */
export const weakWords = (
  sessions: QuizSession[],
  now: number,
  options?: { windowMs?: number; minAsked?: number; limit?: number },
): WeakWordSummary[] => {
  const { windowMs = WEAK_WINDOW_MS, minAsked = WEAK_MIN_ASKED, limit = WEAK_LIMIT } = options ?? {};
  const byWord = new Map<string, { asked: number; timelyCorrect: number }>();
  for (const q of questionsInWindow(sessions, now, windowMs)) {
    const item = byWord.get(q.wordId) ?? { asked: 0, timelyCorrect: 0 };
    item.asked += 1;
    if (isTimelyCorrect(q)) item.timelyCorrect += 1;
    byWord.set(q.wordId, item);
  }
  return [...byWord.entries()]
    .filter(([, v]) => v.asked >= minAsked)
    .map(([wordId, v]) => ({ wordId, ...v, rate: v.timelyCorrect / v.asked }))
    .sort((a, b) => a.rate - b.rate || b.asked - a.asked || (a.wordId < b.wordId ? -1 : 1))
    .slice(0, limit);
};

export type SessionScore = {
  total: number;
  /** ○: 時間内正解。正解数・正解率はこれのみカウントする */
  timelyCorrect: number;
  /** △: 時間切れ後の正解 */
  overtimeCorrect: number;
  /** ×: 誤答 */
  wrong: number;
  avgElapsedMs: number;
};

export const scoreQuestions = (questions: QuizQuestionResult[]): SessionScore => {
  const total = questions.length;
  const timelyCorrect = questions.filter(isTimelyCorrect).length;
  const overtimeCorrect = questions.filter((q) => q.correct && q.timedOut).length;
  const sum = questions.reduce((acc, q) => acc + q.elapsedMs, 0);
  return {
    total,
    timelyCorrect,
    overtimeCorrect,
    wrong: total - timelyCorrect - overtimeCorrect,
    avgElapsedMs: total === 0 ? 0 : sum / total,
  };
};

export const sessionScore = (session: QuizSession): SessionScore => scoreQuestions(session.questions);

export const latestSessionOfSection = (sessions: QuizSession[], sectionId: string): QuizSession | null => {
  let latest: QuizSession | null = null;
  for (const s of sessions) {
    if (s.sectionId !== sectionId) continue;
    if (!latest || s.finishedAt > latest.finishedAt) latest = s;
  }
  return latest;
};
