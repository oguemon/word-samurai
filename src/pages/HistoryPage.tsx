import { useMemo, useState, type FC, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';
import { dictionary } from '../data/dictionary';
import {
  RECENT_SESSIONS_LIMIT,
  VIEW_HISTORY_DAYS,
  WEAK_SECTION_ID,
  WEAK_SECTION_LABEL,
} from '../lib/constants';
import { formatDateTime, formatDayLabel, formatRate, formatTime } from '../lib/format';
import {
  groupViewsByDay,
  recentWrongWords,
  sessionScore,
  weakWords,
  type DayViewGroup,
  type WeakWordSummary,
  type WrongWordSummary,
} from '../lib/stats';
import { storage } from '../lib/storage';
import type { QuizSession } from '../types';
import styles from './HistoryPage.module.css';

type Tab = 'views' | 'tests';

export const HistoryPage: FC = () => {
  const [tab, setTab] = useState<Tab>('views');
  const now = useMemo(() => Date.now(), []);
  const viewLog = useMemo(() => storage.getViewLog(), []);
  const quizLog = useMemo(() => storage.getQuizLog(), []);

  const dayGroups = useMemo(() => groupViewsByDay(viewLog, now, VIEW_HISTORY_DAYS), [viewLog, now]);
  const wrongs = useMemo(() => recentWrongWords(quizLog, now), [quizLog, now]);
  const weak = useMemo(() => weakWords(quizLog, now), [quizLog, now]);
  const recentSessions = useMemo(
    () => [...quizLog].sort((a, b) => b.finishedAt - a.finishedAt).slice(0, RECENT_SESSIONS_LIMIT),
    [quizLog],
  );

  return (
    <div>
      <PageHeader title="履歴" />

      {!storage.persistent && (
        <p className={styles.warning}>
          この環境ではLocalStorageが使えないため、記録はページを閉じると消えます。
        </p>
      )}

      <HistoryTabs tab={tab} onChange={setTab} />

      {tab === 'views' ? (
        <ViewHistoryTab groups={dayGroups} now={now} />
      ) : (
        <TestHistoryTab wrongs={wrongs} weak={weak} sessions={recentSessions} now={now} />
      )}
    </div>
  );
};

const TAB_ITEMS: { key: Tab; label: string }[] = [
  { key: 'views', label: '閲覧履歴' },
  { key: 'tests', label: 'テスト' },
];

const HistoryTabs: FC<{ tab: Tab; onChange: (tab: Tab) => void }> = ({ tab, onChange }) => (
  <div className={styles.tabs} role="tablist">
    {TAB_ITEMS.map((item) => (
      <button
        key={item.key}
        type="button"
        role="tab"
        aria-selected={tab === item.key}
        className={tab === item.key ? `${styles.tab} ${styles.tabActive}` : styles.tab}
        onClick={() => onChange(item.key)}
      >
        {item.label}
      </button>
    ))}
  </div>
);

const ViewHistoryTab: FC<{ groups: DayViewGroup[]; now: number }> = ({ groups, now }) => {
  if (groups.length === 0) {
    return (
      <p className={styles.empty}>
        まだ閲覧履歴がありません。単語帳で単語を見ると、ここに日別で並びます。
      </p>
    );
  }
  return (
    <>
      {groups.map((group) => (
        <HistoryBlock key={group.day} title={formatDayLabel(group.day, now)}>
          {group.items.map((item) => {
            const word = dictionary.wordById.get(item.wordId);
            if (!word) return null;
            return (
              <HistoryRow
                key={item.wordId}
                to={`/words/${word.id}`}
                main={word.term}
                badge={item.count >= 2 ? { text: `${item.count}回`, tone: 'primary' } : undefined}
                sub={formatTime(item.lastAt)}
              />
            );
          })}
        </HistoryBlock>
      ))}
    </>
  );
};

type TestHistoryTabProps = {
  wrongs: WrongWordSummary[];
  weak: WeakWordSummary[];
  sessions: QuizSession[];
  now: number;
};

const TestHistoryTab: FC<TestHistoryTabProps> = ({ wrongs, weak, sessions, now }) => (
  <>
    <HistoryBlock
      title="直近間違えた単語（7日間）"
      emptyText="この期間の誤答・時間切れはありません。"
      isEmpty={wrongs.length === 0}
    >
      {wrongs.map((item) => {
        const word = dictionary.wordById.get(item.wordId);
        if (!word) return null;
        return (
          <HistoryRow
            key={item.wordId}
            to={`/words/${word.id}`}
            main={word.term}
            badge={{ text: `${item.wrongCount}回`, tone: 'danger' }}
            sub={formatDateTime(item.lastWrongAt, now)}
          />
        );
      })}
    </HistoryBlock>

    <HistoryBlock
      title="正答率の低い単語（30日間・2回以上出題）"
      emptyText="まだ十分なテスト記録がありません。"
      isEmpty={weak.length === 0}
    >
      {weak.map((item) => {
        const word = dictionary.wordById.get(item.wordId);
        if (!word) return null;
        return (
          <HistoryRow
            key={item.wordId}
            to={`/words/${word.id}`}
            main={word.term}
            sub={`${formatRate(item.timelyCorrect, item.asked)}（${item.timelyCorrect}/${item.asked}問）`}
          />
        );
      })}
    </HistoryBlock>

    <HistoryBlock
      title="最近のテスト結果"
      emptyText="まだテストを受けていません。"
      isEmpty={sessions.length === 0}
    >
      {sessions.map((session) => {
        const score = sessionScore(session);
        return (
          <HistoryRow
            key={session.id}
            to={`/test/${session.sectionId}`}
            main={sectionLabelOf(session.sectionId)}
            badge={{ text: `${score.timelyCorrect}/${score.total}`, tone: 'primary' }}
            sub={formatDateTime(session.finishedAt, now)}
          />
        );
      })}
    </HistoryBlock>
  </>
);

/** セクションIDから表示名を引く（「よく間違える単語」の仮想セクションにも対応） */
const sectionLabelOf = (sectionId: string): string =>
  sectionId === WEAK_SECTION_ID
    ? WEAK_SECTION_LABEL
    : (dictionary.sections.find((s) => s.id === sectionId)?.label ?? sectionId);

type HistoryBlockProps = {
  title: string;
  /** isEmpty のとき行リストの代わりに表示する文言。省略時は空表示なし */
  emptyText?: string;
  isEmpty?: boolean;
  children: ReactNode;
};

const HistoryBlock: FC<HistoryBlockProps> = ({ title, emptyText, isEmpty = false, children }) => (
  <section className={styles.block}>
    <h2 className={styles.blockTitle}>{title}</h2>
    {isEmpty ? <p className={styles.empty}>{emptyText}</p> : <ul className={styles.rows}>{children}</ul>}
  </section>
);

type HistoryRowProps = {
  to: string;
  main: string;
  badge?: { text: string; tone: 'primary' | 'danger' };
  sub: string;
};

const HistoryRow: FC<HistoryRowProps> = ({ to, main, badge, sub }) => (
  <li>
    <Link to={to} className={styles.row}>
      <span className={styles.rowMain}>{main}</span>
      {badge && (
        <span className={badge.tone === 'danger' ? styles.badgeDanger : styles.badge}>{badge.text}</span>
      )}
      <span className={styles.rowSub}>{sub}</span>
      <span className={styles.arrow} aria-hidden="true">
        ›
      </span>
    </Link>
  </li>
);
