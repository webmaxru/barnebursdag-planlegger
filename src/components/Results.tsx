import { useState } from 'react';
import type { PlanResult } from '../lib/engine';
import { CATEGORY_LABEL, CATEGORY_EMOJI } from '../lib/engine';
import type { PartyConfig, LineItem } from '../lib/types';
import { krRange, n1, plural } from '../lib/format';
import { fetchPrices, type KassalProduct } from '../lib/kassal';
import { CHECKLIST, TIMELINE, BARNEHAGE_NOTE } from '../lib/checklist';

function PriceLookup({ search }: { search: string }) {
  const [state, setState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [products, setProducts] = useState<KassalProduct[]>([]);
  const [err, setErr] = useState('');

  const run = async () => {
    setState('loading');
    try {
      const r = await fetchPrices(search, 3);
      setProducts(r.products);
      setState('done');
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Feil');
      setState('error');
    }
  };

  return (
    <div className="pricelookup no-print">
      {state === 'idle' && (
        <button className="mini-btn" onClick={run}>💰 Sjekk pris</button>
      )}
      {state === 'loading' && <span className="muted">Henter priser…</span>}
      {state === 'error' && <span className="muted">{err}</span>}
      {state === 'done' &&
        (products.length ? (
          <ul className="prices">
            {products.map((p) => (
              <li key={p.id}>
                <a href={p.url} target="_blank" rel="noopener noreferrer">{p.name}</a>
                <span>{[p.store, p.price != null ? `${p.price} kr` : null].filter(Boolean).join(' · ')}</span>
              </li>
            ))}
          </ul>
        ) : (
          <span className="muted">Ingen treff</span>
        ))}
    </div>
  );
}

function Row({ it }: { it: LineItem }) {
  return (
    <li className="row">
      <div className="row-main">
        <span className="row-name">{it.emoji ? `${it.emoji} ` : ''}{it.name}</span>
        <span className="row-qty">{n1(it.neededQty)} {it.unit}</span>
      </div>
      <div className="row-sub">
        {it.packs != null && (
          <span className="badge">{it.packs} × {it.packUnit || 'pakke'} = {it.buyQty} {it.unit}</span>
        )}
        {it.packs == null && it.packUnit && <span className="badge">{it.packUnit}</span>}
        {it.priceMin != null && <span className="price">{krRange(it.priceMin, it.priceMax)}</span>}
      </div>
      {it.note && <p className="row-note">⚠️ {it.note}</p>}
      {it.kassalSearch && <PriceLookup search={it.kassalSearch} />}
    </li>
  );
}

export default function Results({
  plan,
  cfg,
  onOpenConfig
}: {
  plan: PlanResult;
  cfg: PartyConfig;
  onOpenConfig: () => void;
}) {
  return (
    <section className="results">
      <div className="result-head">
        <h2>Handleliste</h2>
        <p className="summary">
          For {plural(cfg.guests, 'gjest', 'gjester')} på {cfg.age} år
          {cfg.type === 'barnehage' ? ' (barnehage)' : ''} trenger du:
        </p>
        {plan.hasPrice && (
          <p className="total">Estimert kostnad: <strong>{krRange(plan.priceMin, plan.priceMax)}</strong></p>
        )}
      </div>

      {cfg.type === 'barnehage' && <p className="note-box">{BARNEHAGE_NOTE}</p>}

      {plan.groups.map((g) => (
        <div key={g.category} className="cat">
          <h3>{CATEGORY_EMOJI[g.category]} {CATEGORY_LABEL[g.category]}</h3>
          <ul className="rows">
            {g.items.map((it) => (
              <Row key={it.id} it={it} />
            ))}
          </ul>
        </div>
      ))}

      <button className="secondary-btn no-print" onClick={onOpenConfig}>⚙️ Tilpass varelisten</button>

      <div className="block checklist">
        <h2>Sjekkliste</h2>
        {CHECKLIST.map((s) => (
          <details key={s.title} className="cl-section">
            <summary>{s.emoji} {s.title}</summary>
            <ul>
              {s.items.map((i, idx) => (
                <li key={idx}>{i}</li>
              ))}
            </ul>
          </details>
        ))}
      </div>

      <div className="block timeline">
        <h2>Tidsplan</h2>
        <ol>
          {TIMELINE.map((t) => (
            <li key={t.when}>
              <strong>{t.when}</strong>
              <ul>
                {t.tasks.map((x, i) => (
                  <li key={i}>{x}</li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
