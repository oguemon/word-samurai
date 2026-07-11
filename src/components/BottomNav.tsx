import type { FC } from 'react';
import { Link, useLocation } from 'react-router-dom';
import styles from './BottomNav.module.css';

const TABS = [
  {
    to: '/',
    icon: '📖',
    label: '単語帳',
    isActive: (path: string) => path === '/' || path.startsWith('/words'),
  },
  {
    to: '/test',
    icon: '⏱️',
    label: 'テスト',
    isActive: (path: string) => path.startsWith('/test'),
  },
  {
    to: '/history',
    icon: '🕘',
    label: '履歴',
    isActive: (path: string) => path.startsWith('/history'),
  },
];

export const BottomNav: FC = () => {
  const { pathname } = useLocation();
  return (
    <nav className={styles.nav}>
      {TABS.map((tab) => {
        const active = tab.isActive(pathname);
        return (
          <Link
            key={tab.to}
            to={tab.to}
            className={active ? `${styles.item} ${styles.active}` : styles.item}
            aria-current={active ? 'page' : undefined}
          >
            <span className={styles.icon} aria-hidden="true">
              {tab.icon}
            </span>
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
};
