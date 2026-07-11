import type { QuizSession, ViewEvent, WordStatsMap } from '../types';
import {
  QUIZ_LOG_MAX_AGE_MS,
  QUIZ_LOG_MAX_SESSIONS,
  VIEW_DEDUPE_MS,
  VIEW_LOG_MAX_AGE_MS,
  VIEW_LOG_MAX_COUNT,
} from './constants';

export type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

// スキーマを変えるときはキーの版を上げ、旧キーからの移行処理を書く
const VIEW_LOG_KEY = 'wm.viewLog.v1';
const WORD_STATS_KEY = 'wm.wordStats.v1';
const QUIZ_LOG_KEY = 'wm.quizLog.v1';

export class MemoryStorage implements StorageLike {
  private map = new Map<string, string>();
  getItem(key: string): string | null {
    return this.map.get(key) ?? null;
  }
  setItem(key: string, value: string): void {
    this.map.set(key, value);
  }
  removeItem(key: string): void {
    this.map.delete(key);
  }
}

const detectLocalStorage = (): StorageLike | null => {
  try {
    const ls = globalThis.localStorage;
    if (!ls) return null;
    const probe = 'wm.probe';
    ls.setItem(probe, '1');
    ls.removeItem(probe);
    return ls;
  } catch {
    return null;
  }
};

export type StorageLimits = {
  viewLogMaxAgeMs: number;
  viewLogMaxCount: number;
  quizLogMaxAgeMs: number;
  quizLogMaxSessions: number;
};

const DEFAULT_LIMITS: StorageLimits = {
  viewLogMaxAgeMs: VIEW_LOG_MAX_AGE_MS,
  viewLogMaxCount: VIEW_LOG_MAX_COUNT,
  quizLogMaxAgeMs: QUIZ_LOG_MAX_AGE_MS,
  quizLogMaxSessions: QUIZ_LOG_MAX_SESSIONS,
};

export class AppStorage {
  /** false のときは LocalStorage が使えず、記録はページを閉じると消える */
  readonly persistent: boolean;
  private backing: StorageLike;
  private limits: StorageLimits;

  constructor(options?: { backing?: StorageLike; limits?: Partial<StorageLimits> }) {
    const detected = options?.backing ?? detectLocalStorage();
    this.persistent = detected !== null;
    this.backing = detected ?? new MemoryStorage();
    this.limits = { ...DEFAULT_LIMITS, ...options?.limits };
  }

  getViewLog(): ViewEvent[] {
    const raw = this.readJson(VIEW_LOG_KEY);
    if (!Array.isArray(raw)) return [];
    return raw.filter(
      (e): e is ViewEvent =>
        typeof e === 'object' &&
        e !== null &&
        typeof (e as ViewEvent).wordId === 'string' &&
        typeof (e as ViewEvent).at === 'number',
    );
  }

  getWordStats(): WordStatsMap {
    const raw = this.readJson(WORD_STATS_KEY);
    if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return {};
    const stats: WordStatsMap = {};
    for (const [wordId, value] of Object.entries(raw as Record<string, unknown>)) {
      if (typeof value !== 'object' || value === null) continue;
      const entry = value as { lastViewedAt?: unknown; previousViewedAt?: unknown };
      if (typeof entry.lastViewedAt !== 'number') continue;
      stats[wordId] = {
        lastViewedAt: entry.lastViewedAt,
        previousViewedAt: typeof entry.previousViewedAt === 'number' ? entry.previousViewedAt : null,
      };
    }
    return stats;
  }

  getQuizLog(): QuizSession[] {
    const raw = this.readJson(QUIZ_LOG_KEY);
    if (!Array.isArray(raw)) return [];
    return raw.filter((s): s is QuizSession => {
      if (typeof s !== 'object' || s === null) return false;
      const session = s as QuizSession;
      return (
        typeof session.id === 'string' &&
        typeof session.sectionId === 'string' &&
        typeof session.finishedAt === 'number' &&
        Array.isArray(session.questions)
      );
    });
  }

  /**
   * 閲覧を記録し、「最後に見た日時（今回の閲覧を除く）」を返す。
   * 直近の記録が同じ単語かつ VIEW_DEDUPE_MS 以内なら重複とみなして追記しない
   * （前後移動の連打や React StrictMode の二重実行への対策）。
   */
  recordView(wordId: string, at: number): number | null {
    const log = this.getViewLog();
    const stats = this.getWordStats();
    const last = log[log.length - 1];
    const existing = stats[wordId];

    if (last && last.wordId === wordId && at - last.at < VIEW_DEDUPE_MS) {
      return existing?.previousViewedAt ?? null;
    }

    const previousViewedAt = existing ? existing.lastViewedAt : null;
    const pruned = this.pruneViewLog([...log, { wordId, at }], at);
    this.writeJson(VIEW_LOG_KEY, pruned, () => pruned.slice(Math.ceil(pruned.length / 2)));
    stats[wordId] = { lastViewedAt: at, previousViewedAt };
    this.writeJson(WORD_STATS_KEY, stats);
    return previousViewedAt;
  }

  recordQuizSession(session: QuizSession): void {
    const pruned = this.pruneQuizLog([...this.getQuizLog(), session], session.finishedAt);
    this.writeJson(QUIZ_LOG_KEY, pruned, () => pruned.slice(Math.ceil(pruned.length / 2)));
  }

  private pruneViewLog(log: ViewEvent[], now: number): ViewEvent[] {
    const minAt = now - this.limits.viewLogMaxAgeMs;
    return log.filter((e) => e.at >= minAt).slice(-this.limits.viewLogMaxCount);
  }

  private pruneQuizLog(log: QuizSession[], now: number): QuizSession[] {
    const minAt = now - this.limits.quizLogMaxAgeMs;
    return log.filter((s) => s.finishedAt >= minAt).slice(-this.limits.quizLogMaxSessions);
  }

  private readJson(key: string): unknown {
    const raw = this.backing.getItem(key);
    if (raw === null) return null;
    try {
      return JSON.parse(raw) as unknown;
    } catch {
      // 破損したデータは初期化して、アプリの動作継続を優先する
      this.backing.removeItem(key);
      return null;
    }
  }

  /** 容量超過などで保存に失敗したら shrink で減らして1回だけ再試行する */
  private writeJson(key: string, value: unknown, shrink?: () => unknown): void {
    try {
      this.backing.setItem(key, JSON.stringify(value));
    } catch (error) {
      if (!shrink) {
        console.warn(`[word-master] 保存に失敗しました: ${key}`, error);
        return;
      }
      try {
        this.backing.setItem(key, JSON.stringify(shrink()));
      } catch {
        console.warn(`[word-master] 保存に失敗しました: ${key}`, error);
      }
    }
  }
}

export const storage = new AppStorage();
