import { useEffect, useRef, useState } from 'react';
import type { PlanResult } from '../lib/engine';
import type { PartyConfig } from '../lib/types';
import { buildAgentPrompt, DELIVERY_PLACEHOLDER } from '../lib/agentPrompt';
import { shareUrl } from '../lib/store';
import { track } from '../lib/analytics';

/** Oda's official MCP server (verified 25.10.2026: oda.com/mcp, «Oda MCP Server» v1.2.0, sign-in with OAuth). */
export const ODA_MCP_URL = 'https://oda.com/mcp';

/**
 * The alternative to the MENY cart: a ready-to-paste prompt for the user's own
 * grocery-ordering AI agent. Opens a dialog with a preview and a copy button;
 * when the clipboard is blocked, the text is selected so it can be copied by hand.
 */
export default function AgentPrompt({
  plan,
  cfg,
  onToast
}: {
  plan: PlanResult;
  cfg: PartyConfig;
  onToast: (m: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [manual, setManual] = useState(false);
  const areaRef = useRef<HTMLTextAreaElement>(null);
  const disabled = plan.itemCount === 0;
  const prompt = open ? buildAgentPrompt(plan, cfg, shareUrl(cfg)) : '';

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const show = () => {
    setManual(false);
    setOpen(true);
    track('agent_prompt_opened', { items: plan.itemCount, guests: cfg.guests, age: cfg.age });
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(prompt);
      setManual(false);
      onToast('Prompt kopiert ✓');
      track('agent_prompt_copied', { method: 'clipboard', items: plan.itemCount });
    } catch {
      // Clipboard blocked (insecure context, old browser, denied permission): select the text instead.
      setManual(true);
      areaRef.current?.focus();
      areaRef.current?.select();
      track('agent_prompt_copied', { method: 'manual', items: plan.itemCount });
    }
  };

  return (
    <>
      <button
        type="button"
        className="btn btn--secondary btn--lg no-print"
        data-testid="agent-prompt-button"
        onClick={show}
        disabled={disabled}
        title={disabled ? 'Ingen varer på listen ennå' : 'Kopier handlelisten som en prompt til AI-agenten din'}
      >
        🤖 Prompt til handleagent
      </button>

      {open && (
        <div className="meny-overlay no-print" role="presentation" onClick={() => setOpen(false)}>
          <div
            className="meny-modal agent-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="agent-prompt-h"
            data-testid="agent-prompt-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="meny-modal-head">
              <h2 id="agent-prompt-h">🤖 Prompt til handleagenten din</h2>
              <button type="button" className="meny-close" aria-label="Lukk" onClick={() => setOpen(false)}>
                ✕
              </button>
            </div>

            <p className="meny-lead">
              Har du en AI-agent som kan handle mat for deg? Da kan du gi den hele listen. Jeg har skrevet en ferdig
              prompt med varene, mengdene, allergiene og reglene agenten skal følge – den fyller handlekurven, og du
              betaler selv.
            </p>
            <p className="agent-hint">
              Fyll inn leveringsdato der det står <code>{DELIVERY_PLACEHOLDER}</code> før du sender den.
            </p>

            <label className="agent-label" htmlFor="agent-prompt-text">Forhåndsvisning</label>
            <textarea
              id="agent-prompt-text"
              ref={areaRef}
              className="agent-preview"
              data-testid="agent-prompt-text"
              readOnly
              rows={9}
              value={prompt}
              onFocus={(e) => e.currentTarget.select()}
            />

            <div className="meny-actions">
              <button type="button" className="btn btn--primary" onClick={copy} data-testid="agent-prompt-copy">
                📋 Kopier prompt til handleagenten din
              </button>
            </div>
            {manual && (
              <p className="agent-manual" role="alert" data-testid="agent-prompt-manual">
                Nettleseren stoppet kopieringen. Teksten er markert – kopier den selv (Ctrl+C eller hold inne og velg «Kopier»).
              </p>
            )}

            <p className="meny-note">
              Et eksempel er{' '}
              <a href={ODA_MCP_URL} target="_blank" rel="noopener noreferrer" data-testid="agent-prompt-oda">
                Oda MCP
              </a>{' '}
              – Odas egen MCP-server. Du kobler den til Claude, ChatGPT, Gemini eller en annen agent og logger inn med
              Oda-kontoen din. Agenten kan søke og fylle handlekurven, men betalingen skjer alltid hos Oda. Prompten
              virker også med andre agenter som har tilgang til en nettbutikk.
            </p>

            <p className="meny-disclaimer">
              Kakeklar er en uavhengig tjeneste og er ikke tilknyttet, godkjent av eller sponset av Oda. Prompten sendes
              ikke noe sted fra Kakeklar – den blir bare kopiert til utklippstavlen din.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
