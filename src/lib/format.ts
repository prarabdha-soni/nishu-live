export function money(n: number): string {
  return '$' + n.toLocaleString('en-US');
}

export function clock(seconds: number): string {
  const s = Math.max(0, seconds);
  return `0:${String(s).padStart(2, '0')}`;
}

export function compact(n: number): string {
  if (n >= 1000) {
    const k = n / 1000;
    return (k >= 10 ? Math.round(k) : Math.round(k * 10) / 10) + 'k';
  }
  return String(n);
}

let uid = 0;
export function nextId(prefix = 'id'): string {
  uid += 1;
  return `${prefix}-${Date.now().toString(36)}-${uid}`;
}

export function orderNumber(): string {
  return `NSH-${Math.floor(1000 + Math.random() * 9000)}`;
}

export function arrivingDate(daysFromNow = 5): string {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}
