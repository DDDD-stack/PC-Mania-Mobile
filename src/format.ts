/** 125000 -> "125.000 L" (same thousands separator as the website). */
export function lek(n: number | null | undefined, suffix = ' L'): string {
  if (n == null) return '—';
  const sign = n < 0 ? '-' : '';
  return sign + Math.abs(Math.round(n)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.') + suffix;
}

export function pct(n: number | null | undefined): string {
  return n == null ? '—' : n.toFixed(1).replace('.', ',') + '%';
}

export function decimal(n: number | null | undefined): string {
  return n == null ? '—' : n.toFixed(1).replace('.', ',');
}

const pad = (n: number) => String(n).padStart(2, '0');

export function dateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** "tani", "12 min më parë", "3 orë më parë", "dje", "5 ditë më parë". */
export function ago(iso: string | null | undefined): string {
  if (!iso) return '';
  const minutes = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (minutes < 1) return 'tani';
  if (minutes < 60) return `${minutes} min më parë`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} orë më parë`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'dje';
  return `${days} ditë më parë`;
}
