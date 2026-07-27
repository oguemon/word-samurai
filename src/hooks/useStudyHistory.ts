import { useEffect, useState } from 'react';
import { storage } from '../lib/storage';
import { buildStudyHistory, type StudyHistory } from '../lib/studyHistory';

/**
 * 集計を始めるまでの待ち時間。ローディング表示が確実に画面に出てから重い処理に入るよう、
 * 1フレーム（約16ms）より少し長く取る。requestAnimationFrame を使わないのは、
 * 非表示のタブでは発火せず集計が始まらないため（タイマーは非表示でも発火する）。
 */
const START_DELAY_MS = 32;

export type StudyHistoryState = {
  loading: boolean;
  /** 集計が終わるまでは null */
  data: StudyHistory | null;
};

/**
 * 学習履歴の集計を読み込む。
 *
 * LocalStorageの読み出し（最大2万件のJSONパース）と集計は同期処理で、件数が多いと画面が
 * 数百ms固まる。そのためマウント直後は loading を返してローディング表示の描画を先に済ませ、
 * 集計自体は次のタスクへ回す。
 */
export const useStudyHistory = (): StudyHistoryState => {
  const [state, setState] = useState<StudyHistoryState>({ loading: true, data: null });

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setState({
        loading: false,
        data: buildStudyHistory({
          viewLog: storage.getViewLog(),
          quizLog: storage.getQuizLog(),
          now: Date.now(),
        }),
      });
    }, START_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, []);

  return state;
};
