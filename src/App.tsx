import type { FC } from 'react';
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { BottomNav } from './components/BottomNav';
import { HistoryPage } from './pages/HistoryPage';
import { TestPage } from './pages/TestPage';
import { TestSelectPage } from './pages/TestSelectPage';
import { TopPage } from './pages/TopPage';
import { WordPage } from './pages/WordPage';
import styles from './App.module.css';

const App: FC = () => {
  return (
    <HashRouter>
      <div className={styles.app}>
        <main className={styles.main}>
          <Routes>
            <Route path="/" element={<TopPage />} />
            <Route path="/words/:wordId" element={<WordPage />} />
            <Route path="/test" element={<TestSelectPage />} />
            <Route path="/test/:sectionId" element={<TestPage />} />
            <Route path="/history" element={<HistoryPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
        <BottomNav />
      </div>
    </HashRouter>
  );
};

export default App;
