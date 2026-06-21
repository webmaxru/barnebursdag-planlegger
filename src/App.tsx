import { useEffect, useMemo, useState } from 'react';
import Controls from './components/Controls';
import Results from './components/Results';
import ConfigEditor from './components/ConfigEditor';
import { computePlan } from './lib/engine';
import { loadCatalog, saveCatalog, parseConfig, writeConfig, shareUrl } from './lib/store';
import type { GoodItem, PartyConfig } from './lib/types';

export default function App() {
  const [catalog, setCatalog] = useState<GoodItem[]>(() => loadCatalog());
  const [cfg, setCfg] = useState<PartyConfig>(() => parseConfig());
  const [view, setView] = useState<'plan' | 'config'>('plan');
  const [toast, setToast] = useState('');

  const plan = useMemo(() => computePlan(catalog, cfg), [catalog, cfg]);

  useEffect(() => writeConfig(cfg), [cfg]);
  useEffect(() => saveCatalog(catalog), [catalog]);

  // Expand all <details> when printing so the checklist is fully visible.
  useEffect(() => {
    const open = () => document.querySelectorAll('details').forEach((d) => d.setAttribute('open', ''));
    window.addEventListener('beforeprint', open);
    return () => window.removeEventListener('beforeprint', open);
  }, []);

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
      if (navigator.share) await navigator.share(data);
      else {
        await navigator.clipboard.writeText(url);
        showToast('Lenke kopiert ✓');
      }
    } catch {
      /* user cancelled share */
    }
  };

  return (
    <div className="app">
      <header className="hero">
        <h1><span aria-hidden>🎂</span> Kakeklar</h1>
        <p>Riktig mengde til barnebursdagen – på to glidere.</p>
      </header>

      {view === 'plan' ? (
        <>
          <Controls cfg={cfg} onChange={setCfg} />
          <Results plan={plan} cfg={cfg} onOpenConfig={() => setView('config')} />
        </>
      ) : (
        <ConfigEditor catalog={catalog} onChange={setCatalog} onClose={() => setView('plan')} />
      )}

      <footer className="foot">
        <p>Kakeklar er gratis · ingen innlogging · for norske foreldre. Mengdene er anbefalinger – juster fritt.</p>
      </footer>

      {view === 'plan' && (
        <nav className="actionbar no-print" aria-label="Handlinger">
          <button onClick={share} className="primary">📤 Del</button>
          <button onClick={() => window.print()} className="ghost">🖨️ Skriv ut</button>
          <button onClick={() => setView('config')} className="ghost">⚙️ Tilpass</button>
        </nav>
      )}

      {toast && <div className="toast" role="status">{toast}</div>}
    </div>
  );
}
