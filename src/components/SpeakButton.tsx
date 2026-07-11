import type { FC } from 'react';
import { canSpeak, speakTerm } from '../lib/speech';
import styles from './SpeakButton.module.css';

type Props = {
  /** 読み上げる英語テキスト（単語・例文など） */
  term: string;
  /** 読み上げボタンの説明。省略時は term をそのまま使う */
  label?: string;
  /** 小さめのボタンにする（例文などの見出し脇に添えるとき） */
  small?: boolean;
};

/** 英語テキストをブラウザ内蔵TTSで発音するボタン。非対応環境では何も表示しない */
export const SpeakButton: FC<Props> = ({ term, label, small }) =>
  canSpeak() ? (
    <button
      type="button"
      className={small ? `${styles.button} ${styles.small}` : styles.button}
      onClick={() => speakTerm(term)}
      aria-label={`${label ?? term} を発音する`}
    >
      🔊
    </button>
  ) : null;
