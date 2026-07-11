import { useState, type FC } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';
import { dictionary } from '../data/dictionary';
import type { SectionData } from '../types';
import styles from './TopPage.module.css';

// セクションの開閉状態はセッション内（タブを閉じるまで）保持する
const savedOpenState: Record<string, boolean> = {};

export const TopPage: FC = () => {
  const [open, setOpen] = useState<Record<string, boolean>>(() => ({ ...savedOpenState }));

  const toggle = (sectionId: string) => {
    const next = { ...open, [sectionId]: !open[sectionId] };
    savedOpenState[sectionId] = next[sectionId];
    setOpen(next);
  };

  return (
    <div>
      <PageHeader
        title="単語帳"
        subtitle={`全${dictionary.words.length}語・${dictionary.sections.length}セクション`}
      />
      <div className={styles.sections}>
        {dictionary.sections.map((section) => (
          <WordListSection
            key={section.id}
            section={section}
            isOpen={open[section.id] === true}
            onToggle={() => toggle(section.id)}
          />
        ))}
      </div>
    </div>
  );
};

const WordListSection: FC<{ section: SectionData; isOpen: boolean; onToggle: () => void }> = ({
  section,
  isOpen,
  onToggle,
}) => (
  <section className={styles.section}>
    <button type="button" className={styles.sectionHeader} onClick={onToggle} aria-expanded={isOpen}>
      <span className={styles.sectionLabel}>{section.label}</span>
      <span className={styles.sectionCount}>{section.words.length}語</span>
      <span className={styles.chevron} aria-hidden="true">
        {isOpen ? '▾' : '▸'}
      </span>
    </button>
    {isOpen && (
      <ul className={styles.wordList}>
        {section.words.map((word) => (
          <li key={word.id}>
            <Link to={`/words/${word.id}`} className={styles.wordRow}>
              <span className={styles.term}>{word.term}</span>
              <span className={styles.arrow} aria-hidden="true">
                ›
              </span>
            </Link>
          </li>
        ))}
      </ul>
    )}
  </section>
);
