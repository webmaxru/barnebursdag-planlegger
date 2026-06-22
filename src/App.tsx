import { useEffect, useMemo, useState } from 'react';
import Controls from './components/Controls';
import Results from './components/Results';
import ConfigEditor from './components/ConfigEditor';
import Wizard from './components/Wizard';
import Footer from './components/Footer';
import Garland from './components/Garland';
import MenyCart from './components/MenyCart';
import { computePlan } from './lib/engine';
import { loadCatalog, saveCatalog, parseConfig, writeConfig, shareUrl } from './lib/store';
import type { GoodItem, PartyConfig } from './lib/types';
import { track } from './lib/analytics';
import { isMenyEnabled } from './lib/meny';

export default function App() {
  const [catalog, setCatalog] = useState<GoodItem[]>(() => loadCatalog());
  const [cfg, setCfg] = useState<PartyConfig>(() => parseConfig());
  const [view, setView] = useState<'wizard' | 'app' | 'config'>(() => {
    const hasParams = new URLSearchParams(window.location.search).toString().length > 0;
    return hasParams || localStorage.getItem('kk.wizardDone') === '1' ? 'app' : 'wizard';
  });
  const [toast, setToast] = useState('');
  const [editOpen, setEditOpen] = useState(false);
  const [menyEnabled, setMenyEnabled] = useState(false);

  const plan = useMemo(() => computePlan(catalog, cfg), [catalog, cfg]);

  useEffect(() => writeConfig(cfg), [cfg]);
  useEffect(() => saveCatalog(catalog), [catalog]);

  // Resolve the experimental "Handle på MENY" feature flag once on mount.
  useEffect(() => {
    isMenyEnabled().then(setMenyEnabled).catch(() => setMenyEnabled(false));
  }, []);

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

  const share = async () => {
    const url = shareUrl(cfg);
    const data = {
      title: 'Kakeklar',
      text: `Handleliste for ${cfg.guests} gjester på ${cfg.age} år 🎂`,
      url
    };
    try {
      if (navigator.share) {
        await navigator.share(data);
        track('plan_shared', { method: 'webshare', guests: cfg.guests, age: cfg.age });
      } else {
        await navigator.clipboard.writeText(url);
        showToast('Lenke kopiert ✓');
        track('plan_shared', { method: 'clipboard', guests: cfg.guests, age: cfg.age });
      }
    } catch {
      /* user cancelled share */
    }
  };

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
        <button type="button" data-testid="open-wizard" className="hero-wizard" onClick={() => setView('wizard')}>
          ✨ Veiviser
        </button>
        {menyEnabled && view === 'app' && (
          <MenyCart plan={plan} cfg={cfg} onToast={showToast} />
        )}
      </header>

      {view === 'app' ? (
        <>
          <Results plan={plan} cfg={cfg} onChange={setCfg} onOpenConfig={openConfig} />
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

      {view === 'app' && (
        <nav className="actionbar no-print" aria-label="Handlinger">
          <button onClick={share} className="primary">📤 Del</button>
          <button onClick={printPlan} className="ghost">🖨️ Skriv ut</button>
          <button onClick={openConfig} className="ghost">⚙️ Tilpass</button>
        </nav>
      )}

      {toast && <div className="toast" role="status">{toast}</div>}
    </div>
  );
}
