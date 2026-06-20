const nf0 = new Intl.NumberFormat('nb-NO', { maximumFractionDigits: 0 });
const nf1 = new Intl.NumberFormat('nb-NO', { maximumFractionDigits: 1 });

export const n0 = (x: number): string => nf0.format(x);
export const n1 = (x: number): string => nf1.format(x);

export const kr = (x: number): string => `${nf0.format(Math.round(x))} kr`;

export function krRange(min?: number, max?: number): string {
  if (min == null) return '';
  if (max == null || Math.round(min) === Math.round(max)) return kr(min);
  return `${n0(Math.round(min))}–${n0(Math.round(max))} kr`;
}

/** "14 gjester" / "1 gjest" */
export function plural(n: number, one: string, many: string): string {
  return `${n0(n)} ${n === 1 ? one : many}`;
}
