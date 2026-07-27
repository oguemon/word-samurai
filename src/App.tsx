import { Suspense, lazy, type FC } from 'react';
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppHeader } from './components/AppHeader';
import { BottomNav } from './components/BottomNav';
import { LoadingBlock } from './components/LoadingBlock';
import { HistoryPage } from './pages/HistoryPage';
import { TestPage } from './pages/TestPage';
import { TestSelectPage } from './pages/TestSelectPage';
import { TopPage } from './pages/TopPage';
import { WordPage } from './pages/WordPage';
import styles from './App.module.css';

// 学習履歴だけがグラフ描画ライブラリ（重い）を使うため、他のタブの読み込みを遅くしないよう分割する
const StudyHistoryPage = lazy(() =>
  import('./pages/StudyHistoryPage').then((m) => ({ default: m.StudyHistoryPage })),
);

const App: FC = () => {
  return (
    <HashRouter>
      <div className={styles.app}>
        <AppHeader />
        <main className={styles.main}>
          <Routes>
            <Route path="/" element={<TopPage />} />
            <Route path="/words/:wordId" element={<WordPage />} />
            <Route path="/test" element={<TestSelectPage />} />
            <Route path="/test/:sectionId" element={<TestPage />} />
            <Route path="/history" element={<HistoryPage />} />
            <Route
              path="/stats"
              element={
                <Suspense fallback={<LoadingBlock label="学習履歴を読み込んでいます…" />}>
                  <StudyHistoryPage />
                </Suspense>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
        <BottomNav />
      </div>
    </HashRouter>
  );
};

export default App;
