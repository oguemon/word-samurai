import { useState, type FC, type ReactNode } from 'react';
import { SHARE_TEXT, SHARE_URL } from '../lib/constants';
import styles from './ShareButtons.module.css';

const url = encodeURIComponent(SHARE_URL);
const text = encodeURIComponent(SHARE_TEXT);

const XIcon: FC = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

/** LINE公式ロゴ形状（Simple Icons由来・CC0） */
const LineIcon: FC = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
    <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" />
  </svg>
);

/** Facebook公式の「f」形状（Font Awesome Free 由来・CC BY 4.0） */
const FacebookIcon: FC = () => (
  <svg viewBox="0 0 320 512" aria-hidden="true" fill="currentColor">
    <path d="M80 299.3V512H196V299.3h86.5l18-97.8H196V166.9c0-51.7 20.3-71.5 72.7-71.5c16.3 0 29.4.4 37 1.2V7.9C291.4 4 256.4 0 236.2 0C129.3 0 80 50.5 80 156.7v44.8H14v97.8H80z" />
  </svg>
);

const LinkIcon: FC = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10 13a4 4 0 0 0 5.66 0l3-3a4 4 0 0 0-5.66-5.66l-1.5 1.5" />
    <path d="M14 11a4 4 0 0 0-5.66 0l-3 3a4 4 0 1 0 5.66 5.66l1.5-1.5" />
  </svg>
);

const CheckIcon: FC = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12.5l4.5 4.5L19 7" />
  </svg>
);

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
const copyShareUrl = async (): Promise<boolean> => {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(SHARE_URL);
      return true;
    }
  } catch {
    // クリップボードAPIが使えない場合は下のフォールバックへ
  }
  try {
    const ta = document.createElement('textarea');
    ta.value = SHARE_URL;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
};

export const ShareButtons: FC = () => {
  const [copied, setCopied] = useState(false);

  const onCopy = async () => {
    if (await copyShareUrl()) {
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
