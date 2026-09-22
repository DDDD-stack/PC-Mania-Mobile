import React, { useEffect, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { ChevronRight, Clock, MapPin, ShoppingBag } from 'lucide-react-native';
import { useApi } from '../session';
import { useLoad } from '../useLoad';
import { useLayout } from '../useLayout';
import type { OrderGroup, OrderRow } from '../api/types';
import { Card, EmptyState, ErrorBanner, FadeIn, SegmentedTabs, SkeletonList, StatusBadge } from '../components/ui';
import { ago, lek } from '../format';
import { colors, font, space } from '../theme';

const EMPTY: Record<OrderGroup, { title: string; subtitle: string }> = {
  new: { title: 'Asnjë porosi e re', subtitle: 'Porositë e reja nga faqja shfaqen këtu. Do t\'ju njoftojmë kur të vijë një.' },
  active: { title: 'Asgjë në proces', subtitle: 'Porositë e konfirmuara dhe të dërguara shfaqen këtu.' },
  done: { title: 'Ende pa porosi të përfunduara', subtitle: 'Porositë e dorëzuara dhe të anuluara ruhen këtu.' },
};

export default function OrdersScreen() {
  const api = useApi();
  const nav = useNavigation<any>();
  const route = useRoute<any>();
  const [group, setGroup] = useState<OrderGroup>(route.params?.group ?? 'new');
  const { gutter, listColumns, content } = useLayout();

  useEffect(() => {
    if (route.params?.group) setGroup(route.params.group);
  }, [route.params?.group]);

  const counts = useLoad(() => api.orderCounts(), [api]);
  const list = useLoad(() => api.orders(group), [api, group]);

  const refresh = () => { counts.reload(); list.refresh(); };

  return (
    <View style={styles.root}>
      <View style={[styles.tabs, { paddingHorizontal: gutter }, content]}>
        <SegmentedTabs<OrderGroup>
          value={group}
          onChange={setGroup}
          tabs={[
            { key: 'new', label: 'Të reja', count: counts.data?.new },
            { key: 'active', label: 'Në proces', count: counts.data?.active },
            { key: 'done', label: 'Mbyllura' },
          ]}
        />
      </View>

      {list.error && <View style={{ paddingHorizontal: space.lg }}><ErrorBanner message={list.error} onRetry={list.refresh} /></View>}

      {list.loading && !list.data ? (
        <View style={styles.content}><SkeletonList /></View>
      ) : (
        <FlatList
          key={group + listColumns}
          data={list.data?.items ?? []}
          keyExtractor={(o) => String(o.id)}
          numColumns={listColumns}
          columnWrapperStyle={listColumns > 1 ? { gap: space.md } : undefined}
          contentContainerStyle={[styles.content, { flexGrow: 1, paddingHorizontal: gutter }, content]}
          ItemSeparatorComponent={() => <View style={{ height: space.md }} />}
          refreshControl={<RefreshControl refreshing={list.refreshing} onRefresh={refresh} tintColor={colors.accent} colors={[colors.accent]} />}
          ListEmptyComponent={<EmptyState icon={ShoppingBag} {...EMPTY[group]} />}
          renderItem={({ item, index }) => (
            <FadeIn delay={Math.min(index, 8) * 45} style={listColumns > 1 ? { flex: 1 } : undefined}>
              <OrderCard order={item} onPress={() => nav.navigate('OrderDetail', { id: item.id, title: item.orderNumber })} />
            </FadeIn>
          )}
        />
      )}
    </View>
  );
}

function OrderCard({ order: o, onPress }: { order: OrderRow; onPress: () => void }) {
  return (
    <Card onPress={onPress} style={o.status === 'NEW' ? styles.newCard : undefined}>
      <View style={styles.top}>
        <Text style={styles.number}>{o.orderNumber}</Text>
        <StatusBadge status={o.status} label={o.statusLabel} size="sm" />
      </View>
      <Text style={[font.title, { marginTop: 8 }]} numberOfLines={1}>{o.customerName}</Text>
      <Text style={[font.small, { marginTop: 2 }]} numberOfLines={1}>
        {o.itemCount > 1 ? `${o.itemCount} × ` : ''}{o.itemsSummary}
      </Text>
      <View style={styles.bottom}>
        <View style={styles.meta}>
          <MapPin size={13} color={colors.textFaint} />
          <Text style={font.small}>{o.city}</Text>
          <Clock size={13} color={colors.textFaint} style={{ marginLeft: 8 }} />
          <Text style={font.small}>{ago(o.createdAt)}</Text>
        </View>
        <View style={styles.meta}>
          <Text style={[styles.total, font.money]}>{lek(o.totalLek)}</Text>
          <ChevronRight size={18} color={colors.textFaint} />
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  tabs: { paddingHorizontal: space.lg, paddingTop: space.md, paddingBottom: space.sm },
  content: { padding: space.lg, paddingTop: space.sm, paddingBottom: 32 },
  newCard: { borderLeftWidth: 4, borderLeftColor: colors.danger },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  number: { fontSize: 13, fontWeight: '700', color: colors.textMuted, fontVariant: ['tabular-nums'] },
  bottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  total: { fontSize: 17, fontWeight: '800', color: colors.text },
});
