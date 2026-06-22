/**
 * Festfane — the signature Norwegian party-banner garland.
 * Purely decorative (aria-hidden); never carries app state or test hooks.
 */
export default function Garland({ count = 14 }: { count?: number }) {
  return (
    <div className="garland" aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <span key={i} className="pennant" style={{ ['--i' as string]: i }} />
      ))}
    </div>
  );
}
