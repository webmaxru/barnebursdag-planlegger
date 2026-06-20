import { useRef, useState } from 'react';
import type { GoodItem, Category, AgeBand, CalcMode } from '../lib/types';
import { CATEGORY_ORDER, CATEGORY_LABEL } from '../lib/engine';
import { resetCatalog, exportCatalog, importCatalog } from '../lib/store';

const MODES: { id: CalcMode; label: string }[] = [
  { id: 'perChild', label: 'Per barn (etter alder)' },
  { id: 'perGuest', label: 'Per gjest' },
  { id: 'perTable', label: 'Per bord' },
  { id: 'ageCount', label: 'Antall = alder' },
  { id: 'fixed', label: 'Fast antall' }
];
const BANDS: AgeBand[] = ['3-4', '5-6', '7-9'];
const num = (v: string) => {
  const n = parseFloat(v.replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
};

export default function ConfigEditor({
  catalog,
  onChange,
  onClose
}: {
  catalog: GoodItem[];
  onChange: (c: GoodItem[]) => void;
  onClose: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState('');

  const update = (id: string, patch: Partial<GoodItem>) =>
    onChange(catalog.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  const updatePerChild = (id: string, band: AgeBand, val: number) =>
    onChange(
      catalog.map((it) =>
        it.id === id ? { ...it, perChild: { ...(it.perChild ?? { '3-4': 0, '5-6': 0, '7-9': 0 }), [band]: val } } : it
      )
    );
  const remove = (id: string) => onChange(catalog.filter((it) => it.id !== id));
  const addItem = () => {
    const id = 'ny-' + Date.now().toString(36);
    onChange([
      ...catalog,
      { id, name: 'Ny vare', emoji: '🛒', category: 'mat', unit: 'stk', mode: 'perGuest', factor: 1, enabled: true }
    ]);
    setMsg('La til en ny vare nederst.');
  };

  const doExport = () => {
    const blob = new Blob([exportCatalog(catalog)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'barnebursdag-varer.json';
    a.click();
    URL.revokeObjectURL(a.href);
  };
  const doImport = async (f: File) => {
    try {
      onChange(importCatalog(await f.text()));
      setMsg('Importert ✓');
    } catch (e) {
      setMsg('Feil: ' + (e instanceof Error ? e.message : 'kunne ikke lese fil'));
    }
  };

  return (
    <section className="config">
      <div className="config-bar">
        <h2>⚙️ Tilpass varelisten</h2>
        <button className="secondary-btn" onClick={onClose}>Ferdig</button>
      </div>
      <p className="muted">
        Endre antall, pakkestørrelser og priser – eller legg til egne varer. Lagres automatisk på denne enheten.
      </p>

      <div className="config-actions">
        <button className="mini-btn" onClick={addItem}>+ Legg til vare</button>
        <button className="mini-btn" onClick={doExport}>⬇️ Eksporter</button>
        <button className="mini-btn" onClick={() => fileRef.current?.click()}>⬆️ Importer</button>
        <button
          className="mini-btn danger"
          onClick={() => {
            if (confirm('Tilbakestille alle varer til standard?')) {
              onChange(resetCatalog());
              setMsg('Tilbakestilt til standardliste.');
            }
          }}
        >
          ↺ Nullstill
        </button>
        <input ref={fileRef} type="file" accept="application/json" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) doImport(f); }} />
      </div>
      {msg && <p className="muted">{msg}</p>}

      <div className="config-list">
        {catalog.map((it) => (
          <details key={it.id} className="config-item">
            <summary>
              <input
                type="checkbox"
                checked={it.enabled}
                onClick={(e) => e.stopPropagation()}
                onChange={(e) => update(it.id, { enabled: e.target.checked })}
                aria-label="Aktiver vare"
              />
              <span>{it.emoji} {it.name}</span>
              <em>{CATEGORY_LABEL[it.category]}</em>
            </summary>
            <div className="config-fields">
              <label>Navn<input value={it.name} onChange={(e) => update(it.id, { name: e.target.value })} /></label>
              <label>Emoji<input value={it.emoji || ''} maxLength={4} onChange={(e) => update(it.id, { emoji: e.target.value })} /></label>
              <label>Kategori
                <select value={it.category} onChange={(e) => update(it.id, { category: e.target.value as Category })}>
                  {CATEGORY_ORDER.map((c) => <option key={c} value={c}>{CATEGORY_LABEL[c]}</option>)}
                </select>
              </label>
              <label>Enhet<input value={it.unit} onChange={(e) => update(it.id, { unit: e.target.value })} /></label>
              <label>Beregning
                <select value={it.mode} onChange={(e) => update(it.id, { mode: e.target.value as CalcMode })}>
                  {MODES.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
                </select>
              </label>

              {it.mode === 'perChild' && (
                <div className="band-grid">
                  {BANDS.map((b) => (
                    <label key={b}>{b} år
                      <input type="number" step="0.5" value={it.perChild?.[b] ?? 0} onChange={(e) => updatePerChild(it.id, b, num(e.target.value))} />
                    </label>
                  ))}
                </div>
              )}
              {(it.mode === 'perGuest' || it.mode === 'perTable') && (
                <label>Faktor (per {it.mode === 'perTable' ? 'bord' : 'gjest'})
                  <input type="number" step="0.1" value={it.factor ?? 1} onChange={(e) => update(it.id, { factor: num(e.target.value) })} />
                </label>
              )}
              {it.mode === 'perTable' && (
                <label>Gjester per bord<input type="number" value={it.divisor ?? 8} onChange={(e) => update(it.id, { divisor: num(e.target.value) })} /></label>
              )}
              {it.mode === 'fixed' && (
                <label>Fast antall<input type="number" value={it.fixedQty ?? 1} onChange={(e) => update(it.id, { fixedQty: num(e.target.value) })} /></label>
              )}
              {it.mode === 'ageCount' && (
                <label className="check"><input type="checkbox" checked={!!it.growOn} onChange={(e) => update(it.id, { growOn: e.target.checked })} /> + 1 ekstra («en å vokse på»)</label>
              )}

              <label>Pakkestørrelse<input type="number" value={it.packSize ?? ''} placeholder="—" onChange={(e) => update(it.id, { packSize: e.target.value ? num(e.target.value) : undefined })} /></label>
              <label>Pakke-tekst<input value={it.packUnit || ''} onChange={(e) => update(it.id, { packUnit: e.target.value })} /></label>
              <label>Pris fra (kr)<input type="number" value={it.priceMinNok ?? ''} onChange={(e) => update(it.id, { priceMinNok: e.target.value ? num(e.target.value) : undefined })} /></label>
              <label>Pris til (kr)<input type="number" value={it.priceMaxNok ?? ''} onChange={(e) => update(it.id, { priceMaxNok: e.target.value ? num(e.target.value) : undefined })} /></label>
              <label>Kassal-søk<input value={it.kassalSearch || ''} onChange={(e) => update(it.id, { kassalSearch: e.target.value })} /></label>
              <label className="check"><input type="checkbox" checked={!!it.homeOnly} onChange={(e) => update(it.id, { homeOnly: e.target.checked })} /> Kun hjemmefest (skjul i barnehage)</label>

              <button className="mini-btn danger" onClick={() => remove(it.id)}>Slett vare</button>
            </div>
          </details>
        ))}
      </div>
    </section>
  );
}
