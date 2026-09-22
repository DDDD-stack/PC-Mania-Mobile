import { Platform } from 'react-native';

/** Matches the website: dark navy chrome, amber accent. */
export const colors = {
  navy: '#0f172a',
  navy2: '#1e293b',
  navy3: '#334155',
  accent: '#f59e0b',
  accentDark: '#d97706',
  accentSoft: '#fef3c7',
  bg: '#f4f5f7',
  card: '#ffffff',
  border: '#e5e7eb',
  text: '#0f172a',
  textMuted: '#64748b',
  textFaint: '#94a3b8',
  success: '#16a34a',
  successSoft: '#dcfce7',
  danger: '#dc2626',
  dangerSoft: '#fee2e2',
  whatsapp: '#25d366',
  white: '#ffffff',
};

/** Status colours always sit next to the status label text, never alone. */
export const statusColors: Record<string, { fg: string; bg: string }> = {
  // orders
  NEW: { fg: '#b91c1c', bg: '#fee2e2' },
  CONFIRMED: { fg: '#0369a1', bg: '#e0f2fe' },
  SHIPPED: { fg: '#6d28d9', bg: '#ede9fe' },
  DELIVERED: { fg: '#15803d', bg: '#dcfce7' },
  CANCELLED: { fg: '#475569', bg: '#e2e8f0' },
  // products
  ACTIVE: { fg: '#15803d', bg: '#dcfce7' },
  RESERVED: { fg: '#b45309', bg: '#fef3c7' },
  SOLD: { fg: '#1d4ed8', bg: '#dbeafe' },
  DRAFT: { fg: '#475569', bg: '#e2e8f0' },
  HIDDEN: { fg: '#334155', bg: '#e2e8f0' },
  // build requests (NEW is shared with orders)
  QUOTED: { fg: '#0369a1', bg: '#e0f2fe' },
  ACCEPTED: { fg: '#15803d', bg: '#dcfce7' },
  DECLINED: { fg: '#475569', bg: '#e2e8f0' },
  CLOSED: { fg: '#334155', bg: '#e2e8f0' },
};

export const radius = { sm: 8, md: 12, lg: 16, xl: 22 };
export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 };

export const shadow = Platform.select({
  web: { boxShadow: '0 1px 2px rgba(15,23,42,.06), 0 4px 14px rgba(15,23,42,.05)' } as object,
  default: { elevation: 2, shadowColor: '#0f172a', shadowOpacity: 0.08, shadowRadius: 10, shadowOffset: { width: 0, height: 3 } },
});

export const font = {
  h1: { fontSize: 26, fontWeight: '800' as const, color: colors.text, letterSpacing: -0.4 },
  h2: { fontSize: 19, fontWeight: '700' as const, color: colors.text },
  title: { fontSize: 15, fontWeight: '700' as const, color: colors.text },
  body: { fontSize: 15, color: colors.text },
  small: { fontSize: 13, color: colors.textMuted },
  tiny: { fontSize: 11, color: colors.textMuted, fontWeight: '600' as const, letterSpacing: 0.4, textTransform: 'uppercase' as const },
  money: { fontVariant: ['tabular-nums' as const] },
};
