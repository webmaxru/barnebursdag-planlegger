/**
 * The summary-page action toolbar. Rendered twice — once above and once below
 * the shopping list — so the actions are always within reach. One primary action
 * (Del / share) and two secondary actions (Skriv ut, Tilpass).
 */
export default function ActionToolbar({
  onShare,
  onPrint,
  onCustomize,
  position
}: {
  onShare: () => void;
  onPrint: () => void;
  onCustomize: () => void;
  position: 'over' | 'under';
}) {
  return (
    <div
      className={`toolbar toolbar--${position} no-print`}
      role="toolbar"
      aria-label="Handlinger for handlelisten"
    >
      <button type="button" className="btn btn--primary" onClick={onShare}>
        📤 Del
      </button>
      <button type="button" className="btn btn--secondary" onClick={onPrint}>
        🖨️ Skriv ut
      </button>
      <button type="button" className="btn btn--secondary" onClick={onCustomize}>
        ⚙️ Tilpass
      </button>
    </div>
  );
}
