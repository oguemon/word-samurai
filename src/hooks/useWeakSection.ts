import { useMemo } from 'react';
import { dictionary } from '../data/dictionary';
import { WEAK_SECTION_ID, WEAK_SECTION_LABEL } from '../lib/constants';
import { frequentlyMissedWordIds } from '../lib/stats';
import { storage } from '../lib/storage';
import type { SectionData, Word } from '../types';

/**
 * 「よく間違える単語」の仮想セクション（テスト正答率の下位20%・上限50語）。
 * 該当単語が無ければ null。単語は元のセクションにも残る（両方に属する）。
 */
export const useWeakSection = (): SectionData | null =>
  useMemo(() => {
    const ids = frequentlyMissedWordIds(storage.getQuizLog(), Date.now());
    const words = ids
      .map((id) => dictionary.wordById.get(id))
      .filter((w): w is Word => w !== undefined);
    if (words.length === 0) return null;
    return { id: WEAK_SECTION_ID, label: WEAK_SECTION_LABEL, words };
  }, []);
