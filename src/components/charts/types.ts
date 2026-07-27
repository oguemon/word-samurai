/**
 * グラフコンポーネントの公開インターフェース。
 *
 * 描画ライブラリ（現在は Recharts）を差し替えられるようにするため、この定義には
 * ライブラリ固有の型・色コード・DOM 構造を一切持ち込まない。呼び出し側はここの型だけを
 * 使い、ライブラリに触るのは `CategoryChart.tsx` などの実装ファイルに限定する。
 */

/** グラフの色。実際の色は tokens.css のデザイントークンへ実装側で解決する */
export type ChartColor = 'primary' | 'success' | 'danger';

/** 横軸1目盛り分のデータ */
export type ChartPoint = {
  /** 横軸のラベル（例: "7/26"） */
  label: string;
  /** シリーズキーごとの値。欠測（その目盛りに値が無い）は null */
  values: Record<string, number | null>;
};

export type ChartSeries = {
  /** ChartPoint.values を引くキー */
  key: string;
  /** 凡例・ツールチップに出す名前 */
  name: string;
  /** 棒か折れ線か */
  kind: 'bar' | 'line';
  color: ChartColor;
  /** 載せる縦軸。単位の違う値を重ねるときに right を使う。省略時は left */
  axis?: 'left' | 'right';
  /** 縦軸の範囲。省略時はデータに合わせて自動調整する */
  domain?: [number, number];
  /** 縦軸目盛りとツールチップの値の書式。省略時は数値をそのまま出す */
  formatValue?: (value: number) => string;
};

export type CategoryChartProps = {
  /** 横軸方向に並ぶデータ（表示したい順） */
  points: ChartPoint[];
  /** 重ねて描くシリーズ。同じ縦軸に複数載せる場合、軸の設定は先頭のシリーズに従う */
  series: ChartSeries[];
  /** グラフ領域の高さ(px) */
  height?: number;
  /** 横軸ラベルを何目盛りごとに出すか（1なら全件）。省略時は幅に応じて自動で間引く */
  labelInterval?: number;
  /** グラフ全体の説明（読み上げ用） */
  ariaLabel: string;
};
