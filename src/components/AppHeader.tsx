import type { FC } from 'react';
import { Link } from 'react-router-dom';
import { SERVICE_NAME } from '../lib/constants';
import { Logo } from './Logo';
import { ShareButtons } from './ShareButtons';
import styles from './AppHeader.module.css';

/** 全ページ共通のヘッダー。ロゴ（トップへのリンク）と共有ボタンを横並びで置く */
export const AppHeader: FC = () => (
  <header className={styles.header}>
    <Link to="/" className={styles.logoLink} aria-label={`${SERVICE_NAME} トップへ`}>
      <Logo className={styles.logo} />
    </Link>
    <ShareButtons />
  </header>
);
