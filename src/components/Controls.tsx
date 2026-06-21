import { useState } from 'react';
import Slider from './Slider';
import { suggestedGuests } from '../lib/engine';
import type { MainDish, PartyConfig, SausageBread, TreatBag } from '../lib/types';
import { track } from '../lib/analytics';

const ALLERGIES = [
  { id: 'gluten', label: 'Glutenfri' },
  { id: 'melk', label: 'Melkefri' },
  { id: 'egg', label: 'Eggfri' },
  { id: 'nott', label: 'Nøttefri' },
  { id: 'svin', label: 'Uten svin' }
];

export default function Controls({ cfg, onChange }: { cfg: PartyConfig; onChange: (c: PartyConfig) => void }) {
  const [open, setOpen] = useState(false);
  const set = (patch: Partial<PartyConfig>) => onChange({ ...cfg, ...patch });
  const setAllergy = (id: string, count: number) => {
    const next = { ...cfg.allergies };
    if (count > 0) next[id] = count; else delete next[id];
    set({ allergies: next });
    track('allergy_changed', { allergy: id, count });
  };
  const suggested = suggestedGuests(cfg.age);

  return (
    <section className="card controls">
      <Slider
        id="alder"
        emoji="🎂"
        label="Barnets alder"
        value={cfg.age}
        min={1}
        max={14}
        suffix=" år"
        onChange={(v) => set({ age: v })}
      />

      <Slider
        id="gjester"
        emoji="🧒"
        label="Antall gjester"
        value={cfg.guests}
        min={1}
        max={40}
        onChange={(v) => set({ guests: v })}
        hint={`Vanlig regel: «alder + 1» = ${suggested} gjester`}
      />

      <Slider
        id="voksne"
        emoji="🧑‍🤝‍🧑"
        label="Voksne (følge)"
        value={cfg.adults}
        min={0}
        max={20}
        onChange={(v) => set({ adults: v })}
      />

      <div className="segmented" role="tablist" aria-label="Type feiring">
        <button role="tab" aria-selected={cfg.type === 'hjemme'} className={cfg.type === 'hjemme' ? 'active' : ''} onClick={() => { set({ type: 'hjemme' }); track('party_type_changed', { type: 'hjemme' }); }}>
          🏠 Hjemmefest
        </button>
        <button role="tab" aria-selected={cfg.type === 'barnehage'} className={cfg.type === 'barnehage' ? 'active' : ''} onClick={() => { set({ type: 'barnehage' }); track('party_type_changed', { type: 'barnehage' }); }}>
          🧸 Barnehage
        </button>
      </div>

      <div className="food-controls">
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
            <ChoiceGroup
              label="Brød"
              options={[
                { value: 'lompe', label: 'Lompe', testId: 'choice-bread-lompe' },
                { value: 'polsebrod', label: 'Pølsebrød', testId: 'choice-bread-polsebrod' }
              ]}
              value={cfg.sausageBread}
              onChange={(sausageBread) => set({ sausageBread })}
            />
            <p className="hint">Vi legger til ketchup, sennep og stekt løk automatisk.</p>
          </>
        )}
        <ChoiceGroup
          label="Godteri"
          options={[
            { value: 'godteposer', emoji: '🍬', label: 'Godteposer', testId: 'choice-treat-godteposer' },
            { value: 'pinata', emoji: '🪅', label: 'Pinata', testId: 'choice-treat-pinata' }
          ]}
          value={cfg.treatBag}
          onChange={(treatBag) => set({ treatBag })}
        />
      </div>

      <button type="button" className="disclosure" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        {open ? '▾' : '▸'} Flere valg (allergier, varighet)
      </button>

      {open && (
        <div className="advanced">
          <p className="field-label">Allergier – antall barn</p>
          {ALLERGIES.map((a) => (
            <Slider
              key={a.id}
              id={`al-${a.id}`}
              label={a.label}
              value={Math.min(cfg.allergies[a.id] ?? 0, cfg.guests)}
              min={0}
              max={cfg.guests}
              suffix=" barn"
              onChange={(n) => setAllergy(a.id, n)}
            />
          ))}
          <Slider id="varighet" emoji="⏱️" label="Varighet" value={cfg.duration} min={1} max={5} suffix=" t" onChange={(v) => set({ duration: v })} />
        </div>
      )}
    </section>
  );
}

type ChoiceValue = MainDish | SausageBread | TreatBag;

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
