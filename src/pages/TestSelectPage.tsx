import { useMemo, type FC } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';
import { dictionary } from '../data/dictionary';
import { useWeakSection } from '../hooks/useWeakSection';
import { formatDateTime } from '../lib/format';
import { latestSessionOfSection, sessionScore } from '../lib/stats';
import { storage } from '../lib/storage';
import type { QuizSession, SectionData } from '../types';
import styles from './TestSelectPage.module.css';

export const TestSelectPage: FC = () => {
  const quizLog = useMemo(() => storage.getQuizLog(), []);
  const weakSection = useWeakSection();
  const now = Date.now();

  return (
    <div>
      <PageHeader title="単語テスト" subtitle="セクションを選ぶとテストが始まります（4択・各5秒）" />
      <ul className={styles.list}>
        {weakSection && (
          <>
            <SectionItem
              section={weakSection}
              latest={latestSessionOfSection(quizLog, weakSection.id)}
              now={now}
              variant="weak"
            />
            <li className={styles.divider} aria-hidden="true" />
          </>
        )}
        {dictionary.sections.map((section) => (
          <SectionItem
            key={section.id}
            section={section}
            latest={latestSessionOfSection(quizLog, section.id)}
            now={now}
          />
        ))}
      </ul>
    </div>
  );
};

const SectionItem: FC<{
  section: SectionData;
  latest: QuizSession | null;
  now: number;
  /** 'weak' = よく間違える単語セクション（赤系の要復習デザイン） */
  variant?: 'weak';
}> = ({ section, latest, now, variant }) => {
  const score = latest ? sessionScore(latest) : null;
  return (
    <li>
      <Link
        to={`/test/${section.id}`}
        className={variant === 'weak' ? `${styles.item} ${styles.itemWeak}` : styles.item}
      >
        <span className={styles.itemMain}>
          <span className={styles.label}>{section.label}</span>
          <span className={styles.count}>{section.words.length}語</span>
        </span>
        <span className={styles.itemSub}>
          {latest && score
            ? `前回 ${score.timelyCorrect}/${score.total}（${formatDateTime(latest.finishedAt, now)}）`
            : '未受験'}
        </span>
        <span className={styles.arrow} aria-hidden="true">
          ›
        </span>
      </Link>
    </li>
  );
};
