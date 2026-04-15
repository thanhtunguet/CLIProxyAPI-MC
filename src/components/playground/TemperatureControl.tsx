import { useId } from 'react';
import { useTranslation } from 'react-i18next';
import styles from './TemperatureControl.module.scss';

interface TemperatureControlProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
}

export function TemperatureControl({
  value,
  onChange,
  min = 0,
  max = 1,
  step = 0.1,
  disabled = false,
}: TemperatureControlProps) {
  const { t } = useTranslation();
  const sliderId = useId();

  return (
    <div className={styles.root}>
      <div className={styles.header}>
        <label htmlFor={sliderId} className={styles.label}>
          {t('playground.temperature')}
        </label>
        <span className={styles.value}>{value.toFixed(1)}</span>
      </div>
      <div className={styles.sliderWrap}>
        <input
          id={sliderId}
          type="range"
          className={styles.slider}
          min={min}
          max={max}
          step={step}
          disabled={disabled}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
        />
        <div className={styles.track}>
          <div
            className={styles.trackFill}
            style={{ width: `${((value - min) / (max - min)) * 100}%` }}
          />
        </div>
      </div>
      <div className={styles.labels}>
        <span>{min}</span>
        <span>{max}</span>
      </div>
    </div>
  );
}
