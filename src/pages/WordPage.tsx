import { useEffect, type FC, type ReactNode } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { PosBadge } from '../components/PosBadge';
import { SpeakButton } from '../components/SpeakButton';
import { dictionary } from '../data/dictionary';
import { useWordStatus, type WordStatus } from '../hooks/useWordStatus';
import { formatDateTime, formatRate } from '../lib/format';
import { findTermSpan } from '../lib/highlight';
import { sectionBadge } from '../lib/sectionColor';
import { speakTerm, stopSpeaking } from '../lib/speech';
import { DEFAULT_WORD_BACK, readNavOrigin, readNavSequence, type WordNavState } from '../lib/wordNav';
import type { Word } from '../types';
import styles from './WordPage.module.css';

export const WordPage: FC = () => {
  const { wordId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const word = wordId ? dictionary.wordById.get(wordId) : undefined;
  const status = useWordStatus(word);

  // この単語を開いた元のリストの並び。無ければ辞書順にフォールバックする
  const sequence = readNavSequence(location.state);
  // 遷移元（左上の戻るリンク）。無ければ単語一覧へ戻る
  const origin = readNavOrigin(location.state);
  const back = origin ?? DEFAULT_WORD_BACK;

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

  // 前後移動が辿るリスト上での現在位置と前後の単語
  const nav = resolveNav(sequence, word.id);
  const section = dictionary.sectionByWordId.get(word.id);
  const sectionIndex = section ? dictionary.sections.findIndex((s) => s.id === section.id) : -1;
  const badge = section ? sectionBadge(sectionIndex, dictionary.sections.length) : null;

  // 前後移動でも並びと遷移元を引き継ぎ、リストを辿り続けても戻る先が変わらないようにする
  const goToWord = (target: Word) => {
    const state: WordNavState = {};
    if (sequence) state.sequence = sequence;
    if (origin) state.origin = origin;
    const carry = sequence !== null || origin !== null;
    navigate(`/words/${target.id}`, carry ? { state } : undefined);
  };

  return (
    <div className={styles.page}>
      <div className={styles.topRow}>
        <Link to={back.to} className={styles.backLink}>
          ‹ {back.label}
        </Link>
        {section && badge && (
          <span className={styles.sectionChip} style={{ backgroundColor: badge.bg, color: badge.fg }}>
            {section.label}
          </span>
        )}
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

      <div className={styles.pagerArea}>
        {nav.total > 0 && (
          <p className={styles.pagerPosition}>
            {nav.total}語中 <span className={styles.pagerCurrent}>{nav.index}</span>番目
          </p>
        )}
        <div className={styles.pager}>
          <button
            type="button"
            className={styles.pagerBtn}
            disabled={!nav.prevWord}
            onClick={() => nav.prevWord && goToWord(nav.prevWord)}
          >
            ‹ 前の単語
          </button>
          <button
            type="button"
            className={styles.pagerBtn}
            disabled={!nav.nextWord}
            onClick={() => nav.nextWord && goToWord(nav.nextWord)}
          >
            次の単語 ›
          </button>
        </div>
      </div>
    </div>
  );
};

type WordNavInfo = {
  /** リスト内での位置（1始まり）。単語が見つからなければ 0 */
  index: number;
  /** リストの総数 */
  total: number;
  prevWord?: Word;
  nextWord?: Word;
};

/**
 * 現在位置と前後の単語を求める。開いた元のリストの並び（sequence）があればそれに沿い、
 * 無い・その単語が含まれない場合は辞書全体の並びにフォールバックする。
 */
const resolveNav = (sequence: string[] | null, wordId: string): WordNavInfo => {
  if (sequence) {
    const i = sequence.indexOf(wordId);
    if (i !== -1) {
      return {
        index: i + 1,
        total: sequence.length,
        prevWord: i > 0 ? dictionary.wordById.get(sequence[i - 1]) : undefined,
        nextWord: i < sequence.length - 1 ? dictionary.wordById.get(sequence[i + 1]) : undefined,
      };
    }
  }
  const i = dictionary.indexById.get(wordId);
  if (i === undefined) return { index: 0, total: 0 };
  return {
    index: i + 1,
    total: dictionary.words.length,
    prevWord: i > 0 ? dictionary.words[i - 1] : undefined,
    nextWord: i < dictionary.words.length - 1 ? dictionary.words[i + 1] : undefined,
  };
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
