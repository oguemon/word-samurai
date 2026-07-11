import type { FC } from 'react';
import styles from './PosBadge.module.css';

// 既知の品詞 → 色クラス。未知の品詞はグレー（other）にフォールバックする
const POS_CLASS: Record<string, string> = {
  名詞: styles.noun,
  動詞: styles.verb,
  形容詞: styles.adjective,
  副詞: styles.adverb,
  前置詞: styles.preposition,
  接続詞: styles.conjunction,
  代名詞: styles.pronoun,
  助動詞: styles.auxiliary,
  間投詞: styles.interjection,
  熟語: styles.idiom,
};

export const PosBadge: FC<{ pos: string }> = ({ pos }) => (
  <span className={`${styles.badge} ${POS_CLASS[pos] ?? styles.other}`}>{pos}</span>
);
