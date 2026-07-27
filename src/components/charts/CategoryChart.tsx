// Recharts に触れるのはこのファイルだけ。差し替えるときは types.ts の props を満たす実装を用意する
import type { FC } from 'react';
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { CategoryChartProps, ChartColor, ChartSeries } from './types';

/** 色トークン名から CSS カスタムプロパティへの対応表。色コードは tokens.css だけが持つ */
const COLOR_VAR: Record<ChartColor, string> = {
  primary: 'var(--color-primary)',
  success: 'var(--color-success)',
  danger: 'var(--color-danger)',
};

/** ChartPoint.label を行データに載せるキー。シリーズキーと衝突しないよう記号を付ける */
const LABEL_KEY = '__label';

const AXIS_STYLE = { fontSize: 10, fill: 'var(--color-text-muted)' } as const;

/**
 * 登場アニメーションは切る。requestAnimationFrame で進むため非表示のタブでは途中で止まり、
 * 復帰するまで棒や線が描かれていない状態に見えてしまう。集計中はローディングを出しており、
 * 表示が確定したあとは即座に完成形を出したい。
 */
const ANIMATE = false;

const TOOLTIP_STYLE = {
  background: 'var(--color-surface)',
  border: '1px solid var(--color-border)',
  borderRadius: 8,
  fontSize: 12,
  padding: '6px 10px',
  boxShadow: 'var(--shadow-card)',
} as const;

const axisOf = (series: ChartSeries): 'left' | 'right' => series.axis ?? 'left';

const formatTick = (series: ChartSeries | undefined) => (value: number): string =>
  series?.formatValue ? series.formatValue(value) : String(value);

export const CategoryChart: FC<CategoryChartProps> = ({
  points,
  series,
  height = 190,
  labelInterval,
  ariaLabel,
}) => {
  // Recharts は「1目盛り = 1オブジェクト」の形を取るので、ここで詰め替える
  const rows = points.map((point) => ({ [LABEL_KEY]: point.label, ...point.values }));
  const leftSeries = series.find((s) => axisOf(s) === 'left');
  const rightSeries = series.find((s) => axisOf(s) === 'right');

  return (
    <div role="img" aria-label={ariaLabel}>
      <ResponsiveContainer width="100%" height={height}>
        <ComposedChart data={rows} margin={{ top: 6, right: 4, bottom: 0, left: 0 }}>
          <CartesianGrid stroke="var(--color-border)" vertical={false} />
          <XAxis
            dataKey={LABEL_KEY}
            interval={labelInterval === undefined ? 'preserveEnd' : labelInterval - 1}
            tick={AXIS_STYLE}
            tickLine={false}
            stroke="var(--color-border)"
            minTickGap={0}
          />
          {leftSeries && (
            <YAxis
              yAxisId="left"
              width={34}
              allowDecimals={false}
              domain={leftSeries.domain}
              tick={AXIS_STYLE}
              tickLine={false}
              tickFormatter={formatTick(leftSeries)}
              stroke="var(--color-border)"
            />
          )}
          {rightSeries && (
            <YAxis
              yAxisId="right"
              orientation="right"
              width={38}
              allowDecimals={false}
              domain={rightSeries.domain}
              tick={AXIS_STYLE}
              tickLine={false}
              tickFormatter={formatTick(rightSeries)}
              stroke="var(--color-border)"
            />
          )}
          <Tooltip
            contentStyle={TOOLTIP_STYLE}
            labelStyle={{ color: 'var(--color-text-muted)', fontSize: 11 }}
            itemStyle={{ padding: 0 }}
            formatter={(value, name) => {
              const target = series.find((s) => s.name === name);
              const text =
                typeof value === 'number' && target?.formatValue
                  ? target.formatValue(value)
                  : String(value ?? '—');
              return [text, name ?? ''];
            }}
          />
          {series.length > 1 && (
            <Legend verticalAlign="top" height={24} iconSize={8} wrapperStyle={{ fontSize: 11 }} />
          )}
          {series.map((s) =>
            s.kind === 'bar' ? (
              <Bar
                key={s.key}
                yAxisId={axisOf(s)}
                dataKey={s.key}
                name={s.name}
                fill={COLOR_VAR[s.color]}
                radius={[2, 2, 0, 0]}
                maxBarSize={14}
                isAnimationActive={ANIMATE}
              />
            ) : (
              <Line
                key={s.key}
                yAxisId={axisOf(s)}
                dataKey={s.key}
                name={s.name}
                type="monotone"
                stroke={COLOR_VAR[s.color]}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 3 }}
                connectNulls
                isAnimationActive={ANIMATE}
              />
            ),
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};
