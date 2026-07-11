import type { FC } from 'react';
import styles from './PageHeader.module.css';

type Props = {
  title: string;
  subtitle?: string;
};

export const PageHeader: FC<Props> = ({ title, subtitle }) => (
  <header className={styles.header}>
    <h1 className={styles.title}>{title}</h1>
    {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
  </header>
);
