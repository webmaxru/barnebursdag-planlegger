import { useEffect, useState } from 'react';
import Slider from './Slider';
import Footer from './Footer';
import type { MainDish, PartyConfig } from '../lib/types';
import { track } from '../lib/analytics';

const ALLERGIES = [
  { id: 'gluten', label: 'Glutenfri' },
  { id: 'melk', label: 'Melkefri' },
  { id: 'egg', label: 'Eggfri' },
  { id: 'nott', label: 'Nøttefri' },
  { id: 'svin', label: 'Uten svin' }
];

interface Props {
  cfg: PartyConfig;
  onChange: (cfg: PartyConfig) => void;
  onFinish: (cfg: PartyConfig) => void;
  onSkip: () => void;
}

export default function Wizard({ cfg, onChange, onFinish, onSkip }: Props) {
  const [step, setStep] = useState(1);
  const set = (patch: Partial<PartyConfig>) => onChange({ ...cfg, ...patch });

  useEffect(() => {
    track('wizard_started');
  }, []);

  const setAllergy = (id: string, count: number) => {
    const next = { ...cfg.allergies };
    if (count > 0) next[id] = count; else delete next[id];
    set({ allergies: next });
  };

  const next = () => {
    const nextStep = Math.min(3, step + 1);
    track('wizard_step', { step: nextStep });
    setStep(nextStep);
  };

  const finish = () => {
    track('wizard_completed');
    onFinish(cfg);
  };

  const skip = () => {
    track('wizard_skipped');
    onSkip();
  };

  return (
    <section className="wizard" data-testid="wizard">
      <header className="wizard-head">
        <div className="wizard-title">
          <p className="wizard-eyebrow">Kakeklar</p>
          <h1>Lag handlelisten på 1 minutt</h1>
        </div>
        <button type="button" className="link-btn wizard-skip" data-testid="wizard-skip" onClick={skip}>
          Hopp over
        </button>
      </header>

      <div className="wizard-progress" aria-label={`Steg ${step} av 3`}>
        {[1, 2, 3].map((n) => (
          <span key={n} className={n <= step ? 'active' : ''} />
        ))}
      </div>

      <div className="wizard-body">
        {step === 1 && (
          <div data-testid="wizard-step-1">
            <h2>Hvem feirer?</h2>
            <Slider id="alder" emoji="🎂" label="Barnets alder" value={cfg.age} min={1} max={14} suffix=" år" onChange={(age) => set({ age })} />
            <Slider id="gjester" emoji="🧒" label="Antall barn (gjester)" value={cfg.guests} min={1} max={40} onChange={(guests) => set({ guests })} />
            <Slider
              id="voksne"
              emoji="🧑‍🤝‍🧑"
              label="Voksne (følge)"
              value={cfg.adults}
              min={0}
              max={20}
              hint="Noen barn har med en forelder – tell dem her (gjelder voksne)."
              onChange={(adults) => set({ adults })}
            />
            <p className="hint" data-testid="step1-allergy-note">💡 Allergier og matrestriksjoner velger du på neste steg.</p>
          </div>
        )}

        {step === 2 && (
          <div data-testid="wizard-step-2">
            <h2>Allergier og matrestriksjoner</h2>
            <p className="wizard-intro">Hvor mange gjester (barn eller voksne) har en allergi eller matrestriksjon? (valgfritt)</p>
            {ALLERGIES.map((a) => (
              <Slider
                key={a.id}
                id={`al-${a.id}`}
                label={a.label}
                value={Math.min(cfg.allergies[a.id] ?? 0, cfg.guests + cfg.adults)}
                min={0}
                max={cfg.guests + cfg.adults}
                suffix=" personer"
                onChange={(n) => setAllergy(a.id, n)}
              />
            ))}
          </div>
        )}

        {step === 3 && (
          <div data-testid="wizard-step-3">
            <h2>Maten</h2>
            <ChoiceGroup
              label="Hovedrett"
              options={[
                { value: 'polser', emoji: '🌭', label: 'Pølser', testId: 'choice-maindish-polser' },
                { value: 'pizza', emoji: '🍕', label: 'Pizza', testId: 'choice-maindish-pizza' }
              ]}
              value={cfg.mainDish}
              onChange={(mainDish) => set({ mainDish })}
            />

            {cfg.mainDish === 'polser' && (
              <>
                <div className="choice-group bread-ratio">
                  <p className="field-label">Brød: lompe og pølsebrød</p>
                  <input
                    type="range" min={0} max={100} step={5} value={cfg.breadRatio}
                    data-testid="bread-ratio" aria-label="Fordeling lompe og pølsebrød"
                    onChange={(e) => set({ breadRatio: Number(e.target.value) })}
                  />
                  <div className="ratio-ends"><span>🫓 Lompe</span><span>Pølsebrød 🥖</span></div>
                  <p className="hint" data-testid="bread-ratio-note">{cfg.breadRatio}% lompe · {100 - cfg.breadRatio}% pølsebrød. Vi kjøper begge deler etter fordelingen – og legger på litt ekstra margin på begge, så ingen går tom.</p>
                </div>
                <p className="hint">Vi legger til ketchup, sennep og stekt løk automatisk.</p>
              </>
            )}
          </div>
        )}
      </div>

      <nav className="wizard-nav" aria-label="Veiviser">
        <button type="button" data-testid="wizard-back" className="ghost" disabled={step === 1} onClick={() => setStep((s) => Math.max(1, s - 1))}>
          Tilbake
        </button>
        {step < 3 ? (
          <button type="button" data-testid="wizard-next" className="primary" onClick={next}>
            Neste
          </button>
        ) : (
          <button type="button" data-testid="wizard-finish" className="primary" onClick={finish}>
            Se handlelisten 🎉
          </button>
        )}
      </nav>
      <Footer />
    </section>
  );
}

type ChoiceValue = MainDish;

function ChoiceGroup<T extends ChoiceValue>({
  label,
  options,
  value,
  onChange
}: {
  label: string;
  options: { value: T; emoji?: string; label: string; testId: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div className="choice-group">
      <p className="field-label">{label}</p>
      <div className="choice-grid">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            data-testid={option.testId}
            className={`choice-card${value === option.value ? ' selected' : ''}`}
            aria-pressed={value === option.value}
            onClick={() => onChange(option.value)}
          >
            {option.emoji ? <span aria-hidden>{option.emoji}</span> : null}
            <strong>{option.label}</strong>
          </button>
        ))}
      </div>
    </div>
  );
}
