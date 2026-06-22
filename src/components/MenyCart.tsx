import { useEffect, useState } from 'react';
import type { PlanResult } from '../lib/engine';
import type { PartyConfig } from '../lib/types';
import { createMenyCart, planToMenyItems, type MenyCartResult } from '../lib/meny';
import { track } from '../lib/analytics';

type Phase = 'idle' | 'loading' | 'done' | 'error';

// Fire the "feature was shown" event once per page load (in-memory only, no device
// storage) so we can measure reach vs. actual use.
let exposureTracked = false;

export default function MenyCart({
  plan,
  cfg,
  onToast
}: {
  plan: PlanResult;
  cfg: PartyConfig;
  onToast: (m: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState<Phase>('idle');
  const [result, setResult] = useState<MenyCartResult | null>(null);
  const [error, setError] = useState('');

  const items = planToMenyItems(plan);
  const disabled = items.length === 0;

  // Exposure: how many people see the "Handle på MENY" button.
  useEffect(() => {
    if (!exposureTracked) {
      exposureTracked = true;
      track('meny_cart_available', { items: items.length });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const run = async () => {
    setOpen(true);
    setPhase('loading');
    setError('');
    setResult(null);
    track('meny_cart_started', { items: items.length, guests: cfg.guests, age: cfg.age });
    try {
      const r = await createMenyCart(items);
      setResult(r);
      setPhase('done');
      track('meny_cart_created', { matched: r.matched.length, unmatched: r.unmatched.length });
    } catch (e) {
      const reason = (e instanceof Error ? e.message : 'unknown').slice(0, 100);
      setError(e instanceof Error ? e.message : 'Noe gikk galt.');
      setPhase('error');
      track('meny_cart_error', { reason });
    }
  };

  const close = () => setOpen(false);

  // Close on Escape while the dialog is open.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const share = async () => {
    if (!result) return;
    const data = {
      title: 'Handlevogn på MENY',
      text: `Handlevogn for barnebursdag (${cfg.guests} gjester) 🎂`,
      url: result.url
    };
    try {
      if (navigator.share) {
        await navigator.share(data);
        track('meny_cart_shared', { method: 'webshare' });
      } else {
        await navigator.clipboard.writeText(result.url);
        onToast('Lenke kopiert ✓');
        track('meny_cart_shared', { method: 'clipboard' });
      }
    } catch {
      /* user cancelled */
    }
  };

  const copy = async () => {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result.url);
      onToast('Lenke kopiert ✓');
      track('meny_cart_shared', { method: 'clipboard' });
    } catch {
      /* ignore */
    }
  };

  return (
    <>
      <button
        type="button"
        className="btn btn--accent btn--lg no-print"
        data-testid="meny-cart-button"
        onClick={run}
        disabled={disabled}
        title={disabled ? 'Ingen matvarer å handle ennå' : 'Lag en delbar handlevogn på MENY'}
      >
        🛒 Handle på MENY
      </button>

      {open && (
        <div className="meny-overlay no-print" role="presentation" onClick={close}>
          <div
            className="meny-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Handlevogn på MENY"
            data-testid="meny-cart-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="meny-modal-head">
              <h2>🛒 Handlevogn på MENY</h2>
              <button type="button" className="meny-close" aria-label="Lukk" onClick={close}>
                ✕
              </button>
            </div>

            <p className="meny-experimental">Eksperimentell funksjon</p>

            {phase === 'loading' && (
              <div className="meny-status" data-testid="meny-cart-loading">
                <span className="meny-spinner" aria-hidden="true" />
                <p>Finner varene på MENY…</p>
              </div>
            )}

            {phase === 'error' && (
              <div className="meny-status">
                <p className="meny-error">⚠️ {error}</p>
                <button type="button" className="btn btn--secondary" onClick={run}>
                  Prøv igjen
                </button>
              </div>
            )}

            {phase === 'done' && result && (
              <div data-testid="meny-cart-result">
                <p className="meny-lead">
                  La {result.count} {result.count === 1 ? 'vare' : 'varer'} i en delbar handlevogn på MENY.
                </p>

                <div className="meny-link-row">
                  <input
                    className="meny-link"
                    data-testid="meny-cart-link"
                    readOnly
                    value={result.url}
                    onFocus={(e) => e.currentTarget.select()}
                    aria-label="Delbar lenke til handlevognen"
                  />
                  <button type="button" className="mini-btn" onClick={copy}>
                    📋 Kopier
                  </button>
                </div>

                <div className="meny-actions">
                  <a
                    className="btn btn--primary"
                    href={result.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => track('meny_cart_opened', { matched: result.matched.length })}
                  >
                    Åpne på MENY ↗
                  </a>
                  <button type="button" className="btn btn--secondary" onClick={share}>
                    📤 Del
                  </button>
                </div>

                {result.matched.length > 0 && (
                  <ul className="meny-items">
                    {result.matched.map((m) => (
                      <li key={m.ean}>
                        {m.image && <img src={m.image} alt="" loading="lazy" />}
                        <span className="meny-item-name">
                          {m.quantity} × {m.title}
                          {m.subtitle ? ` – ${m.subtitle}` : ''}
                        </span>
                        {m.price != null && <span className="meny-item-price">{m.price} kr</span>}
                      </li>
                    ))}
                  </ul>
                )}

                {result.unmatched.length > 0 && (
                  <p className="meny-unmatched">
                    Fant ikke på MENY: {result.unmatched.map((u) => u.name).join(', ')}.
                  </p>
                )}

                <p className="meny-note">
                  Lenken er en MENY-handlevogn du kan dele. Priser og varer kan variere etter butikk.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
