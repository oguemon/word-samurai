import { useEffect, useRef, useState } from 'react';
import { dictionary } from '../data/dictionary';
import { AUTO_ADVANCE_DELAY_MS, TIME_LIMIT_MS } from '../lib/constants';
import { newId } from '../lib/id';
import { buildQuiz, type QuizQuestion } from '../lib/quizEngine';
import { isTimelyCorrect } from '../lib/stats';
import { storage } from '../lib/storage';
import type { QuizQuestionResult, SectionData } from '../types';

export type QuizFeedback = {
  selectedIndex: number;
  correct: boolean;
  timedOut: boolean;
  elapsedMs: number;
};

export type QuizSessionState = {
  quiz: QuizQuestion[];
  /** 現在の問題番号（0始まり） */
  index: number;
  /** 現在の問題。範囲外なら undefined */
  question: QuizQuestion | undefined;
  answers: QuizQuestionResult[];
  feedback: QuizFeedback | null;
  finished: boolean;
  /** 現在の問題の計測開始時刻（performance.now() 基準） */
  startAt: number | null;
  handleChoice: (choiceIndex: number) => void;
  advance: () => void;
  retry: () => void;
};

/**
 * テスト1回分の状態機械。出題生成 → 回答（計測・判定）→ フィードバック → 次問 or 結果、を管理する。
 * 完走したテストだけを回答履歴に保存する（途中離脱は保存しない）。
 */
export const useQuizSession = (section: SectionData | undefined): QuizSessionState => {
  const [quiz, setQuiz] = useState<QuizQuestion[]>(() =>
    section ? buildQuiz(section.words, dictionary.distractorsByWordId) : [],
  );
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<QuizQuestionResult[]>([]);
  const [feedback, setFeedback] = useState<QuizFeedback | null>(null);
  const [finished, setFinished] = useState(false);
  const [startAt, setStartAt] = useState<number | null>(null);
  const recordedRef = useRef(false);

  // 選択肢の描画が終わってから計測を開始する
  useEffect(() => {
    if (finished || quiz.length === 0) return;
    setStartAt(performance.now());
  }, [index, quiz, finished]);

  const advance = () => {
    if (!feedback) return;
    setFeedback(null);
    if (index + 1 >= quiz.length) {
      if (!recordedRef.current && section) {
        recordedRef.current = true;
        storage.recordQuizSession({
          id: newId(),
          sectionId: section.id,
          finishedAt: Date.now(),
          questions: answers,
        });
      }
      setFinished(true);
    } else {
      setIndex(index + 1);
    }
  };

  // 時間内正解のときだけ、少し待って自動で次の問題へ
  useEffect(() => {
    if (!feedback || !isTimelyCorrect(feedback)) return;
    const timer = setTimeout(advance, AUTO_ADVANCE_DELAY_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- advance は毎レンダー作り直しのため feedback のみ監視する
  }, [feedback]);

  const handleChoice = (choiceIndex: number) => {
    if (feedback || finished || startAt === null) return;
    const question = quiz[index];
    const elapsedMs = Math.max(0, Math.round(performance.now() - startAt));
    const correct = choiceIndex === question.correctIndex;
    const timedOut = elapsedMs > TIME_LIMIT_MS;
    setAnswers((prev) => [
      ...prev,
      {
        wordId: question.word.id,
        selected: question.choices[choiceIndex],
        correct,
        elapsedMs,
        timedOut,
      },
    ]);
    setFeedback({ selectedIndex: choiceIndex, correct, timedOut, elapsedMs });
  };

  const retry = () => {
    if (!section) return;
    recordedRef.current = false;
    setQuiz(buildQuiz(section.words, dictionary.distractorsByWordId));
    setIndex(0);
    setAnswers([]);
    setFeedback(null);
    setFinished(false);
  };

  return {
    quiz,
    index,
    question: quiz[index],
    answers,
    feedback,
    finished,
    startAt,
    handleChoice,
    advance,
    retry,
  };
};
