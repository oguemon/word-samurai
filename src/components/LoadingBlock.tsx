import type { FC } from 'react';
import styles from './LoadingBlock.module.css';

type Props = {
  /** 何を待っているかを示す文言 */
  label: string;
};

/** 集計待ちの間に出すローディング表示 */
export const LoadingBlock: FC<Props> = ({ label }) => (
  <div className={styles.block} role="status" aria-live="polite">
    <span className={styles.spinner} aria-hidden="true" />
    <span className={styles.label}>{label}</span>
  </div>
);
