import { useState, type FC, type ReactNode } from 'react';
import { SHARE_TEXT, SHARE_URL } from '../lib/constants';
import { copyText } from '../lib/share';
import { CheckIcon, FacebookIcon, LineIcon, LinkIcon, XIcon } from './ShareIcons';
import styles from './ShareButtons.module.css';

const url = encodeURIComponent(SHARE_URL);
const text = encodeURIComponent(SHARE_TEXT);

type ShareTarget = { key: string; label: string; href: string; brand: string; icon: ReactNode };

const TARGETS: ShareTarget[] = [
  {
    key: 'x',
    label: 'Xで共有',
    href: `https://twitter.com/intent/tweet?text=${text}&url=${url}`,
    brand: styles.x,
    icon: <XIcon />,
  },
  {
    key: 'line',
    label: 'LINEで共有',
    href: `https://social-plugins.line.me/lineit/share?url=${url}`,
    brand: styles.line,
    icon: <LineIcon />,
  },
  {
    key: 'facebook',
    label: 'Facebookで共有',
    href: `https://www.facebook.com/sharer/sharer.php?u=${url}`,
    brand: styles.facebook,
    icon: <FacebookIcon />,
  },
];

/** 公開URLを各種SNSへ共有するボタン群。URLは SHARE_URL 定数で一元管理する */
export const ShareButtons: FC = () => {
  const [copied, setCopied] = useState(false);

  const onCopy = async () => {
    if (await copyText(SHARE_URL)) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  return (
    <div className={styles.share}>
      {TARGETS.map((t) => (
        <a
          key={t.key}
          href={t.href}
          target="_blank"
          rel="noopener noreferrer"
          className={`${styles.button} ${t.brand}`}
          aria-label={t.label}
          title={t.label}
        >
          {t.icon}
        </a>
      ))}
      <button
        type="button"
        onClick={onCopy}
        className={`${styles.button} ${styles.copy} ${copied ? styles.copied : ''}`}
        aria-label={copied ? 'リンクをコピーしました' : 'リンクをコピー'}
        title="リンクをコピー"
      >
        {copied ? <CheckIcon /> : <LinkIcon />}
      </button>
    </div>
  );
};
