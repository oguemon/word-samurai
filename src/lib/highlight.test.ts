import { describe, expect, it } from 'vitest';
import type { WordData } from '../types';
import wordsJson from '../data/words.json';
import { findTermSpan } from './highlight';

const wordData = wordsJson as WordData;
const allWords = wordData.sections.flatMap((s) => s.words);

/** 範囲を切り出して実際に下線が引かれる文字列を得る */
const highlighted = (term: string, sentence: string): string | null => {
  const span = findTermSpan(term, sentence);
  return span ? sentence.slice(span[0], span[1]) : null;
};

describe('findTermSpan', () => {
  it('そのままの形の単語を見つける', () => {
    expect(highlighted('absentee', 'Clerical staff track absentee rates.')).toBe('absentee');
  });

  it('活用・語形変化した単語を見つける', () => {
    expect(highlighted('amenity', 'The venue offers state-of-the-art amenities.')).toBe('amenities');
    expect(highlighted('embody', 'The design embodies simplicity.')).toBe('embodies');
    expect(highlighted('ally', 'Our allies backed the treaty.')).toBe('allies');
    expect(highlighted('contemplate', 'She pondered the offer, contemplating every implication.')).toBe(
      'contemplating',
    );
  });

  it('不規則変化した動詞を見つける', () => {
    expect(highlighted('overcome', 'The team overcame setbacks and surpassed its goal.')).toBe('overcame');
  });

  it('イディオムは活用・語間の挿入をまたいで範囲を取る', () => {
    expect(highlighted('make sense', 'The plan finally makes sense.')).toBe('makes sense');
    expect(highlighted('pick up', "I'll pick you up at seven.")).toBe('pick you up');
    expect(highlighted('take center stage', "AI takes center stage at this year's expo.")).toBe(
      'takes center stage',
    );
  });

  it('見つからなければ null を返す', () => {
    expect(findTermSpan('absentee', 'No match here.')).toBeNull();
  });

  it('収録している全単語の例文で下線箇所を特定できる', () => {
    const missed = allWords.filter((w) => findTermSpan(w.term, w.example.en) === null);
    expect(missed.map((w) => `${w.id}:${w.term}`)).toEqual([]);
  });
});
