import React from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Boxes, ChevronRight, Coins, Hourglass, ShoppingBag, TrendingUp, Truck, Wrench, Zap } from 'lucide-react-native';
import { useApi, useSession } from '../session';
import { useLoad } from '../useLoad';
import { useLayout } from '../useLayout';
import { Card, ErrorBanner, FadeIn, PressableScale, SectionTitle, Skeleton } from '../components/ui';
import { decimal, lek, pct } from '../format';
import { colors, font, radius, space } from '../theme';

export default function DashboardScreen() {
  const api = useApi();
  const { session } = useSession();
  const nav = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { gutter, tileBasis, content, compact } = useLayout();
  const { data: s, error, loading, refreshing, refresh } = useLoad(() => api.summary(), [api]);

  const goOrders = (group: string) => nav.navigate('OrdersTab', { screen: 'Orders', params: { group } });

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{ paddingBottom: 32 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.accent} colors={[colors.accent]} />}
    >
      <View style={[styles.hero, { paddingTop: insets.top + 18, paddingHorizontal: gutter }]}>
        <View style={content}>
          <Text style={styles.hello} numberOfLines={1}>
            Mirë se erdhe{session?.username && session.username !== 'demo' ? `, ${session.username}` : ''} 👋
          </Text>
          <Text style={styles.heroTitle}>PC<Text style={{ color: colors.accent }}>Mania</Text></Text>
          {session?.server === 'demo' && <Text style={styles.demo}>Modaliteti demo – të dhënat nuk janë reale</Text>}

          <PressableScale onPress={() => goOrders('new')} style={[styles.callout, compact && { padding: space.md }]}>
            <View style={styles.calloutIcon}><ShoppingBag size={26} color={colors.navy} /></View>
            <View style={{ flex: 1, minWidth: 0 }}>
              {loading || !s ? <Skeleton width={90} height={30} style={{ backgroundColor: '#fde68a' }} /> : (
                <Text style={styles.calloutNumber}>{s.newOrders}</Text>
              )}
              <Text style={styles.calloutLabel}>
                {s?.newOrders === 1 ? 'porosi e re për t\'u konfirmuar' : 'porosi të reja për t\'u konfirmuar'}
              </Text>
            </View>
            <ChevronRight size={22} color={colors.navy} />
          </PressableScale>
        </View>
      </View>

      <View style={[{ paddingHorizontal: gutter, marginTop: -18 }, content]}>
        {error && <ErrorBanner message={error} onRetry={refresh} />}

        <View style={styles.grid}>
          <Stat basis={tileBasis} delay={0} icon={Truck} label="Në proces" value={s ? String(s.inProgressOrders) : null}
                hint="të konfirmuara / dërguara" onPress={() => goOrders('active')} />
          <Stat basis={tileBasis} delay={60} icon={Wrench} label="Kërkesa PC" value={s ? String(s.newBuildRequests) : null}
                hint="të reja" tone={s && s.newBuildRequests > 0 ? 'warn' : undefined}
                onPress={() => nav.navigate('BuildsTab', { screen: 'Builds', params: { group: 'new' } })} />
        </View>

        <SectionTitle>Ky muaj</SectionTitle>
        <View style={styles.grid}>
          <Stat basis={tileBasis} delay={80} icon={Coins} label="Fitimi" value={s ? lek(s.profitThisMonth) : null}
                hint={s ? `${s.soldUnitsThisMonth} copë shitur` : ''} tone="good" />
          <Stat basis={tileBasis} delay={120} icon={TrendingUp} label="Të ardhura" value={s ? lek(s.revenueThisMonth) : null}
                hint={s ? `marzhi total ${pct(s.marginPct)}` : ''} />
        </View>

        <SectionTitle>Inventari</SectionTitle>
        <View style={styles.grid}>
          <Stat basis={tileBasis} delay={140} icon={Boxes} label="Në stok" value={s ? `${s.stockUnits} copë` : null}
                hint={s ? `kosto ${lek(s.stockCost)}` : ''} onPress={() => nav.navigate('InventoryTab')} />
          <Stat basis={tileBasis} delay={180} icon={Hourglass} label="Të ngadalta" value={s ? String(s.slowProducts) : null}
                hint="aktive 30+ ditë" tone={s && s.slowProducts > 0 ? 'warn' : undefined} onPress={() => nav.navigate('InventoryTab')} />
        </View>

        {s && (
          <FadeIn delay={220}>
            <Card style={styles.fastest}>
              <View style={styles.zap}><Zap size={20} color={colors.accentDark} /></View>
              <View style={{ flex: 1, minWidth: 120 }}>
                <Text style={font.small}>Qarkullon më shpejt</Text>
                <Text style={font.title}>{s.fastestBand ?? 'Ende pa të dhëna'}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={font.small}>Ditë deri në shitje</Text>
                <Text style={[font.title, font.money]}>{decimal(s.avgDaysToSell)}</Text>
              </View>
            </Card>
          </FadeIn>
        )}
      </View>
    </ScrollView>
  );
}

function Stat({ icon: Icon, label, value, hint, tone, onPress, delay, basis }: {
  icon: typeof Coins; label: string; value: string | null; hint?: string; tone?: 'good' | 'warn';
  onPress?: () => void; delay: number; basis: `${number}%`;
}) {
  const color = tone === 'good' ? colors.success : tone === 'warn' ? colors.accentDark : colors.navy3;
  return (
    <FadeIn delay={delay} style={{ flexGrow: 1, flexShrink: 1, flexBasis: basis, minWidth: 140 }}>
      <Card onPress={onPress} style={styles.stat}>
        <Icon size={18} color={color} />
        <Text style={[font.small, { marginTop: 8 }]} numberOfLines={1}>{label}</Text>
        {value == null ? <Skeleton width="70%" height={24} style={{ marginTop: 4 }} /> : (
          <Text style={[styles.statValue, font.money]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>{value}</Text>
        )}
        {hint ? <Text style={[font.small, { fontSize: 12 }]} numberOfLines={2}>{hint}</Text> : null}
      </Card>
    </FadeIn>
  );
}

const styles = StyleSheet.create({
  hero: { backgroundColor: colors.navy, paddingBottom: 36, borderBottomLeftRadius: 28, borderBottomRightRadius: 28 },
  hello: { color: '#94a3b8', fontSize: 15 },
  heroTitle: { color: colors.white, fontSize: 30, fontWeight: '800', letterSpacing: -0.5, marginTop: 2 },
  demo: { color: colors.accent, fontSize: 12, fontWeight: '600', marginTop: 4 },
  callout: {
    flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: space.lg,
    backgroundColor: colors.accent, borderRadius: radius.lg, padding: space.lg,
  },
  calloutIcon: { width: 48, height: 48, borderRadius: 14, backgroundColor: 'rgba(255,255,255,.45)', alignItems: 'center', justifyContent: 'center' },
  calloutNumber: { fontSize: 32, fontWeight: '900', color: colors.navy, lineHeight: 36 },
  calloutLabel: { color: colors.navy, fontSize: 14, fontWeight: '600' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md, marginTop: space.md },
  stat: { padding: space.md, minHeight: 118 },
  statValue: { fontSize: 21, fontWeight: '800', color: colors.text, marginTop: 2 },
  fastest: { marginTop: space.md, flexDirection: 'row', alignItems: 'center', gap: 12, flexWrap: 'wrap' },
  zap: { width: 40, height: 40, borderRadius: 12, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' },
});
