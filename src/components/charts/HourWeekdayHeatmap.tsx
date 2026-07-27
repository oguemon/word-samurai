import type { FC } from 'react';
import { HEAT_LEVELS } from '../../lib/constants';
import { heatLevel, WEEKDAY_LABELS } from '../../lib/studyHistory';
import styles from './HourWeekdayHeatmap.module.css';

type Props = {
  /** cells[時間帯 0〜23][曜日 0=日〜6=土] の学習単語数 */
  cells: number[][];
  /** 濃さの基準になる最大値 */
  max: number;
};

/** 添字＝濃さの段（0＝学習なし）。動的なクラス名参照を避けて対応を明示する */
const LEVEL_CLASS = [styles.level0, styles.level1, styles.level2, styles.level3, styles.level4];

/**
 * 曜日×時間帯の学習量ヒートマップ。GitHubの草と同じく、マスの濃淡で量を表す。
 * 描画ライブラリは使わず表とCSSで組む（Rechartsにヒートマップの描画要素が無いため）。
 * 表にしているのは、行・列の見出しを読み上げに伝えられるのが表だけだから。
 */
export const HourWeekdayHeatmap: FC<Props> = ({ cells, max }) => (
  <div className={styles.wrap}>
    <table className={styles.table}>
      <thead>
        <tr>
          <th className={styles.corner} scope="col">
            時
          </th>
          {WEEKDAY_LABELS.map((weekday) => (
            <th key={weekday} scope="col" className={styles.colHead}>
              {weekday}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {cells.map((row, hour) => (
          <tr key={hour}>
            <th scope="row" className={styles.rowHead}>
              {hour}
            </th>
            {row.map((value, weekday) => (
              <td key={weekday} className={styles.cell}>
                <span
                  className={`${styles.mark} ${LEVEL_CLASS[heatLevel(value, max)]}`}
                  title={`${WEEKDAY_LABELS[weekday]}曜 ${hour}時台: ${value}語`}
                >
                  <span className={styles.value}>{value}語</span>
                </span>
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
    <p className={styles.legend}>
      <span className={styles.legendLabel}>少</span>
      {Array.from({ length: HEAT_LEVELS + 1 }, (_, level) => (
        <span key={level} className={`${styles.legendMark} ${LEVEL_CLASS[level]}`} aria-hidden="true" />
      ))}
      <span className={styles.legendLabel}>多</span>
    </p>
  </div>
);
