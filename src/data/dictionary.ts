import type { QuizData, QuizEntry, SectionData, Word, WordData } from '../types';
import wordsJson from './words.json';
import quizJson from './quiz.json';

export type Dictionary = {
  sections: SectionData[];
  /** 全単語をセクション順に並べた通しリスト（前後移動用） */
  words: Word[];
  wordById: Map<string, Word>;
  indexById: Map<string, number>;
  sectionByWordId: Map<string, SectionData>;
  distractorsByWordId: Map<string, string[]>;
};

export type ValidationResult = { errors: string[]; warnings: string[] };

/** 収録データの整合性チェック。errors があればアプリは起動させない */
export const validateData = (wordData: WordData, quizData: QuizData): ValidationResult => {
  const errors = validateVersions(wordData, quizData);
  if (!Array.isArray(wordData.sections) || wordData.sections.length === 0) {
    return { errors: [...errors, 'words.json: sections が空です'], warnings: [] };
  }
  errors.push(...validateSections(wordData.sections));

  const quizResult = validateQuizEntries(wordsById(wordData.sections), quizData.entries);
  errors.push(...quizResult.errors);
  return { errors, warnings: [...phoneticWarnings(wordData.sections), ...quizResult.warnings] };
};

/** 発音記号が無い単語の警告。エラーにはしない（画面では単に非表示になる） */
const phoneticWarnings = (sections: SectionData[]): string[] => {
  const warnings: string[] = [];
  for (const section of sections) {
    if (!Array.isArray(section.words)) continue;
    for (const word of section.words) {
      if (word.id && !word.phonetic) {
        warnings.push(`words.json: ${word.id} に phonetic（発音記号）がありません（画面では非表示になります）`);
      }
    }
  }
  return warnings;
};

const validateVersions = (wordData: WordData, quizData: QuizData): string[] => {
  const errors: string[] = [];
  if (wordData.version !== 1) errors.push(`words.json: 未対応の version です: ${wordData.version}`);
  if (quizData.version !== 1) errors.push(`quiz.json: 未対応の version です: ${quizData.version}`);
  return errors;
};

/** words.json のセクション構造（ID・ラベル・単語の有無）をチェックする */
const validateSections = (sections: SectionData[]): string[] => {
  const errors: string[] = [];
  const seenSectionIds = new Set<string>();
  const seenWordIds = new Set<string>();
  for (const section of sections) {
    if (!section.id) errors.push('words.json: id のないセクションがあります');
    if (seenSectionIds.has(section.id)) errors.push(`words.json: セクションIDが重複しています: ${section.id}`);
    seenSectionIds.add(section.id);
    if (!section.label) errors.push(`words.json: セクション ${section.id} に label がありません`);
    if (!Array.isArray(section.words) || section.words.length === 0) {
      errors.push(`words.json: セクション ${section.id} に単語がありません`);
      continue;
    }
    for (const word of section.words) {
      errors.push(...validateWord(word, seenWordIds));
    }
  }
  return errors;
};

/** 1単語の必須項目をチェックする。seenWordIds はセクション横断のID重複検出のため呼び出し側と共有 */
const validateWord = (word: Word, seenWordIds: Set<string>): string[] => {
  if (!word.id) return [`words.json: id のない単語があります（term: ${word.term}）`];

  const errors: string[] = [];
  if (seenWordIds.has(word.id)) errors.push(`words.json: 単語IDが重複しています: ${word.id}`);
  seenWordIds.add(word.id);
  if (!word.term) errors.push(`words.json: ${word.id} に term がありません`);
  if (!Array.isArray(word.senses) || word.senses.length === 0) {
    errors.push(`words.json: ${word.id} に senses がありません`);
  } else {
    for (const sense of word.senses) {
      if (!sense.pos || !sense.ja) errors.push(`words.json: ${word.id} の senses に不正なエントリがあります`);
    }
  }
  if (!word.example || !word.example.en || !word.example.ja) {
    errors.push(`words.json: ${word.id} の example が不完全です`);
  }
  return errors;
};

/** quiz.json の参照整合・エントリ重複・誤答選択肢の品質と、エントリ不足の警告をまとめてチェックする */
const validateQuizEntries = (wordById: Map<string, Word>, entries: QuizEntry[]): ValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];
  const seenWordIds = new Set<string>();
  for (const entry of entries) {
    const word = wordById.get(entry.wordId);
    if (!word) {
      errors.push(`quiz.json: 存在しない wordId です: ${entry.wordId}`);
      continue;
    }
    if (seenWordIds.has(entry.wordId)) errors.push(`quiz.json: wordId が重複しています: ${entry.wordId}`);
    seenWordIds.add(entry.wordId);
    errors.push(...validateDistractors(entry, word));
    if (entry.distractors.length < 3) {
      warnings.push(`quiz.json: ${entry.wordId} の誤答選択肢が3件未満です（実行時は他の単語の意味で補完されます）`);
    }
  }
  for (const id of wordById.keys()) {
    if (!seenWordIds.has(id)) {
      warnings.push(`quiz.json: ${id} のエントリがありません（実行時は他の単語の意味で補完されます）`);
    }
  }
  return { errors, warnings };
};

/** 誤答選択肢が空文字・正解の意味と同一・エントリ内重複でないことをチェックする */
const validateDistractors = (entry: QuizEntry, word: Word): string[] => {
  const errors: string[] = [];
  const senseTexts = new Set(word.senses.map((s) => s.ja));
  const seenDistractors = new Set<string>();
  for (const d of entry.distractors) {
    if (!d) errors.push(`quiz.json: ${entry.wordId} に空の誤答選択肢があります`);
    if (senseTexts.has(d)) errors.push(`quiz.json: ${entry.wordId} の誤答選択肢が正解の意味と一致しています: ${d}`);
    if (seenDistractors.has(d)) errors.push(`quiz.json: ${entry.wordId} の誤答選択肢が重複しています: ${d}`);
    seenDistractors.add(d);
  }
  return errors;
};

/** 単語ID → Word の索引。重複IDは後勝ち（重複自体は validateSections が検出する） */
const wordsById = (sections: SectionData[]): Map<string, Word> => {
  const map = new Map<string, Word>();
  for (const section of sections) {
    if (!Array.isArray(section.words)) continue; // 配列でない場合のエラーは validateSections が報告する
    for (const word of section.words) map.set(word.id, word);
  }
  return map;
};

export const buildDictionary = (wordData: WordData, quizData: QuizData): Dictionary => {
  const { errors, warnings } = validateData(wordData, quizData);
  for (const w of warnings) console.warn(`[word-master] ${w}`);
  if (errors.length > 0) {
    throw new Error(`収録データが不正です:\n${errors.join('\n')}`);
  }

  const sections = wordData.sections;
  const words = sections.flatMap((s) => s.words);
  return {
    sections,
    words,
    wordById: wordsById(sections),
    indexById: new Map(words.map((w, i) => [w.id, i] as const)),
    sectionByWordId: new Map(sections.flatMap((s) => s.words.map((w) => [w.id, s] as const))),
    distractorsByWordId: new Map(quizData.entries.map((e) => [e.wordId, e.distractors] as const)),
  };
};

// 起動時にスキーマ検証込みで読み込む（データ不正はここで throw して気付けるようにする）
export const dictionary = buildDictionary(wordsJson as WordData, quizJson as QuizData);
