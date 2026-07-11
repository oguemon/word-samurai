import type { FC } from 'react';
import { canSpeak, speakTerm } from '../lib/speech';
import styles from './SpeakButton.module.css';

type Props = { term: string };

/** 単語をブラウザ内蔵TTSで発音するボタン。非対応環境では何も表示しない */
export const SpeakButton: FC<Props> = ({ term }) =>
  canSpeak() ? (
    <button
      type="button"
      className={styles.button}
      onClick={() => speakTerm(term)}
      aria-label={`${term} を発音する`}
    >
      🔊
    </button>
  ) : null;
