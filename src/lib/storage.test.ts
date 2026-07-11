import { describe, expect, it } from 'vitest';
import type { QuizSession } from '../types';
import { VIEW_DEDUPE_MS } from './constants';
import { AppStorage, MemoryStorage } from './storage';

const makeSession = (id: string, finishedAt: number): QuizSession => ({
  id,
  sectionId: 'sec1',
  finishedAt,
  questions: [],
});

describe('AppStorage.recordView', () => {
  it('初回閲覧は null、2回目以降は前回の閲覧日時を返す', () => {
    const s = new AppStorage({ backing: new MemoryStorage() });
    expect(s.recordView('a', 1000)).toBeNull();
    expect(s.recordView('a', 1000 + VIEW_DEDUPE_MS + 1)).toBe(1000);
    expect(s.getViewLog()).toHaveLength(2);
  });

  it('同一単語の連続閲覧はデデュープし、返り値も安定する（StrictMode 対策）', () => {
    const s = new AppStorage({ backing: new MemoryStorage() });
    s.recordView('a', 1000);
    const t2 = 1000 + VIEW_DEDUPE_MS + 1;
    expect(s.recordView('a', t2)).toBe(1000);
    expect(s.recordView('a', t2 + 500)).toBe(1000);
    expect(s.getViewLog()).toHaveLength(2);
  });

  it('別の単語を挟めばデデュープ窓内でも記録する', () => {
    const s = new AppStorage({ backing: new MemoryStorage() });
    s.recordView('a', 1000);
    s.recordView('b', 1200);
    expect(s.recordView('a', 1400)).toBe(1000);
    expect(s.getViewLog()).toHaveLength(3);
  });

  it('保持期間と件数の上限で古いログを削除する', () => {
    const s = new AppStorage({
      backing: new MemoryStorage(),
      limits: { viewLogMaxAgeMs: 10_000, viewLogMaxCount: 3 },
    });
    s.recordView('a', 1000);
    s.recordView('b', 20_000); // a は期間外になる
    expect(s.getViewLog().map((e) => e.wordId)).toEqual(['b']);
    s.recordView('c', 23_000);
    s.recordView('d', 26_000);
    s.recordView('e', 29_000); // 件数上限3で b が落ちる
    expect(s.getViewLog().map((e) => e.wordId)).toEqual(['c', 'd', 'e']);
  });

  it('ログが期間外になっても「最後に見た日時」は wordStats から返せる', () => {
    const s = new AppStorage({
      backing: new MemoryStorage(),
      limits: { viewLogMaxAgeMs: 10_000 },
    });
    s.recordView('a', 1000);
    expect(s.recordView('a', 100_000)).toBe(1000);
    expect(s.getViewLog()).toHaveLength(1);
  });
});

describe('AppStorage.recordQuizSession', () => {
  it('セッションを追記し、件数上限を超えたら古い順に削除する', () => {
    const s = new AppStorage({ backing: new MemoryStorage(), limits: { quizLogMaxSessions: 2 } });
    s.recordQuizSession(makeSession('s1', 1000));
    s.recordQuizSession(makeSession('s2', 2000));
    s.recordQuizSession(makeSession('s3', 3000));
    expect(s.getQuizLog().map((x) => x.id)).toEqual(['s2', 's3']);
  });
});

describe('破損データの扱い', () => {
  it('壊れたJSONや型違いのデータは初期化して空を返す', () => {
    const backing = new MemoryStorage();
    backing.setItem('wm.viewLog.v1', '{broken');
    backing.setItem('wm.quizLog.v1', '"not-an-array"');
    backing.setItem('wm.wordStats.v1', '[1,2,3]');
    const s = new AppStorage({ backing });
    expect(s.getViewLog()).toEqual([]);
    expect(s.getQuizLog()).toEqual([]);
    expect(s.getWordStats()).toEqual({});
    expect(s.recordView('a', 1000)).toBeNull();
  });
});
