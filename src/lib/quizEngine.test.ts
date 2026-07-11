import { describe, expect, it } from 'vitest';
import type { Word } from '../types';
import { CHOICE_COUNT, QUESTIONS_PER_QUIZ } from './constants';
import { buildChoices, buildQuiz, shuffled } from './quizEngine';

/** テスト用のシード付き乱数（mulberry32） */
const mulberry32 = (seed: number): (() => number) => {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const makeWord = (id: string, term: string, ja: string): Word => ({
  id,
  term,
  senses: [{ pos: '名詞', ja }],
  example: { en: `ex ${term}`, ja: `例 ${term}` },
});

const words = Array.from({ length: 30 }, (_, i) => makeWord(`w${i}`, `term${i}`, `意味${i}`));

describe('shuffled', () => {
  it('元の配列を変更せず、同じ要素を含む並べ替えを返す', () => {
    const rng = mulberry32(1);
    const original = [1, 2, 3, 4, 5];
    const result = shuffled(original, rng);
    expect(original).toEqual([1, 2, 3, 4, 5]);
    expect([...result].sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5]);
  });
});

describe('buildChoices', () => {
  it('正解1つと誤答3つの計4択（重複なし）を返す', () => {
    const rng = mulberry32(2);
    const { choices, correctIndex } = buildChoices(words[0], ['あ', 'い', 'う', 'え'], words, rng);
    expect(choices).toHaveLength(CHOICE_COUNT);
    expect(new Set(choices).size).toBe(CHOICE_COUNT);
    expect(choices[correctIndex]).toBe('意味0');
  });

  it('正解と同じ文字列の誤答選択肢は除外する', () => {
    const rng = mulberry32(3);
    const { choices, correctIndex } = buildChoices(words[0], ['意味0', 'あ', 'い', 'う'], words, rng);
    expect(choices.filter((c) => c === '意味0')).toHaveLength(1);
    expect(choices[correctIndex]).toBe('意味0');
  });

  it('誤答が3件に満たないときは他の単語の意味で補完する', () => {
    const rng = mulberry32(4);
    const { choices } = buildChoices(words[0], ['あ'], words, rng);
    expect(choices).toHaveLength(CHOICE_COUNT);
    expect(new Set(choices).size).toBe(CHOICE_COUNT);
    expect(choices).toContain('意味0');
    expect(choices).toContain('あ');
  });

  it('誤答エントリがない単語も4択を作れる', () => {
    const rng = mulberry32(5);
    const { choices, correctIndex } = buildChoices(words[3], [], words, rng);
    expect(choices).toHaveLength(CHOICE_COUNT);
    expect(choices[correctIndex]).toBe('意味3');
  });
});

describe('buildQuiz', () => {
  it('20問を単語の重複なしで出題する', () => {
    const rng = mulberry32(6);
    const quiz = buildQuiz(words, new Map(), rng);
    expect(quiz).toHaveLength(QUESTIONS_PER_QUIZ);
    expect(new Set(quiz.map((q) => q.word.id)).size).toBe(QUESTIONS_PER_QUIZ);
  });

  it('語数が20未満のセクションは全語を出題する', () => {
    const rng = mulberry32(7);
    const quiz = buildQuiz(words.slice(0, 8), new Map(), rng);
    expect(quiz).toHaveLength(8);
  });

  it('各問の正解位置に正解の意味が入っている', () => {
    const rng = mulberry32(8);
    const quiz = buildQuiz(words, new Map([['w0', ['×1', '×2', '×3']]]), rng);
    for (const q of quiz) {
      expect(q.choices).toHaveLength(CHOICE_COUNT);
      expect(q.choices[q.correctIndex]).toBe(q.word.senses[0].ja);
    }
  });
});
