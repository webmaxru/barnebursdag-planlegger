import { useEffect, useMemo, useRef, useState } from 'react';
import Controls from './components/Controls';
import Results from './components/Results';
import ConfigEditor from './components/ConfigEditor';
import Wizard from './components/Wizard';
import Footer from './components/Footer';
import Garland from './components/Garland';
import MenyCart from './components/MenyCart';
import AgentPrompt from './components/AgentPrompt';
import { computePlan } from './lib/engine';
import { krRange } from './lib/format';
import { loadCatalog, saveCatalog, parseConfig, writeConfig, shareUrl } from './lib/store';
import type { GoodItem, PartyConfig } from './lib/types';
import { track } from './lib/analytics';
import { isMenyEnabled } from './lib/meny';
import { useWebMcpTools } from './lib/webmcp';
import ContentPage, { isContentPath } from './components/ContentPage';

export default function App() {
  const pathname = window.location.pathname.replace(/\/$/, '') || '/';
  if (isContentPath(pathname)) return <ContentPage path={pathname} />;

  const [catalog, setCatalog] = useState<GoodItem[]>(() => loadCatalog());
  const [cfg, setCfg] = useState<PartyConfig>(() => parseConfig());
  const [view, setView] = useState<'wizard' | 'app' | 'config'>(() => {
    const hasParams = new URLSearchParams(window.location.search).toString().length > 0;
    return hasParams || localStorage.getItem('kk.wizardDone') === '1' ? 'app' : 'wizard';
  });
  const [toast, setToast] = useState('');
  const [manualLink, setManualLink] = useState('');
  const manualRef = useRef<HTMLInputElement>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [menyEnabled] = useState(() => isMenyEnabled());

  const plan = useMemo(() => computePlan(catalog, cfg), [catalog, cfg]);

  // Expose the planner to in-browser AI agents via WebMCP (see src/lib/webmcp.ts).
  // Registered unconditionally (before the wizard early-return) so agents can plan
  // from any screen; `onPlanned` reveals the result view so the effect is visible.
  useWebMcpTools({
    cfg,
    catalog,
    onChange: setCfg,
    onPlanned: () => {
      localStorage.setItem('kk.wizardDone', '1');
      setView('app');
    }
  });

  useEffect(() => writeConfig(cfg), [cfg]);
  useEffect(() => saveCatalog(catalog), [catalog]);

  // Expand all <details> when printing so the checklist is fully visible.
  useEffect(() => {
    const open = () => document.querySelectorAll('details').forEach((d) => d.setAttribute('open', ''));
    window.addEventListener('beforeprint', open);
    return () => window.removeEventListener('beforeprint', open);
  }, []);

  // Debounced engagement event when the party is (re)configured.
  useEffect(() => {
    const t = window.setTimeout(() => {
      track('party_configured', {
        guests: cfg.guests,
        age: cfg.age,
        partyType: cfg.type,
        durationHours: cfg.duration
      });
    }, 1200);
    return () => window.clearTimeout(t);
  }, [cfg]);

  const showToast = (m: string) => {
    setToast(m);
    window.setTimeout(() => setToast(''), 2200);
  };

  // Copy the link; when the clipboard is unavailable (old browser, http, denied),
  // show the link in a field so it can be copied by hand.
  const copyLink = async (url = shareUrl(cfg)) => {
    try {
      await navigator.clipboard.writeText(url);
      setManualLink('');
      showToast('Lenke kopiert ✓');
      track('plan_shared', { method: 'clipboard', guests: cfg.guests, age: cfg.age });
    } catch {
      setManualLink(url);
    }
  };

  const share = async () => {
    const url = shareUrl(cfg);
    const cost = plan.hasPrice ? `, ca. ${krRange(plan.priceMin, plan.priceMax)}` : '';
    const data = {
      title: 'Kakeklar',
      text: `Handleliste for ${cfg.guests} gjester på ${cfg.age} år${cost} 🎂`,
      url
    };
    if (typeof navigator.share === 'function' && (!navigator.canShare || navigator.canShare(data))) {
      try {
        await navigator.share(data);
        track('plan_shared', { method: 'webshare', guests: cfg.guests, age: cfg.age });
        return;
      } catch (e) {
        if (e instanceof DOMException && e.name === 'AbortError') return; // user closed the share sheet
      }
    }
    await copyLink(url);
  };

  useEffect(() => {
    if (manualLink) manualRef.current?.select();
  }, [manualLink]);

  const printPlan = () => {
    track('plan_printed', { guests: cfg.guests, age: cfg.age });
    window.print();
  };

  const openConfig = () => {
    track('config_opened');
    setView('config');
  };

  const finishWizard = (nextCfg: PartyConfig) => {
    setCfg(nextCfg);
    localStorage.setItem('kk.wizardDone', '1');
    setView('app');
  };

  const skipWizard = () => {
    localStorage.setItem('kk.wizardDone', '1');
    setEditOpen(true);
    setView('app');
  };

  if (view === 'wizard') {
    return <Wizard cfg={cfg} onChange={setCfg} onFinish={finishWizard} onSkip={skipWizard} />;
  }

  return (
    <div className="app" data-testid="app">
      <header className="hero">
        <Garland count={16} />
        <p className="hero-eyebrow">Barnebursdag · uten stress</p>
        <h1>Kakeklar</h1>
        <p className="hero-sub">Riktig mengde til barnebursdagen – på to glidere.</p>
        <div className="hero-actions">
          <button type="button" data-testid="open-wizard" className="btn btn--primary btn--lg" onClick={() => setView('wizard')}>
            ✨ Veiviser
          </button>
          {menyEnabled && view === 'app' && (
            <MenyCart plan={plan} cfg={cfg} onToast={showToast} />
          )}
          {view === 'app' && <AgentPrompt plan={plan} cfg={cfg} onToast={showToast} />}
        </div>
      </header>

      {view === 'app' ? (
        <>
          <Results plan={plan} cfg={cfg} onChange={setCfg} onOpenConfig={openConfig} onShare={share} onCopyLink={() => copyLink()} onPrint={printPlan} />
          <section className="edit-block no-print">
            <button
              type="button"
              className="disclosure edit-toggle"
              data-testid="toggle-edit"
              aria-expanded={editOpen}
              onClick={() => setEditOpen((o) => !o)}
            >
              {editOpen ? '▾' : '▸'} ✏️ Endre alder, gjester, mat og allergier
            </button>
            {editOpen && <Controls cfg={cfg} onChange={setCfg} />}
          </section>
        </>
      ) : (
        <ConfigEditor catalog={catalog} onChange={setCatalog} onClose={() => setView('app')} />
      )}

      <Footer />

      {manualLink && (
        <div className="share-fallback no-print" role="dialog" aria-label="Kopier lenken" data-testid="share-fallback">
          <label htmlFor="share-link">Kopier lenken til listen:</label>
          <input id="share-link" ref={manualRef} readOnly value={manualLink} onFocus={(e) => e.currentTarget.select()} />
          <button type="button" className="btn btn--secondary" onClick={() => setManualLink('')}>Lukk</button>
        </div>
      )}

      {toast && <div className="toast" role="status">{toast}</div>}
    </div>
  );
}
