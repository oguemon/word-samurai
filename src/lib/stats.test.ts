import { describe, expect, it } from 'vitest';
import type { QuizQuestionResult, QuizSession, ViewEvent } from '../types';
import { DAY_MS, WEEK_MS } from './constants';
import {
  countRecentViews,
  frequentlyMissedWordIds,
  groupViewsByDay,
  latestSessionOfSection,
  recentWrongWords,
  scoreQuestions,
  startOfDay,
  weakWords,
  wordAccuracy,
} from './stats';

// 2026-07-11 12:00（ローカル時刻）
const NOW = new Date(2026, 6, 11, 12, 0, 0).getTime();

const q = (wordId: string, correct: boolean, timedOut: boolean, elapsedMs = 400): QuizQuestionResult => ({
  wordId,
  selected: 'x',
  correct,
  elapsedMs,
  timedOut,
});

const session = (id: string, finishedAt: number, questions: QuizQuestionResult[]): QuizSession => ({
  id,
  sectionId: 'sec1',
  finishedAt,
  questions,
});

describe('groupViewsByDay', () => {
  it('日別に新しい順でグループ化し、同日の同一単語は1件にまとめる', () => {
    const log: ViewEvent[] = [
      { wordId: 'a', at: NOW - 2 * DAY_MS },
      { wordId: 'a', at: NOW - 60_000 },
      { wordId: 'a', at: NOW - 30_000 },
      { wordId: 'b', at: NOW - 10_000 },
    ];
    const groups = groupViewsByDay(log, NOW, 30);
    expect(groups).toHaveLength(2);
    expect(groups[0].day).toBe(startOfDay(NOW));
    expect(groups[0].items).toEqual([
      { wordId: 'b', lastAt: NOW - 10_000, count: 1 },
      { wordId: 'a', lastAt: NOW - 30_000, count: 2 },
    ]);
    expect(groups[1].items[0].wordId).toBe('a');
  });

  it('期間外の閲覧は含めない', () => {
    const log: ViewEvent[] = [{ wordId: 'old', at: NOW - 40 * DAY_MS }];
    expect(groupViewsByDay(log, NOW, 30)).toHaveLength(0);
  });
});

describe('countRecentViews', () => {
  it('直近1週間の対象単語の閲覧だけを数える', () => {
    const log: ViewEvent[] = [
      { wordId: 'a', at: NOW - WEEK_MS - 1000 },
      { wordId: 'a', at: NOW - 1000 },
      { wordId: 'b', at: NOW - 2000 },
      { wordId: 'a', at: NOW - 3000 },
    ];
    expect(countRecentViews(log, 'a', NOW)).toBe(2);
  });
});

describe('wordAccuracy', () => {
  it('時間内正解のみを正解として数え、期間外の出題は含めない', () => {
    const sessions = [
      session('s1', NOW - 1000, [q('a', true, false), q('a', true, true), q('a', false, false), q('b', true, false)]),
      session('s2', NOW - WEEK_MS - 1000, [q('a', true, false)]),
    ];
    expect(wordAccuracy(sessions, 'a', NOW)).toEqual({ asked: 3, timelyCorrect: 1 });
  });
});

describe('recentWrongWords', () => {
  it('誤答と時間切れの正解を「間違えた」として新しい順に返す', () => {
    const sessions = [
      session('s1', NOW - 2000, [q('a', false, false), q('b', true, true), q('c', true, false)]),
      session('s2', NOW - 1000, [q('a', false, true)]),
    ];
    const result = recentWrongWords(sessions, NOW);
    expect(result.map((r) => r.wordId)).toEqual(['a', 'b']);
    expect(result[0]).toEqual({ wordId: 'a', lastWrongAt: NOW - 1000, wrongCount: 2 });
  });
});

describe('weakWords', () => {
  it('最低出題数を満たす単語を時間内正解率の低い順に返す', () => {
    const sessions = [
      session('s1', NOW - 1000, [q('a', true, false), q('b', false, false), q('c', true, false)]),
      session('s2', NOW - 2000, [q('a', true, false), q('b', true, false), q('c', false, false)]),
      session('s3', NOW - 3000, [q('c', true, false)]),
    ];
    // a: 2/2, b: 1/2, c: 2/3
    expect(weakWords(sessions, NOW).map((r) => r.wordId)).toEqual(['b', 'c', 'a']);
  });

  it('出題数が足りない単語は除外する', () => {
    const sessions = [session('s1', NOW - 1000, [q('a', false, false)])];
    expect(weakWords(sessions, NOW)).toHaveLength(0);
  });
});

describe('frequentlyMissedWordIds', () => {
  // 10単語を出題し、a: 0/2, b: 1/2, c: 1/2, d〜j: 2/2 とする
  const tenWords = () => [
    session('s1', NOW - 1000, [
      q('a', false, false),
      q('b', true, false),
      q('c', false, false),
      ...['d', 'e', 'f', 'g', 'h', 'i', 'j'].map((id) => q(id, true, false)),
    ]),
    session('s2', NOW - 2000, [
      q('a', true, true),
      q('b', false, false),
      q('c', true, false),
      ...['d', 'e', 'f', 'g', 'h', 'i', 'j'].map((id) => q(id, true, false)),
    ]),
  ];

  it('間違いのある単語を正答率の低い順に、出題済み単語数の20%（切り上げ）だけ返す', () => {
    // 出題済み10語 → ceil(10 × 0.2) = 2件。候補は a(0%), b(50%), c(50%) で、同率はID昇順
    expect(frequentlyMissedWordIds(tenWords(), NOW)).toEqual(['a', 'b']);
  });

  it('全問時間内正解の単語は含めない', () => {
    const sessions = [session('s1', NOW - 1000, [q('a', true, false), q('b', true, false)])];
    expect(frequentlyMissedWordIds(sessions, NOW)).toEqual([]);
  });

  it('正答率が60%を超える単語は、下位順位でも含めない（克服済み扱い）', () => {
    // a: 3/5 = 60%（ちょうど60% → 含む）、b: 2/3 ≈ 67%（含めない）、c〜j: 全問正解
    const sessions = [
      session('s1', NOW - 1000, [
        q('a', true, false),
        q('a', true, false),
        q('a', true, false),
        q('a', false, false),
        q('a', false, false),
        q('b', true, false),
        q('b', true, false),
        q('b', false, false),
        ...['c', 'd', 'e', 'f', 'g', 'h', 'i', 'j'].map((id) => q(id, true, false)),
      ]),
    ];
    // 出題済み10語 → 枠は ceil(10 × 0.2) = 2件あるが、60%以下の候補は a のみ
    expect(frequentlyMissedWordIds(sessions, NOW)).toEqual(['a']);
  });

  it('maxCount で件数を打ち切る', () => {
    expect(frequentlyMissedWordIds(tenWords(), NOW, { maxCount: 1 })).toEqual(['a']);
  });

  it('期間外のセッションは集計しない', () => {
    const sessions = [session('s1', NOW - 40 * DAY_MS, [q('a', false, false)])];
    expect(frequentlyMissedWordIds(sessions, NOW)).toEqual([]);
  });
});

describe('scoreQuestions', () => {
  it('○（時間内正解）/△（時間切れ正解）/×（誤答）と平均回答時間を集計する', () => {
    const score = scoreQuestions([
      q('a', true, false, 300),
      q('b', true, true, 700),
      q('c', false, false, 500),
      q('d', true, false, 100),
    ]);
    expect(score).toEqual({
      total: 4,
      timelyCorrect: 2,
      overtimeCorrect: 1,
      wrong: 1,
      avgElapsedMs: 400,
    });
  });
});

describe('latestSessionOfSection', () => {
  it('該当セクションの最新セッションを返す', () => {
    const sessions = [
      session('s1', NOW - 2000, []),
      session('s2', NOW - 1000, []),
      { ...session('s3', NOW, []), sectionId: 'other' },
    ];
    expect(latestSessionOfSection(sessions, 'sec1')?.id).toBe('s2');
    expect(latestSessionOfSection(sessions, 'nothing')).toBeNull();
  });
});
