interface Props {
  id: string;
  label: string;
  emoji?: string;
  value: number;
  min: number;
  max: number;
  suffix?: string;
  hint?: string;
  onChange: (v: number) => void;
}

export default function Slider({ id, label, emoji, value, min, max, suffix, hint, onChange }: Props) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div className="slider">
      <div className="slider-head">
        <label htmlFor={id}>
          {emoji ? <span aria-hidden>{emoji} </span> : null}
          {label}
        </label>
        <div className="stepper">
          <button type="button" className="step" aria-label="Færre" onClick={() => onChange(Math.max(min, value - 1))}>−</button>
          <span className="num">{value}{suffix ? <small>{suffix}</small> : null}</span>
          <button type="button" className="step" aria-label="Flere" onClick={() => onChange(Math.min(max, value + 1))}>+</button>
        </div>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        value={value}
        style={{ ['--pct' as string]: `${pct}%` } as React.CSSProperties}
        onChange={(e) => onChange(parseInt(e.target.value, 10))}
      />
      {hint ? <p className="hint">{hint}</p> : null}
    </div>
  );
}
