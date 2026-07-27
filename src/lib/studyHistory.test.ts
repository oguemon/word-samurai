import { describe, expect, it } from 'vitest';
import type { QuizQuestionResult, QuizSession, ViewEvent } from '../types';
import { HEAT_LEVELS } from './constants';
import { addDays, startOfDay } from './stats';
import {
  buildStudyHeatmap,
  dailyStudiedWords,
  dailyTestStats,
  heatLevel,
  type DailyTestStat,
} from './studyHistory';

// 2026-07-11（土）12:00（ローカル時刻）
const NOW = new Date(2026, 6, 11, 12, 0, 0).getTime();

/** 指定日時（NOW からの日数ずらし＋時刻）の epoch ms */
const at = (daysAgo: number, hour: number, minute = 0): number => {
  const d = new Date(addDays(NOW, -daysAgo));
  d.setHours(hour, minute, 0, 0);
  return d.getTime();
};

const q = (wordId: string, correct: boolean, timedOut = false): QuizQuestionResult => ({
  wordId,
  selected: 'x',
  correct,
  elapsedMs: 400,
  timedOut,
});

const session = (id: string, finishedAt: number, questions: QuizQuestionResult[]): QuizSession => ({
  id,
  sectionId: 'sec1',
  finishedAt,
  questions,
});

describe('buildStudyHeatmap', () => {
  it('時間帯×曜日のマスに、延べ回数ではなく単語数を集計する', () => {
    const log: ViewEvent[] = [
      // 土曜 9時台に a を2回・b を1回 → 単語数は2
      { wordId: 'a', at: at(0, 9, 5) },
      { wordId: 'a', at: at(0, 9, 40) },
      { wordId: 'b', at: at(0, 9, 50) },
      // 1週間前の土曜 9時台の a も同じマスに入るが、a は既に数えているので増えない
      { wordId: 'a', at: at(7, 9) },
      // 金曜 22時台
      { wordId: 'c', at: at(1, 22) },
    ];
    const { cells, max } = buildStudyHeatmap(log, NOW);
    expect(cells).toHaveLength(24);
    expect(cells[0]).toHaveLength(7);
    expect(cells[9][6]).toBe(2); // 9時台 × 土曜
    expect(cells[22][5]).toBe(1); // 22時台 × 金曜
    expect(max).toBe(2);
  });

  it('対象週数より古い閲覧は含めない', () => {
    const log: ViewEvent[] = [
      { wordId: 'old', at: at(28, 9) }, // 4週間（28日）前は範囲外
      { wordId: 'new', at: at(27, 9) }, // 27日前は範囲内
    ];
    const { cells, max } = buildStudyHeatmap(log, NOW);
    expect(max).toBe(1);
    expect(cells.flat().reduce((a, b) => a + b, 0)).toBe(1);
  });

  it('閲覧が無ければ全マス0になる', () => {
    const { cells, max } = buildStudyHeatmap([], NOW);
    expect(max).toBe(0);
    expect(cells.flat().every((v) => v === 0)).toBe(true);
  });
});

describe('heatLevel', () => {
  it('0と最大値のときの段数', () => {
    expect(heatLevel(0, 10)).toBe(0);
    expect(heatLevel(10, 10)).toBe(HEAT_LEVELS);
  });

  it('1件でも学習していれば必ず1以上になる', () => {
    expect(heatLevel(1, 1000)).toBe(1);
  });

  it('最大値に対する割合で段階分けする', () => {
    expect(heatLevel(2, 8)).toBe(1);
    expect(heatLevel(3, 8)).toBe(2);
    expect(heatLevel(5, 8)).toBe(3);
    expect(heatLevel(7, 8)).toBe(4);
  });

  it('最大値が0なら0を返す（0除算しない）', () => {
    expect(heatLevel(0, 0)).toBe(0);
  });
});

describe('dailyStudiedWords', () => {
  it('同じ日の同一単語は1件として数える', () => {
    const log: ViewEvent[] = [
      { wordId: 'a', at: at(0, 9) },
      { wordId: 'a', at: at(0, 20) },
      { wordId: 'b', at: at(0, 21) },
      { wordId: 'a', at: at(1, 9) },
    ];
    const days = dailyStudiedWords(log, NOW, 3);
    expect(days.map((d) => d.words)).toEqual([0, 1, 2]);
  });

  it('学習が無い日も0件で埋め、古い順に対象日数ぶん返す', () => {
    const days = dailyStudiedWords([], NOW, 5);
    expect(days).toHaveLength(5);
    expect(days[0].day).toBe(addDays(NOW, -4));
    expect(days[4].day).toBe(startOfDay(NOW));
    expect(days.every((d) => d.words === 0)).toBe(true);
  });

  it('対象日数より古い閲覧は含めない', () => {
    const log: ViewEvent[] = [{ wordId: 'a', at: at(3, 9) }];
    expect(dailyStudiedWords(log, NOW, 3).every((d) => d.words === 0)).toBe(true);
  });
});

describe('dailyTestStats', () => {
  it('同一セクションでも受けた回数ぶん数え、平均正解率は時間内正解のみで計算する', () => {
    const sessions = [
      session('s1', at(0, 10), [q('a', true), q('b', false)]),
      session('s2', at(0, 11), [q('a', true), q('b', true, true)]), // △は正解に含めない
      session('s3', at(1, 10), [q('a', true)]),
    ];
    const days = dailyTestStats(sessions, NOW, 2);
    expect(days.map((d) => d.tests)).toEqual([1, 2]);
    expect(days[1]).toEqual<DailyTestStat>({
      day: startOfDay(NOW),
      tests: 2,
      asked: 4,
      timelyCorrect: 2,
      rate: 0.5,
    });
  });

  it('テストが無い日は0件・正解率 null になる', () => {
    const days = dailyTestStats([], NOW, 3);
    expect(days).toHaveLength(3);
    expect(days.every((d) => d.tests === 0 && d.rate === null)).toBe(true);
  });

  it('対象日数より古いテストは含めない', () => {
    const sessions = [session('s1', at(5, 10), [q('a', true)])];
    expect(dailyTestStats(sessions, NOW, 3).every((d) => d.tests === 0)).toBe(true);
  });
});
