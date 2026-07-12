// 時間・出題・集計まわりの調整値はここで一元管理する

/** 1問の制限時間 */
export const TIME_LIMIT_MS = 5000;
/** 1テストの問題数 */
export const QUESTIONS_PER_QUIZ = 20;
/** 選択肢の数 */
export const CHOICE_COUNT = 4;
/** 時間内正解時に自動で次の問題へ進むまでの待ち時間 */
export const AUTO_ADVANCE_DELAY_MS = 700;

export const DAY_MS = 24 * 60 * 60 * 1000;
export const WEEK_MS = 7 * DAY_MS;

/**
 * 同一単語を直近に見てから、この時間内の再閲覧は履歴に記録しない。
 * 前後移動で同じ単語を往復しても閲覧回数が積み上がらないようにする狙い
 * （React StrictMode の二重実行対策も兼ねる）。
 */
export const VIEW_DEDUPE_MS = 60 * 1000;
export const VIEW_LOG_MAX_AGE_MS = 90 * DAY_MS;
export const VIEW_LOG_MAX_COUNT = 20000;
export const QUIZ_LOG_MAX_AGE_MS = 180 * DAY_MS;
export const QUIZ_LOG_MAX_SESSIONS = 200;

/** 履歴ページに表示する閲覧履歴の日数 */
export const VIEW_HISTORY_DAYS = 30;
/** 「直近間違えた単語」の集計期間 */
export const RECENT_WRONG_WINDOW_MS = WEEK_MS;
/** 「正答率の低い単語」の集計期間 */
export const WEAK_WINDOW_MS = 30 * DAY_MS;
/** 同・最低出題数 */
export const WEAK_MIN_ASKED = 2;
/** 同・最大表示件数 */
export const WEAK_LIMIT = 20;
/** 「最近のテスト結果」の表示件数 */
export const RECENT_SESSIONS_LIMIT = 10;

/** 「よく間違える単語」: 出題済み単語数に対する抽出割合（正答率の下位20%） */
export const FREQUENT_MISS_RATIO = 0.2;
/** 「よく間違える単語」の最大語数 */
export const FREQUENT_MISS_MAX_WORDS = 50;
/** 「よく間違える単語」に含める時間内正解率の上限。これを超えた単語は克服済みとみなし、下位順位でも表示しない */
export const FREQUENT_MISS_MAX_RATE = 0.6;
/** 「よく間違える単語」仮想セクションのID。words.json のセクションIDとしては予約済み（使用不可） */
export const WEAK_SECTION_ID = 'weak';
/** 「よく間違える単語」仮想セクションの表示名 */
export const WEAK_SECTION_LABEL = 'よく間違える単語';
