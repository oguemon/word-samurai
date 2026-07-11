import { useMemo, type FC } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { TimerBar } from '../components/TimerBar';
import { dictionary } from '../data/dictionary';
import { useQuizSession, type QuizFeedback } from '../hooks/useQuizSession';
import { formatRate, formatSeconds } from '../lib/format';
import type { QuizQuestion } from '../lib/quizEngine';
import { isTimelyCorrect, scoreQuestions } from '../lib/stats';
import type { QuizQuestionResult, SectionData } from '../types';
import styles from './TestPage.module.css';

export const TestPage: FC = () => {
  const { sectionId } = useParams();
  const section = useMemo(() => dictionary.sections.find((s) => s.id === sectionId), [sectionId]);
  const session = useQuizSession(section);

  if (!section) return <Navigate to="/test" replace />;
  if (session.finished) {
    return <ResultView section={section} answers={session.answers} onRetry={session.retry} />;
  }
  if (!session.question) return <Navigate to="/test" replace />;
  return (
    <QuestionView
      section={section}
      question={session.question}
      questionNumber={session.index + 1}
      totalCount={session.quiz.length}
      feedback={session.feedback}
      startAt={session.startAt}
      onChoice={session.handleChoice}
      onAdvance={session.advance}
    />
  );
};

type QuestionViewProps = {
  section: SectionData;
  question: QuizQuestion;
  questionNumber: number;
  totalCount: number;
  feedback: QuizFeedback | null;
  startAt: number | null;
  onChoice: (choiceIndex: number) => void;
  onAdvance: () => void;
};

const QuestionView: FC<QuestionViewProps> = ({
  section,
  question,
  questionNumber,
  totalCount,
  feedback,
  startAt,
  onChoice,
  onAdvance,
}) => (
  <div className={styles.page}>
    <header className={styles.quizHeader}>
      <span className={styles.quizSection}>{section.label}</span>
      <span className={styles.progress}>
        {questionNumber} / {totalCount}
      </span>
      <Link to="/test" className={styles.quitLink}>
        中断
      </Link>
    </header>

    <TimerBar startAt={startAt} frozen={feedback !== null} />

    <div className={styles.termBox}>
      <span className={styles.quizTerm}>{question.word.term}</span>
      {question.word.phonetic && <span className={styles.quizPhonetic}>{question.word.phonetic}</span>}
    </div>

    <div className={styles.choices}>
      {question.choices.map((choice, i) => (
        <button
          key={i}
          type="button"
          className={choiceClassName(i, question.correctIndex, feedback)}
          onClick={() => onChoice(i)}
          disabled={feedback !== null}
        >
          {choice}
        </button>
      ))}
    </div>

    {feedback && <FeedbackPanel feedback={feedback} onAdvance={onAdvance} />}
  </div>
);

const choiceClassName = (choiceIndex: number, correctIndex: number, feedback: QuizFeedback | null): string => {
  if (!feedback) return styles.choice;
  if (choiceIndex === correctIndex) return `${styles.choice} ${styles.choiceCorrect}`;
  if (choiceIndex === feedback.selectedIndex) return `${styles.choice} ${styles.choiceWrong}`;
  return `${styles.choice} ${styles.choiceMuted}`;
};

const FeedbackPanel: FC<{ feedback: QuizFeedback; onAdvance: () => void }> = ({ feedback, onAdvance }) => {
  const timely = isTimelyCorrect(feedback);
  return (
    <div className={styles.feedback}>
      <p className={timely ? styles.fbGood : feedback.correct ? styles.fbOvertime : styles.fbBad}>
        {timely ? '○ 時間内に正解' : feedback.correct ? '△ 正解（時間切れ）' : '× 不正解'}
        <span className={styles.fbTime}>{formatSeconds(feedback.elapsedMs)}</span>
      </p>
      <button type="button" className={styles.primaryBtn} onClick={onAdvance}>
        次へ
      </button>
    </div>
  );
};

type ResultViewProps = {
  section: SectionData;
  answers: QuizQuestionResult[];
  onRetry: () => void;
};

const ResultView: FC<ResultViewProps> = ({ section, answers, onRetry }) => {
  const score = scoreQuestions(answers);
  const wrongAnswers = answers.filter((a) => !isTimelyCorrect(a));
  return (
    <div className={styles.result}>
      <header className={styles.resultHeader}>
        <h1 className={styles.resultTitle}>結果</h1>
        <span className={styles.resultSection}>{section.label}</span>
      </header>

      <section className={styles.scoreCard}>
        <p className={styles.scoreMain}>
          <span className={styles.scoreNum}>{score.timelyCorrect}</span> / {score.total}
        </p>
        <p className={styles.scoreRate}>正解率 {formatRate(score.timelyCorrect, score.total)}</p>
        <p className={styles.scoreSub}>
          △ 時間切れの正解 {score.overtimeCorrect}問 ・ × 誤答 {score.wrong}問 ・ 平均{' '}
          {formatSeconds(score.avgElapsedMs)}
        </p>
      </section>

      <section>
        <h2 className={styles.blockTitle}>間違えた単語</h2>
        {wrongAnswers.length === 0 ? (
          <p className={styles.perfect}>全問時間内に正解です！</p>
        ) : (
          <ul className={styles.wrongList}>
            {wrongAnswers.map((a, i) => (
              <WrongAnswerRow key={`${a.wordId}-${i}`} answer={a} />
            ))}
          </ul>
        )}
      </section>

      <div className={styles.resultActions}>
        <button type="button" className={styles.primaryBtn} onClick={onRetry}>
          もう一度（再抽選）
        </button>
        <Link to="/test" className={styles.secondaryBtn}>
          セクション選択へ
        </Link>
      </div>
    </div>
  );
};

const WrongAnswerRow: FC<{ answer: QuizQuestionResult }> = ({ answer }) => {
  const word = dictionary.wordById.get(answer.wordId);
  if (!word) return null;
  const overtime = answer.correct && answer.timedOut;
  return (
    <li>
      <Link to={`/words/${word.id}`} className={styles.wrongRow}>
        <span className={overtime ? styles.badgeOvertime : styles.badgeWrong}>{overtime ? '△' : '×'}</span>
        <span className={styles.wrongTerm}>{word.term}</span>
        <span className={styles.wrongMeaning}>{word.senses[0].ja}</span>
        <span className={styles.arrow} aria-hidden="true">
          ›
        </span>
      </Link>
    </li>
  );
};
