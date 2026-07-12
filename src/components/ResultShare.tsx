import { useState, type FC } from 'react';
import { SHARE_URL } from '../lib/constants';
import { copyText, lineShareUrl, xShareUrl } from '../lib/share';
import { CheckIcon, LineIcon, LinkIcon, XIcon } from './ShareIcons';
import styles from './ResultShare.module.css';

type Props = {
  /** 共有する本文（何を何問中何点取ったか）。末尾のURLは各共有先で自動付与する */
  text: string;
};

/**
 * テスト結果を各種SNSへ共有するUI。共有本文にスコアを載せられる X・LINE と、
 * 本文＋URLのコピーを用意する（Facebookは本文を載せられないため含めない）。
 */
export const ResultShare: FC<Props> = ({ text }) => {
  const [copied, setCopied] = useState(false);
  // クリップボードにコピーされる全文（本文＋URL）。プレビューにもこれをそのまま表示する
  const clipboardText = `${text}\n${SHARE_URL}`;

  const onCopy = async () => {
    if (await copyText(clipboardText)) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  return (
    <section className={styles.card}>
      <h2 className={styles.title}>結果をシェア</h2>
      <p className={styles.preview}>{clipboardText}</p>
      <div className={styles.buttons}>
        <a
          className={`${styles.btn} ${styles.x}`}
          href={xShareUrl(text)}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Xで結果をシェア"
        >
          <XIcon />
          シェア
        </a>
        <a
          className={`${styles.btn} ${styles.line}`}
          href={lineShareUrl(text)}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="LINEで結果をシェア"
        >
          <LineIcon />
          LINE
        </a>
        <button
          type="button"
          className={`${styles.btn} ${styles.copy} ${copied ? styles.copied : ''}`}
          onClick={onCopy}
          aria-label={copied ? '結果をコピーしました' : '結果をコピー'}
        >
          {copied ? <CheckIcon /> : <LinkIcon />}
          {copied ? 'コピー済み' : 'コピー'}
        </button>
      </div>
    </section>
  );
};
