import { useState } from 'react';
import Slider from './Slider';
import { suggestedGuests } from '../lib/engine';
import type { PartyConfig } from '../lib/types';
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
        max={12}
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

      <div className="segmented" role="tablist" aria-label="Type feiring">
        <button role="tab" aria-selected={cfg.type === 'hjemme'} className={cfg.type === 'hjemme' ? 'active' : ''} onClick={() => { set({ type: 'hjemme' }); track('party_type_changed', { type: 'hjemme' }); }}>
          🏠 Hjemmefest
        </button>
        <button role="tab" aria-selected={cfg.type === 'barnehage'} className={cfg.type === 'barnehage' ? 'active' : ''} onClick={() => { set({ type: 'barnehage' }); track('party_type_changed', { type: 'barnehage' }); }}>
          🧸 Barnehage
        </button>
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
