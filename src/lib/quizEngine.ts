import type { Word } from '../types';
import { CHOICE_COUNT, QUESTIONS_PER_QUIZ } from './constants';

/** [0, 1) の乱数。テストではシード付き乱数を注入する */
export type Rng = () => number;

export type QuizQuestion = {
  word: Word;
  choices: string[];
  correctIndex: number;
};

/** Fisher–Yates。元の配列は変更しない */
export const shuffled = <T>(items: readonly T[], rng: Rng): T[] => {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

/** 正解選択肢の文字列（第1語義の意味） */
export const correctAnswerOf = (word: Word): string => word.senses[0].ja;

/**
 * 4択の選択肢を組み立てる。
 * 誤答は distractors からランダムに3つ。足りない場合は fallbackWords
 * （同セクションの他の単語）の意味から補完する（正解・語義と同一文字列は除外）。
 */
export const buildChoices = (
  word: Word,
  distractors: string[],
  fallbackWords: readonly Word[],
  rng: Rng,
): { choices: string[]; correctIndex: number } => {
  const correct = correctAnswerOf(word);
  const senseTexts = new Set(word.senses.map((s) => s.ja));
  const pool = [...new Set(distractors)].filter((d) => d !== '' && !senseTexts.has(d));
  const picked = shuffled(pool, rng).slice(0, CHOICE_COUNT - 1);
  if (picked.length < CHOICE_COUNT - 1) {
    const used = new Set([correct, ...picked]);
    const fallbackPool = [
      ...new Set(
        fallbackWords
          .filter((w) => w.id !== word.id)
          .map((w) => correctAnswerOf(w))
          .filter((m) => !used.has(m) && !senseTexts.has(m)),
      ),
    ];
    picked.push(...shuffled(fallbackPool, rng).slice(0, CHOICE_COUNT - 1 - picked.length));
  }
  const choices = shuffled([correct, ...picked], rng);
  return { choices, correctIndex: choices.indexOf(correct) };
};

/** セクションから重複なしランダムに最大 QUESTIONS_PER_QUIZ 語を選んで出題を作る */
export const buildQuiz = (
  sectionWords: readonly Word[],
  distractorsByWordId: ReadonlyMap<string, string[]>,
  rng: Rng = Math.random,
): QuizQuestion[] => {
  const selected = shuffled(sectionWords, rng).slice(0, QUESTIONS_PER_QUIZ);
  return selected.map((word) => {
    const { choices, correctIndex } = buildChoices(
      word,
      distractorsByWordId.get(word.id) ?? [],
      sectionWords,
      rng,
    );
    return { word, choices, correctIndex };
  });
};
