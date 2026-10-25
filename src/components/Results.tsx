import { useState } from 'react';
import type { PlanResult } from '../lib/engine';
import { CATEGORY_LABEL, CATEGORY_EMOJI } from '../lib/engine';
import type { PartyConfig, LineItem } from '../lib/types';
import { krRange, n1, plural } from '../lib/format';
import { fetchPrices, type KassalProduct } from '../lib/kassal';
import { CHECKLIST, TIMELINE, BARNEHAGE_NOTE } from '../lib/checklist';
import { track } from '../lib/analytics';
import ActionToolbar from './ActionToolbar';
import { loadChecked, saveChecked, planToText, planToCsv, downloadFile, fileStem } from '../lib/exportList';
import { affiliateLinksFor, AFFILIATE_DISCLOSURE } from '../lib/affiliates';
import { shareUrl } from '../lib/store';
import { PRICE_SOURCE } from '../lib/catalog';
import type { Category } from '../lib/types';

function PriceLookup({ search }: { search: string }) {
  const [state, setState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [products, setProducts] = useState<KassalProduct[]>([]);
  const [err, setErr] = useState('');

  const run = async () => {
    setState('loading');
    track('price_lookup', { item: search });
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

function Row({ it, done, onToggle }: { it: LineItem; done: boolean; onToggle: () => void }) {
  return (
    <li className={`row${done ? ' row--done' : ''}`}>
      <div className="row-main">
        <label className="row-check">
          <input type="checkbox" checked={done} onChange={onToggle} />
          <span className="row-name">{it.emoji ? `${it.emoji} ` : ''}{it.name}</span>
        </label>
        <span className="row-qty">{n1(it.neededQty)} {it.unit}</span>
      </div>
      <div className="row-sub">
        {it.packs != null && (
          <span className="badge">
            {it.packs} × {it.packUnit || 'pakke'} = {it.buyQty} {it.unit}
            {it.buyWeightG ? ` (${n1(it.buyWeightG / 1000)} kg)` : ''}
          </span>
        )}
        {it.packs == null && it.packUnit && <span className="badge">{it.packUnit}</span>}
        {it.priceMin != null && <span className="price">{krRange(it.priceMin, it.priceMax)}</span>}
        {it.priceMin != null && !it.priceSource && (
          <span className="price-flag" title="Varen finnes ikke hos Oda, så prisen er et grovt anslag">anslag</span>
        )}
      </div>
      {it.note && <p className="row-note">{it.note.startsWith('Trygt') ? '✅' : '⚠️'} {it.note}</p>}
      {it.kassalSearch && <PriceLookup search={it.kassalSearch} />}
    </li>
  );
}

function WhereToBuy({ category }: { category: Category }) {
  const links = affiliateLinksFor(category);
  if (!links.length) return null;
  return (
    <ul className="aff-links no-print">
      {links.map((l) => (
        <li key={l.url}>
          <span className="aff-label">Annonselenke</span>{' '}
          <a href={l.url} target="_blank" rel="sponsored nofollow noopener" onClick={() => track('affiliate_click', { category, merchant: l.merchant })}>
            {l.label}{l.merchant ? ` hos ${l.merchant}` : ''}
          </a>
        </li>
      ))}
    </ul>
  );
}

function InlineNumber({
  value,
  min,
  max,
  onChange,
  label
}: {
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
  label: string;
}) {
  return (
    <input
      type="number"
      inputMode="numeric"
      className="inline-num"
      aria-label={label}
      value={value}
      min={min}
      max={max}
      onChange={(e) => {
        const n = parseInt(e.target.value, 10);
        if (Number.isFinite(n)) onChange(Math.min(max, Math.max(min, n)));
      }}
    />
  );
}

export default function Results({
  plan,
  cfg,
  onChange,
  onOpenConfig,
  onShare,
  onCopyLink,
  onPrint
}: {
  plan: PlanResult;
  cfg: PartyConfig;
  onChange: (cfg: PartyConfig) => void;
  onOpenConfig: () => void;
  onShare: () => void;
  onCopyLink: () => void;
  onPrint: () => void;
}) {
  const [checked, setChecked] = useState<Record<string, boolean>>(() => loadChecked());
  const [copied, setCopied] = useState(false);
  const [storageUnavailable, setStorageUnavailable] = useState(false);
  const toggle = (id: string) => {
    const next = { ...checked, [id]: !checked[id] };
    setChecked(next);
    setStorageUnavailable(!saveChecked(next));
  };
  const doneCount = plan.groups.reduce((n, g) => n + g.items.filter((it) => checked[it.id]).length, 0);
  const hasAffiliates = plan.groups.some((g) => affiliateLinksFor(g.category).length > 0);
  const copyText = async () => {
    const text = planToText(plan, cfg, checked, shareUrl(cfg));
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      downloadFile(`${fileStem(cfg)}.txt`, text, 'text/plain;charset=utf-8');
    }
    track('plan_exported', { format: 'clipboard', guests: cfg.guests, age: cfg.age });
  };
  const download = (format: 'txt' | 'csv') => {
    if (format === 'txt') downloadFile(`${fileStem(cfg)}.txt`, planToText(plan, cfg, checked, shareUrl(cfg)), 'text/plain;charset=utf-8');
    else downloadFile(`${fileStem(cfg)}.csv`, planToCsv(plan, checked), 'text/csv;charset=utf-8');
    track('plan_exported', { format, guests: cfg.guests, age: cfg.age });
  };
  const resetChecked = () => {
    setChecked({});
    setStorageUnavailable(!saveChecked({}));
  };

  return (
    <section className="results">
      <div className="result-head">
        <h2>Handleliste</h2>
        <p className="summary">
          For{' '}
          <InlineNumber value={cfg.guests} min={1} max={40} label="Antall gjester" onChange={(guests) => onChange({ ...cfg, guests })} />{' '}
          {plural(cfg.guests, 'gjest', 'gjester')} på{' '}
          <InlineNumber value={cfg.age} min={1} max={14} label="Barnets alder" onChange={(age) => onChange({ ...cfg, age })} />{' '}
          år{cfg.type === 'barnehage' ? ' (barnehage)' : ''} trenger du:
        </p>
        {plan.hasPrice && (
          <>
            <p className="total">Estimert kostnad: <strong>{krRange(plan.priceMin, plan.priceMax)}</strong></p>
            <p className="price-source" data-testid="price-source">
              {PRICE_SOURCE.label}. Varer merket «anslag» selges ikke hos Oda og har et grovt prisanslag.
            </p>
          </>
        )}
        <p className="method-note" data-testid="method-note">
          Slik regner vi: hver vare har en mengde per barn (etter aldersgruppe), per gjest eller per bord. Voksne regnes med der
          de spiser, og alt rundes opp til hele pakker. Prisene går fra billigste variant til kjent merke og er ikke dagens pris i din butikk.{' '}
          <a href="/guider/slik-beregner-kakeklar">Les hele metoden</a>
        </p>
      </div>

      <ActionToolbar position="over" onShare={onShare} onPrint={onPrint} onCustomize={onOpenConfig} />

      {cfg.type === 'barnehage' && <p className="note-box">{BARNEHAGE_NOTE}</p>}

      {plan.groups.map((g) => (
        <div key={g.category} className="cat">
          <h3>{CATEGORY_EMOJI[g.category]} {CATEGORY_LABEL[g.category]}</h3>
          <ul className="rows">
            {g.items.map((it) => (
              <Row key={it.id} it={it} done={!!checked[it.id]} onToggle={() => toggle(it.id)} />
            ))}
          </ul>
          <WhereToBuy category={g.category} />
        </div>
      ))}

      <ActionToolbar position="under" onShare={onShare} onPrint={onPrint} onCustomize={onOpenConfig} />

      {hasAffiliates && <p className="aff-note no-print">{AFFILIATE_DISCLOSURE}</p>}

      <div className="block export no-print" data-testid="export-block">
        <h2>Ta med listen</h2>
        <p className="muted">
          Kryss av det du har kjøpt. Avkrysningen lagres på denne enheten, så listen er klar når du åpner Kakeklar i butikken.
          Lenken tar med alder, antall gjester, voksne, mat og allergier, så den du deler med, får den samme listen.
          {doneCount > 0 && <> {doneCount} av {plan.itemCount} varer er krysset av.</>}
        </p>
        <div className="export-actions">
          <button type="button" className="btn btn--secondary" onClick={onCopyLink} data-testid="copy-link">
            🔗 Kopier lenke
          </button>
          <button type="button" className="btn btn--secondary" onClick={copyText} data-testid="export-copy">
            {copied ? '✓ Kopiert' : '📋 Kopier som tekst'}
          </button>
          <button type="button" className="btn btn--secondary" onClick={() => download('txt')} data-testid="export-txt">
            ⬇️ Last ned (.txt)
          </button>
          <button type="button" className="btn btn--secondary" onClick={() => download('csv')} data-testid="export-csv">
            📊 Regneark (.csv)
          </button>
          {doneCount > 0 && (
            <button type="button" className="link-btn" onClick={resetChecked} data-testid="export-reset">
              Nullstill avkrysning
            </button>
          )}
        </div>
        {storageUnavailable && (
          <p role="alert">Avkrysningen kunne ikke lagres på enheten. Listen virker fortsatt her, men avkrysningen kan gå tapt når du laster siden på nytt.</p>
        )}
        <p className="sr-only" aria-live="polite">{copied ? 'Listen er kopiert' : ''}</p>
      </div>

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

      <nav className="block guide-links no-print" aria-labelledby="guide-links-h">
        <h2 id="guide-links-h">Nyttige guider</h2>
        <ul>
          <li><a href="/guider/hvor-mye-mat-til-barnebursdag">Hvor mye mat trenger du til barnebursdag?</a></li>
          <li><a href="/guider/hvor-mye-drikke-til-barnebursdag">Hvor mye drikke går med?</a></li>
          <li><a href="/guider/hvor-stor-bursdagskake">Hvor stor bursdagskake trenger du?</a></li>
          <li><a href="/guider/planlegg-barnebursdag-steg-for-steg">Planlegg barnebursdagen steg for steg</a></li>
          <li><a href="/oppskrifter">Oppskrifter på kake og bursdagsmat</a></li>
        </ul>
      </nav>

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
