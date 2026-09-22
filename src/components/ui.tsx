import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, Animated, Easing, Platform, Pressable, StyleSheet, Text, View,
  type LayoutChangeEvent, type StyleProp, type ViewStyle,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import type { LucideIcon } from 'lucide-react-native';
import { colors, font, radius, shadow, space, statusColors } from '../theme';

const nativeDriver = Platform.OS !== 'web';

export function haptic(kind: 'light' | 'success' | 'warning' | 'error' = 'light') {
  if (Platform.OS === 'web') return;
  if (kind === 'light') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  else Haptics.notificationAsync(
    kind === 'success' ? Haptics.NotificationFeedbackType.Success
      : kind === 'warning' ? Haptics.NotificationFeedbackType.Warning : Haptics.NotificationFeedbackType.Error,
  ).catch(() => {});
}

/** Shrinks slightly while pressed, springs back on release. */
export function PressableScale({ onPress, style, children, disabled, scaleTo = 0.97, accessibilityLabel }: {
  onPress?: () => void; style?: StyleProp<ViewStyle>; children: React.ReactNode; disabled?: boolean; scaleTo?: number;
  accessibilityLabel?: string;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const to = (value: number) =>
    Animated.spring(scale, { toValue: value, useNativeDriver: nativeDriver, speed: 40, bounciness: 6 }).start();
  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => to(scaleTo)}
      onPressOut={() => to(1)}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
    >
      <Animated.View style={[style, { transform: [{ scale }] }, disabled && { opacity: 0.5 }]}>{children}</Animated.View>
    </Pressable>
  );
}

export function Card({ children, style, onPress }: { children: React.ReactNode; style?: StyleProp<ViewStyle>; onPress?: () => void }) {
  if (onPress) return <PressableScale onPress={onPress} style={[styles.card, style]}>{children}</PressableScale>;
  return <View style={[styles.card, style]}>{children}</View>;
}

export function StatusBadge({ status, label, size = 'md' }: { status: string; label: string; size?: 'sm' | 'md' }) {
  const c = statusColors[status] ?? { fg: colors.textMuted, bg: colors.border };
  return (
    <View style={[styles.badge, { backgroundColor: c.bg }, size === 'sm' && { paddingHorizontal: 7, paddingVertical: 2 }]}>
      <View style={[styles.badgeDot, { backgroundColor: c.fg }]} />
      <Text style={[styles.badgeText, { color: c.fg }, size === 'sm' && { fontSize: 11 }]}>{label}</Text>
    </View>
  );
}

type ButtonVariant = 'primary' | 'dark' | 'secondary' | 'danger' | 'whatsapp' | 'ghost';

export function Button({ title, onPress, variant = 'primary', icon: Icon, loading, disabled, style, compact }: {
  title: string; onPress: () => void; variant?: ButtonVariant; icon?: LucideIcon; loading?: boolean; disabled?: boolean;
  style?: StyleProp<ViewStyle>; compact?: boolean;
}) {
  const v = BUTTONS[variant];
  return (
    <PressableScale
      onPress={() => { haptic('light'); onPress(); }}
      disabled={disabled || loading}
      style={[styles.button, { backgroundColor: v.bg, borderColor: v.border }, compact && styles.buttonCompact, style]}
      accessibilityLabel={title}
    >
      {loading ? <ActivityIndicator color={v.fg} size="small" /> : Icon ? <Icon size={compact ? 16 : 18} color={v.fg} strokeWidth={2.2} /> : null}
      <Text style={[styles.buttonText, { color: v.fg }, compact && { fontSize: 14 }]}>{title}</Text>
    </PressableScale>
  );
}

const BUTTONS: Record<ButtonVariant, { bg: string; fg: string; border: string }> = {
  primary: { bg: colors.accent, fg: '#111827', border: colors.accent },
  dark: { bg: colors.navy, fg: colors.white, border: colors.navy },
  secondary: { bg: colors.white, fg: colors.text, border: colors.border },
  danger: { bg: colors.white, fg: colors.danger, border: '#fecaca' },
  whatsapp: { bg: colors.whatsapp, fg: colors.white, border: colors.whatsapp },
  ghost: { bg: 'transparent', fg: colors.textMuted, border: 'transparent' },
};

/** Segmented control whose highlight slides between tabs. */
export function SegmentedTabs<K extends string>({ tabs, value, onChange }: {
  tabs: { key: K; label: string; count?: number }[]; value: K; onChange: (key: K) => void;
}) {
  const [width, setWidth] = useState(0);
  const index = Math.max(0, tabs.findIndex((t) => t.key === value));
  const x = useRef(new Animated.Value(0)).current;
  const tabWidth = width / tabs.length;

  useEffect(() => {
    Animated.spring(x, { toValue: index * tabWidth, useNativeDriver: nativeDriver, speed: 22, bounciness: 4 }).start();
  }, [index, tabWidth, x]);

  return (
    <View style={styles.segment} onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width - 8)}>
      {width > 0 && (
        <Animated.View style={[styles.segmentThumb, { width: tabWidth, transform: [{ translateX: x }] }]} />
      )}
      {tabs.map((t) => {
        const active = t.key === value;
        return (
          <Pressable key={t.key} style={styles.segmentTab} accessibilityRole="tab" accessibilityState={{ selected: active }}
                     onPress={() => { if (!active) { haptic('light'); onChange(t.key); } }}>
            <Text style={[styles.segmentText, active && styles.segmentTextActive]} numberOfLines={1}>{t.label}</Text>
            {t.count != null && t.count > 0 && (
              <View style={[styles.segmentCount, active && { backgroundColor: colors.navy }]}>
                <Text style={[styles.segmentCountText, active && { color: colors.white }]}>{t.count}</Text>
              </View>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

/** Fades and slides children in; pass an increasing delay for staggered lists. */
export function FadeIn({ children, delay = 0, style }: { children: React.ReactNode; delay?: number; style?: StyleProp<ViewStyle> }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(v, { toValue: 1, duration: 320, delay, easing: Easing.out(Easing.cubic), useNativeDriver: nativeDriver }).start();
  }, [v, delay]);
  return (
    <Animated.View style={[style, { opacity: v, transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }] }]}>
      {children}
    </Animated.View>
  );
}

export function Skeleton({ width = '100%', height = 16, style }: { width?: number | `${number}%`; height?: number; style?: StyleProp<ViewStyle> }) {
  const v = useRef(new Animated.Value(0.45)).current;
  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(v, { toValue: 1, duration: 700, useNativeDriver: nativeDriver }),
      Animated.timing(v, { toValue: 0.45, duration: 700, useNativeDriver: nativeDriver }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [v]);
  return <Animated.View style={[{ width, height, borderRadius: 6, backgroundColor: '#e2e8f0', opacity: v }, style]} />;
}

export function SkeletonList({ count = 4 }: { count?: number }) {
  return (
    <View style={{ gap: space.md }}>
      {Array.from({ length: count }, (_, i) => (
        <View key={i} style={styles.card}>
          <Skeleton width="45%" height={14} />
          <Skeleton width="80%" height={18} style={{ marginTop: 10 }} />
          <Skeleton width="30%" height={14} style={{ marginTop: 10 }} />
        </View>
      ))}
    </View>
  );
}

export function EmptyState({ icon: Icon, title, subtitle }: { icon: LucideIcon; title: string; subtitle?: string }) {
  return (
    <FadeIn style={styles.empty}>
      <View style={styles.emptyIcon}><Icon size={28} color={colors.textFaint} /></View>
      <Text style={[font.title, { textAlign: 'center' }]}>{title}</Text>
      {subtitle ? <Text style={[font.small, { textAlign: 'center', marginTop: 4 }]}>{subtitle}</Text> : null}
    </FadeIn>
  );
}

export function ErrorBanner({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <View style={styles.error}>
      <Text style={{ color: colors.danger, flex: 1 }}>{message}</Text>
      {onRetry && <Button title="Provo" variant="danger" compact onPress={onRetry} />}
    </View>
  );
}

export function SectionTitle({ children, right }: { children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <View style={styles.sectionTitle}>
      <Text style={font.tiny}>{children}</Text>
      {right}
    </View>
  );
}

export function Row({ label, value, strong }: { label: string; value: React.ReactNode; strong?: boolean }) {
  return (
    <View style={styles.row}>
      <Text style={font.small}>{label}</Text>
      {typeof value === 'string' || typeof value === 'number'
        ? <Text style={[font.body, font.money, strong && { fontWeight: '800' }, { flexShrink: 1, textAlign: 'right' }]}>{value}</Text>
        : value}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.card, borderRadius: radius.lg, padding: space.lg, borderWidth: 1, borderColor: colors.border, ...shadow },
  badge: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 5, paddingHorizontal: 9, paddingVertical: 3, borderRadius: 999 },
  badgeDot: { width: 6, height: 6, borderRadius: 3 },
  badgeText: { fontSize: 12, fontWeight: '700' },
  button: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    minHeight: 50, paddingHorizontal: 18, borderRadius: radius.md, borderWidth: 1,
  },
  buttonCompact: { minHeight: 38, paddingHorizontal: 12 },
  buttonText: { fontSize: 16, fontWeight: '700' },
  segment: { flexDirection: 'row', backgroundColor: '#e2e8f0', borderRadius: radius.md, padding: 4, position: 'relative' },
  segmentThumb: { position: 'absolute', top: 4, bottom: 4, left: 4, backgroundColor: colors.white, borderRadius: radius.sm, ...shadow },
  segmentTab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 9 },
  segmentText: { fontSize: 14, fontWeight: '600', color: colors.textMuted },
  segmentTextActive: { color: colors.text },
  segmentCount: { minWidth: 20, height: 20, paddingHorizontal: 6, borderRadius: 10, backgroundColor: '#cbd5e1', alignItems: 'center', justifyContent: 'center' },
  segmentCountText: { fontSize: 11, fontWeight: '800', color: colors.text },
  empty: { alignItems: 'center', paddingVertical: 48, paddingHorizontal: 24 },
  emptyIcon: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#eef0f3', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  error: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.dangerSoft, borderRadius: radius.md, padding: space.md },
  sectionTitle: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: space.xl, marginBottom: space.sm },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12, paddingVertical: 7 },
});
