import { describe, expect, it } from 'vitest';
import type { QuizData, WordData } from '../types';
import { validateData } from './dictionary';
import quizJson from './quiz.json';
import wordsJson from './words.json';

const wordData = wordsJson as WordData;
const quizData = quizJson as QuizData;

describe('収録データの整合性', () => {
  it('エラー・警告なしで検証を通過する', () => {
    const { errors, warnings } = validateData(wordData, quizData);
    expect(errors).toEqual([]);
    expect(warnings).toEqual([]);
  });

  it('各セクションは20語以上100語以下', () => {
    for (const section of wordData.sections) {
      expect(section.words.length, `section: ${section.id}`).toBeGreaterThanOrEqual(20);
      expect(section.words.length, `section: ${section.id}`).toBeLessThanOrEqual(100);
    }
  });

  it('全単語に3件以上の誤答選択肢がある', () => {
    const byId = new Map(quizData.entries.map((e) => [e.wordId, e.distractors]));
    for (const section of wordData.sections) {
      for (const word of section.words) {
        expect(byId.get(word.id)?.length ?? 0, `word: ${word.id} (${word.term})`).toBeGreaterThanOrEqual(3);
      }
    }
  });

  it('発音記号がない単語は警告される（エラーにはならない）', () => {
    const words: WordData = {
      version: 1,
      sections: [
        {
          id: 'sec',
          label: 'セクション',
          words: [
            { id: 'a', term: 'alpha', senses: [{ pos: '名詞', ja: '意味A' }], example: { en: 'e', ja: '例' } },
          ],
        },
      ],
    };
    const quiz: QuizData = { version: 1, entries: [{ wordId: 'a', distractors: ['x', 'y', 'z'] }] };
    const { errors, warnings } = validateData(words, quiz);
    expect(errors).toEqual([]);
    expect(warnings.some((w) => w.includes('phonetic'))).toBe(true);
  });

  it('壊れたデータはエラーとして検出される', () => {
    const broken: WordData = {
      version: 1,
      sections: [
        {
          id: 'sec',
          label: 'セクション',
          words: [
            { id: 'a', term: 'alpha', senses: [{ pos: '名詞', ja: '意味A' }], example: { en: 'e', ja: '例' } },
            { id: 'a', term: 'beta', senses: [{ pos: '名詞', ja: '意味A' }], example: { en: 'e', ja: '例' } },
            { id: 'b', term: 'gamma', senses: [], example: { en: '', ja: '' } },
          ],
        },
      ],
    };
    const brokenQuiz: QuizData = {
      version: 1,
      entries: [
        { wordId: 'missing', distractors: ['x'] },
        { wordId: 'a', distractors: ['意味A', '意味A'] },
      ],
    };
    const { errors } = validateData(broken, brokenQuiz);
    expect(errors.some((e) => e.includes('単語IDが重複'))).toBe(true);
    expect(errors.some((e) => e.includes('senses がありません'))).toBe(true);
    expect(errors.some((e) => e.includes('example が不完全'))).toBe(true);
    expect(errors.some((e) => e.includes('存在しない wordId'))).toBe(true);
    expect(errors.some((e) => e.includes('正解の意味と一致'))).toBe(true);
    expect(errors.some((e) => e.includes('重複しています: 意味A'))).toBe(true);
  });
});
