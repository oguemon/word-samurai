import type { FC, ReactNode } from 'react';
import { LoadingBlock } from '../components/LoadingBlock';
import { PageHeader } from '../components/PageHeader';
import { CategoryChart } from '../components/charts/CategoryChart';
import { HourWeekdayHeatmap } from '../components/charts/HourWeekdayHeatmap';
import type { ChartPoint, ChartSeries } from '../components/charts/types';
import { useStudyHistory } from '../hooks/useStudyHistory';
import { STUDY_HEATMAP_WEEKS, STUDY_HISTORY_DAYS } from '../lib/constants';
import { formatMonthDayShort } from '../lib/format';
import { storage } from '../lib/storage';
import type { StudyHistory } from '../lib/studyHistory';
import styles from './StudyHistoryPage.module.css';

/** 横軸ラベルは1週間ごとに出す（日数ぶん並べると読めないため） */
const LABEL_INTERVAL = 7;

const WORD_SERIES: ChartSeries[] = [
  { key: 'words', name: '単語数', kind: 'bar', color: 'primary', formatValue: (v) => `${v}語` },
];

const TEST_SERIES: ChartSeries[] = [
  { key: 'tests', name: 'テスト回数', kind: 'bar', color: 'primary', formatValue: (v) => `${v}回` },
  {
    key: 'rate',
    name: '平均正解率',
    kind: 'line',
    color: 'success',
    axis: 'right',
    domain: [0, 100],
    formatValue: (v) => `${v}%`,
  },
];

export const StudyHistoryPage: FC = () => {
  const { loading, data } = useStudyHistory();

  return (
    <div>
      <PageHeader title="学習履歴" subtitle="いつ・どれだけ学習したかの記録" />

      {!storage.persistent && (
        <p className={styles.warning}>
          この環境ではLocalStorageが使えないため、記録はページを閉じると消えます。
        </p>
      )}

      {loading || !data ? <LoadingBlock label="学習履歴を集計しています…" /> : <StudyCharts data={data} />}
    </div>
  );
};

const StudyCharts: FC<{ data: StudyHistory }> = ({ data }) => {
  const wordPoints: ChartPoint[] = data.dailyWords.map((d) => ({
    label: formatMonthDayShort(d.day),
    values: { words: d.words },
  }));
  const testPoints: ChartPoint[] = data.dailyTests.map((d) => ({
    label: formatMonthDayShort(d.day),
    // 正解率は%（0〜100）で渡す。テストが無い日は線を引かないため null
    values: { tests: d.tests, rate: d.rate === null ? null : Math.round(d.rate * 100) },
  }));

  return (
    <>
      <ChartCard
        title={`時間帯×曜日（直近${STUDY_HEATMAP_WEEKS}週間）`}
        note="マスの濃さは、その曜日・時間帯に学習した単語数。同じマスの同一単語は1語として数えます。"
        isEmpty={data.heatmap.max === 0}
        emptyText={`直近${STUDY_HEATMAP_WEEKS}週間の学習記録がありません。`}
      >
        <HourWeekdayHeatmap cells={data.heatmap.cells} max={data.heatmap.max} />
      </ChartCard>

      <ChartCard
        title={`学習した単語数（直近${STUDY_HISTORY_DAYS}日）`}
        note="同じ日に同じ単語を何回見ても1語として数えます（延べ回数ではありません）。"
        isEmpty={data.dailyWords.every((d) => d.words === 0)}
        emptyText={`直近${STUDY_HISTORY_DAYS}日に学習した単語がありません。`}
      >
        <CategoryChart
          points={wordPoints}
          series={WORD_SERIES}
          labelInterval={LABEL_INTERVAL}
          ariaLabel={`直近${STUDY_HISTORY_DAYS}日の日別の学習単語数の棒グラフ`}
        />
      </ChartCard>

      <ChartCard
        title={`テスト回数と平均正解率（直近${STUDY_HISTORY_DAYS}日）`}
        note="回数は同一セクションの受け直しも別々に数えます。正解率は時間内正解のみを、その日の全問題数で割った値です。"
        isEmpty={data.dailyTests.every((d) => d.tests === 0)}
        emptyText={`直近${STUDY_HISTORY_DAYS}日に受けたテストがありません。`}
      >
        <CategoryChart
          points={testPoints}
          series={TEST_SERIES}
          height={210}
          labelInterval={LABEL_INTERVAL}
          ariaLabel={`直近${STUDY_HISTORY_DAYS}日の日別のテスト回数の棒グラフと平均正解率の折れ線グラフ`}
        />
      </ChartCard>
    </>
  );
};

type ChartCardProps = {
  title: string;
  /** グラフの読み方の補足 */
  note: string;
  isEmpty: boolean;
  emptyText: string;
  children: ReactNode;
};

const ChartCard: FC<ChartCardProps> = ({ title, note, isEmpty, emptyText, children }) => (
  <section className={styles.card}>
    <h2 className={styles.cardTitle}>{title}</h2>
    <p className={styles.cardNote}>{note}</p>
    {isEmpty ? <p className={styles.empty}>{emptyText}</p> : children}
  </section>
);
