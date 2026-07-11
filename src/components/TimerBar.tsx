import { useEffect, useRef, useState, type FC } from 'react';
import { TIME_LIMIT_MS } from '../lib/constants';
import styles from './TimerBar.module.css';

type Props = {
  /** 計測開始時刻（performance.now() 基準）。null の間は満タン表示 */
  startAt: number | null;
  /** 回答確定などでタイマー表示を止める */
  frozen: boolean;
};

export const TimerBar: FC<Props> = ({ startAt, frozen }) => {
  const fillRef = useRef<HTMLDivElement>(null);
  const [expired, setExpired] = useState(false);

  // 新しい問題（= startAt の更新）で満タンに戻す
  useEffect(() => {
    setExpired(false);
    if (fillRef.current) fillRef.current.style.transform = 'scaleX(1)';
  }, [startAt]);

  useEffect(() => {
    if (startAt === null || frozen) return;
    let raf = 0;
    const tick = () => {
      const ratio = Math.min(1, (performance.now() - startAt) / TIME_LIMIT_MS);
      if (fillRef.current) fillRef.current.style.transform = `scaleX(${1 - ratio})`;
      if (ratio >= 1) {
        setExpired(true);
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [startAt, frozen]);

  return (
    <div className={styles.row}>
      <div className={styles.track}>
        <div ref={fillRef} className={expired ? `${styles.fill} ${styles.fillExpired}` : styles.fill} />
      </div>
      {expired && !frozen && <span className={styles.expiredLabel}>時間切れ</span>}
    </div>
  );
};
