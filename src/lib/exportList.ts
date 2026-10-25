import type { PlanResult } from './engine';
import { CATEGORY_LABEL } from './engine';
import type { PartyConfig } from './types';
import { PRICE_SOURCE } from './catalog';
import { krRange, n1, plural } from './format';

/** Ticked-off items survive a reload, so the list can be reopened in the shop. Keyed by item id. */
const CHECK_KEY = 'kk.checked';

export function loadChecked(): Record<string, boolean> {
  try {
    const v = JSON.parse(localStorage.getItem(CHECK_KEY) || '{}');
    return v && typeof v === 'object' ? v : {};
  } catch {
    return {};
  }
}

export function saveChecked(checked: Record<string, boolean>): boolean {
  try {
    const kept = Object.fromEntries(Object.entries(checked).filter(([, v]) => v));
    if (Object.keys(kept).length) localStorage.setItem(CHECK_KEY, JSON.stringify(kept));
    else localStorage.removeItem(CHECK_KEY);
    return true;
  } catch {
    return false;
  }
}

function summary(cfg: PartyConfig) {
  const parts = [plural(cfg.guests, 'gjest', 'gjester'), `${cfg.age} år`];
  if (cfg.adults > 0) parts.push(plural(cfg.adults, 'voksen', 'voksne'));
  parts.push(cfg.type === 'barnehage' ? 'barnehage' : 'hjemme');
  return parts.join(' · ');
}

/** Plain-text list with tick boxes – pastes cleanly into Notes, Messenger, SMS or an e-mail. */
export function planToText(plan: PlanResult, cfg: PartyConfig, checked: Record<string, boolean>, url: string): string {
  const lines = ['Handleliste til barnebursdag', summary(cfg)];
  if (plan.hasPrice) lines.push(`Estimert kostnad: ${krRange(plan.priceMin, plan.priceMax)} (${PRICE_SOURCE.label.replace('Priser: ', '')})`);
  for (const g of plan.groups) {
    lines.push('', CATEGORY_LABEL[g.category].toUpperCase());
    for (const it of g.items) {
      const qty = `${n1(it.neededQty)} ${it.unit}`;
      const packs = it.packs != null ? ` (${it.packs} × ${it.packUnit || 'pakke'})` : '';
      lines.push(`${checked[it.id] ? '☑' : '☐'} ${it.name} – ${qty}${packs}${it.note ? ` – ${it.note}` : ''}`);
    }
  }
  lines.push('', `Laget med Kakeklar: ${url}`);
  return lines.join('\n');
}

const csvCell = (v: string | number | undefined) => {
  let s = v == null ? '' : String(v);
  // Quotes alone do not stop spreadsheets interpreting imported catalog text as formulas.
  if (typeof v === 'string' && /^(?:[\s\u0000-\u001f\u007f-\u009f]*[=+\-@]|[\t\r\n])/.test(s)) s = "'" + s;
  return /[";\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** Semicolon-separated with a BOM, which is what Norwegian Excel and Numbers open correctly. */
export function planToCsv(plan: PlanResult, checked: Record<string, boolean>): string {
  const rows: (string | number | undefined)[][] = [['Kategori', 'Vare', 'Mengde', 'Enhet', 'Antall pakker', 'Pakning', 'Pris fra (kr)', 'Pris til (kr)', 'Kjøpt', 'Merknad']];
  for (const g of plan.groups) {
    for (const it of g.items) {
      rows.push([CATEGORY_LABEL[g.category], it.name, n1(it.neededQty), it.unit, it.packs, it.packUnit,
        it.priceMin == null ? undefined : Math.round(it.priceMin),
        it.priceMax == null ? undefined : Math.round(it.priceMax), checked[it.id] ? 'ja' : '', it.note]);
    }
  }
  return '\uFEFF' + rows.map((r) => r.map(csvCell).join(';')).join('\r\n') + '\r\n';
}

export function downloadFile(name: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

export function fileStem(cfg: PartyConfig) {
  return `kakeklar-handleliste-${cfg.guests}-gjester-${cfg.age}-ar`;
}
