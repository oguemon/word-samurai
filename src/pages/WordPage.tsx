import { useEffect, type FC, type ReactNode } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { PosBadge } from '../components/PosBadge';
import { SpeakButton } from '../components/SpeakButton';
import { dictionary } from '../data/dictionary';
import { useWordStatus, type WordStatus } from '../hooks/useWordStatus';
import { formatDateTime, formatRate } from '../lib/format';
import { findTermSpan } from '../lib/highlight';
import { speakTerm, stopSpeaking } from '../lib/speech';
import styles from './WordPage.module.css';

export const WordPage: FC = () => {
  const { wordId } = useParams();
  const navigate = useNavigate();
  const word = wordId ? dictionary.wordById.get(wordId) : undefined;
  const status = useWordStatus(word);

  // 単語の表示時に自動で発音する（OSにブロックされる環境でも🔊ボタンで再生できる）
  useEffect(() => {
    if (word) speakTerm(word.term);
    return stopSpeaking;
  }, [word]);

  if (!word) {
    return (
      <div className={styles.notFound}>
        <p>単語が見つかりませんでした。</p>
        <Link to="/">単語一覧へ戻る</Link>
      </div>
    );
  }

  const index = dictionary.indexById.get(word.id)!;
  const prevWord = index > 0 ? dictionary.words[index - 1] : undefined;
  const nextWord = index < dictionary.words.length - 1 ? dictionary.words[index + 1] : undefined;
  const section = dictionary.sectionByWordId.get(word.id);

  return (
    <div className={styles.page}>
      <div className={styles.topRow}>
        <Link to="/" className={styles.backLink}>
          ‹ 単語一覧
        </Link>
        {section && <span className={styles.sectionChip}>{section.label}</span>}
      </div>

      <section className={styles.card}>
        <div className={styles.termRow}>
          <h1 className={styles.term}>{word.term}</h1>
          <SpeakButton term={word.term} />
        </div>
        {word.phonetic && <p className={styles.phonetic}>{word.phonetic}</p>}
        <ul className={styles.senses}>
          {word.senses.map((sense, i) => (
            <li key={i} className={styles.sense}>
              <PosBadge pos={sense.pos} />
              <span className={styles.meaning}>{sense.ja}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className={styles.card}>
        <div className={styles.exampleHead}>
          <h2 className={styles.cardTitle}>例文</h2>
          <SpeakButton term={word.example.en} label="例文" small />
        </div>
        <p className={styles.exampleEn}>{highlightTerm(word.term, word.example.en)}</p>
        <p className={styles.exampleJa}>{word.example.ja}</p>
      </section>

      <section className={styles.card}>
        <h2 className={styles.cardTitle}>学習ステータス</h2>
        <dl className={styles.statusList}>
          {statusRows(status, Date.now()).map((row) => (
            <div key={row.label} className={styles.statusRow}>
              <dt>{row.label}</dt>
              <dd>{row.value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <div className={styles.pager}>
        <button
          type="button"
          className={styles.pagerBtn}
          disabled={!prevWord}
          onClick={() => prevWord && navigate(`/words/${prevWord.id}`)}
        >
          ‹ 前の単語
        </button>
        <button
          type="button"
          className={styles.pagerBtn}
          disabled={!nextWord}
          onClick={() => nextWord && navigate(`/words/${nextWord.id}`)}
        >
          次の単語 ›
        </button>
      </div>
    </div>
  );
};

/** 例文中の「その単語」に当たる箇所（活用形を含む）へ下線を引いて返す */
const highlightTerm = (term: string, sentence: string): ReactNode => {
  const span = findTermSpan(term, sentence);
  if (!span) return sentence;
  const [start, end] = span;
  return (
    <>
      {sentence.slice(0, start)}
      <u className={styles.exampleHit}>{sentence.slice(start, end)}</u>
      {sentence.slice(end)}
    </>
  );
};

/** 学習ステータスの表示行。読み込み中は「…」 */
const statusRows = (status: WordStatus | null, now: number): { label: string; value: string }[] => [
  {
    label: '最後に見た日時',
    value: !status
      ? '…'
      : status.previousViewedAt !== null
        ? formatDateTime(status.previousViewedAt, now)
        : '初めて見る単語',
  },
  {
    label: '直近1週間に見た回数',
    value: status ? `${status.weekViews}回` : '…',
  },
  {
    label: '直近1週間の正解率',
    value: !status
      ? '…'
      : status.asked > 0
        ? `${formatRate(status.timelyCorrect, status.asked)}（${status.timelyCorrect}/${status.asked}問）`
        : '出題なし',
  },
];
