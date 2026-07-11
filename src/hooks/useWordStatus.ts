import { useEffect, useState } from 'react';
import { countRecentViews, wordAccuracy } from '../lib/stats';
import { storage } from '../lib/storage';
import type { Word } from '../types';

export type WordStatus = {
  /** 今回の閲覧を除く、直近の閲覧日時 */
  previousViewedAt: number | null;
  /** 直近1週間の閲覧回数（今回を含む） */
  weekViews: number;
  /** 直近1週間の出題数 */
  asked: number;
  /** 直近1週間の時間内正解数 */
  timelyCorrect: number;
};

/**
 * 単語の学習ステータスを返す。表示のたびに閲覧を1件記録する
 * （連続する同一単語の記録は storage 側でデデュープ）。
 */
export const useWordStatus = (word: Word | undefined): WordStatus | null => {
  const [status, setStatus] = useState<WordStatus | null>(null);

  useEffect(() => {
    if (!word) return;
    const now = Date.now();
    const previousViewedAt = storage.recordView(word.id, now);
    setStatus({
      previousViewedAt,
      weekViews: countRecentViews(storage.getViewLog(), word.id, now),
      ...wordAccuracy(storage.getQuizLog(), word.id, now),
    });
  }, [word]);

  return status;
};
