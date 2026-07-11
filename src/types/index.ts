// ---- 収録データ（words.json / quiz.json）の型 ----

export type WordData = {
  version: number;
  sections: SectionData[];
};

export type SectionData = {
  id: string;
  /** セクション名（例: 「ビジネス」） */
  label: string;
  words: Word[];
};

export type Word = {
  /** 全セクション横断で一意 */
  id: string;
  term: string;
  /** 発音記号（例: "/nɪˈɡoʊʃieɪt/"）。任意。無い場合は画面に表示されない */
  phonetic?: string;
  /** 品詞と意味。通常1件 */
  senses: Sense[];
  example: { en: string; ja: string };
};

export type Sense = { pos: string; ja: string };

export type QuizData = {
  version: number;
  entries: QuizEntry[];
};

export type QuizEntry = {
  wordId: string;
  /** 誤答選択肢。3件以上推奨（3件超は毎回ランダムに3件使用） */
  distractors: string[];
};

// ---- LocalStorage に保存する記録の型 ----

export type ViewEvent = { wordId: string; at: number };

export type WordStatEntry = {
  lastViewedAt: number;
  /** 「最後に見た日時（今回の閲覧を除く）」の表示用 */
  previousViewedAt: number | null;
};

export type WordStatsMap = Record<string, WordStatEntry>;

export type QuizQuestionResult = {
  wordId: string;
  /** 選んだ選択肢の文字列 */
  selected: string;
  correct: boolean;
  /** 問題表示から回答までの時間 */
  elapsedMs: number;
  /** elapsedMs > TIME_LIMIT_MS */
  timedOut: boolean;
};

export type QuizSession = {
  id: string;
  sectionId: string;
  finishedAt: number;
  questions: QuizQuestionResult[];
};
