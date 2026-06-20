import { useState } from 'react';
import Slider from './Slider';
import { suggestedGuests } from '../lib/engine';
import type { PartyConfig } from '../lib/types';

const ALLERGIES = [
  { id: 'nott', label: 'Nøttefri' },
  { id: 'gluten', label: 'Glutenfri' },
  { id: 'melk', label: 'Melkefri' },
  { id: 'svin', label: 'Uten svin' },
  { id: 'egg', label: 'Eggfri' }
];

export default function Controls({ cfg, onChange }: { cfg: PartyConfig; onChange: (c: PartyConfig) => void }) {
  const [open, setOpen] = useState(false);
  const set = (patch: Partial<PartyConfig>) => onChange({ ...cfg, ...patch });
  const toggleAllergy = (id: string) =>
    set({ allergies: cfg.allergies.includes(id) ? cfg.allergies.filter((a) => a !== id) : [...cfg.allergies, id] });
  const suggested = suggestedGuests(cfg.age);

  return (
    <section className="card controls">
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
      {cfg.guests !== suggested && (
        <button type="button" className="link-btn" onClick={() => set({ guests: suggested })}>
          Bruk foreslått antall ({suggested})
        </button>
      )}

      <Slider
        id="alder"
        emoji="🎂"
        label="Barnets alder"
        value={cfg.age}
        min={1}
        max={12}
        suffix=" år"
        onChange={(v) => set({ age: v })}
      />

      <div className="segmented" role="tablist" aria-label="Type feiring">
        <button role="tab" aria-selected={cfg.type === 'hjemme'} className={cfg.type === 'hjemme' ? 'active' : ''} onClick={() => set({ type: 'hjemme' })}>
          🏠 Hjemmefest
        </button>
        <button role="tab" aria-selected={cfg.type === 'barnehage'} className={cfg.type === 'barnehage' ? 'active' : ''} onClick={() => set({ type: 'barnehage' })}>
          🧸 Barnehage
        </button>
      </div>

      <button type="button" className="disclosure" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        {open ? '▾' : '▸'} Flere valg (allergier, varighet)
      </button>

      {open && (
        <div className="advanced">
          <p className="field-label">Allergier / hensyn</p>
          <div className="chips">
            {ALLERGIES.map((a) => (
              <button
                key={a.id}
                type="button"
                className={'chip' + (cfg.allergies.includes(a.id) ? ' on' : '')}
                aria-pressed={cfg.allergies.includes(a.id)}
                onClick={() => toggleAllergy(a.id)}
              >
                {a.label}
              </button>
            ))}
          </div>
          <Slider id="varighet" emoji="⏱️" label="Varighet" value={cfg.duration} min={1} max={5} suffix=" t" onChange={(v) => set({ duration: v })} />
        </div>
      )}
    </section>
  );
}
