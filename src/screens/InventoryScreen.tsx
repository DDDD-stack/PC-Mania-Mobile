import React, { useEffect, useState } from 'react';
import { FlatList, Image, RefreshControl, StyleSheet, Text, TextInput, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Bell, ChevronRight, Eye, Gpu, Hourglass, Package, Search } from 'lucide-react-native';
import { useApi } from '../session';
import { useLoad } from '../useLoad';
import { useLayout } from '../useLayout';
import type { ProductGroup, ProductRow } from '../api/types';
import { Card, EmptyState, ErrorBanner, FadeIn, PressableScale, SegmentedTabs, SkeletonList, StatusBadge } from '../components/ui';
import { lek } from '../format';
import { colors, font, radius, space } from '../theme';

export default function InventoryScreen() {
  const api = useApi();
  const nav = useNavigation<any>();
  const [group, setGroup] = useState<ProductGroup>('active');
  const { gutter, listColumns, content } = useLayout();
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 300);
    return () => clearTimeout(t);
  }, [query]);

  const counts = useLoad(() => api.productCounts(), [api]);
  const list = useLoad(() => api.products(group, debounced), [api, group, debounced]);
  const upcoming = useLoad(() => api.upcoming(), [api]);
  const waiting = (upcoming.data ?? []).reduce((n, u) => n + u.interestCount, 0);

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingHorizontal: gutter }, content]}>
        <View style={styles.search}>
          <Search size={18} color={colors.textFaint} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Kërko produkt…"
            placeholderTextColor={colors.textFaint}
            style={styles.searchInput}
            returnKeyType="search"
            autoCorrect={false}
          />
        </View>
        <SegmentedTabs<ProductGroup>
          value={group}
          onChange={setGroup}
          tabs={[
            { key: 'active', label: 'Aktive', count: counts.data?.active },
            { key: 'reserved', label: 'Rezerv.', count: counts.data?.reserved },
            { key: 'hidden', label: 'Draft' },
            { key: 'sold', label: 'Shitur' },
          ]}
        />
        <PressableScale onPress={() => nav.navigate('Upcoming')} style={styles.upcomingLink}>
          <Bell size={16} color={colors.accentDark} />
          <Text style={styles.upcomingText}>Së shpejti</Text>
          {waiting > 0 && (
            <View style={styles.waitingPill}>
              <Text style={styles.waitingPillText}>{waiting} presin</Text>
            </View>
          )}
          <ChevronRight size={16} color={colors.textFaint} style={{ marginLeft: 'auto' }} />
        </PressableScale>
      </View>

      {list.error && <View style={{ paddingHorizontal: space.lg }}><ErrorBanner message={list.error} onRetry={list.refresh} /></View>}

      {list.loading && !list.data ? (
        <View style={styles.content}><SkeletonList /></View>
      ) : (
        <FlatList
          key={group + listColumns}
          data={list.data?.items ?? []}
          keyExtractor={(p) => String(p.id)}
          numColumns={listColumns}
          columnWrapperStyle={listColumns > 1 ? { gap: space.md } : undefined}
          contentContainerStyle={[styles.content, { flexGrow: 1, paddingHorizontal: gutter }, content]}
          ItemSeparatorComponent={() => <View style={{ height: space.md }} />}
          keyboardShouldPersistTaps="handled"
          refreshControl={<RefreshControl refreshing={list.refreshing} onRefresh={() => { counts.reload(); list.refresh(); }}
                                          tintColor={colors.accent} colors={[colors.accent]} />}
          ListEmptyComponent={<EmptyState icon={Package} title={debounced ? 'Asnjë rezultat' : 'Asnjë produkt këtu'}
                                          subtitle={debounced ? `Nuk u gjet asgjë për "${debounced}".` : undefined} />}
          renderItem={({ item, index }) => (
            <FadeIn delay={Math.min(index, 8) * 40} style={listColumns > 1 ? { flex: 1 } : undefined}>
              <ProductCard p={item} onPress={() => nav.navigate('ProductDetail', { id: item.id })} />
            </FadeIn>
          )}
        />
      )}
    </View>
  );
}

export function ProductThumb({ uri, size = 64 }: { uri: string | null; size?: number }) {
  return uri ? (
    <Image source={{ uri }} style={[styles.thumb, { width: size, height: size }]} />
  ) : (
    <View style={[styles.thumb, styles.thumbEmpty, { width: size, height: size }]}><Gpu size={size * 0.45} color={colors.textFaint} /></View>
  );
}

function ProductCard({ p, onPress }: { p: ProductRow; onPress: () => void }) {
  const margin = p.priceLek > 0 ? ((p.priceLek - p.costLek) / p.priceLek) * 100 : 0;
  const slow = p.status === 'ACTIVE' && (p.daysListed ?? 0) >= 30;
  return (
    <Card onPress={onPress} style={styles.card}>
      <ProductThumb uri={p.thumbUrl} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={font.title} numberOfLines={2}>{p.title}</Text>
        <View style={styles.metaRow}>
          <StatusBadge status={p.status} label={p.statusLabel} size="sm" />
          <Text style={font.small}>{p.condition}</Text>
        </View>
        <View style={styles.priceRow}>
          <Text style={[styles.price, font.money]}>{lek(p.priceLek)}</Text>
          <Text style={[font.small, font.money, { color: margin < 0 ? colors.danger : colors.success }]}>
            +{lek(p.priceLek - p.costLek)}
          </Text>
        </View>
        <View style={styles.metaRow}>
          <Text style={[font.small, { fontWeight: '700', color: p.quantity === 0 ? colors.danger : colors.text }]}>
            {p.quantity} copë
          </Text>
          {p.daysListed != null && (
            <View style={styles.inline}>
              <Hourglass size={12} color={slow ? colors.accentDark : colors.textFaint} />
              <Text style={[font.small, slow && { color: colors.accentDark, fontWeight: '700' }]}>{p.daysListed} ditë</Text>
            </View>
          )}
          <View style={styles.inline}>
            <Eye size={12} color={colors.textFaint} />
            <Text style={font.small}>{p.viewCount}</Text>
          </View>
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: { paddingHorizontal: space.lg, paddingTop: space.md, paddingBottom: space.sm, gap: space.md },
  search: {
    flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.white, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border, paddingHorizontal: 12,
  },
  searchInput: { flex: 1, fontSize: 16, paddingVertical: 11, color: colors.text, outlineStyle: 'none' } as object,
  content: { padding: space.lg, paddingTop: space.sm, paddingBottom: 32 },
  card: { flexDirection: 'row', gap: space.md, padding: space.md },
  thumb: { borderRadius: radius.sm, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border },
  thumbEmpty: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#f1f5f9' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 6, flexWrap: 'wrap' },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8, marginTop: 6 },
  price: { fontSize: 17, fontWeight: '800', color: colors.text },
  inline: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  upcomingLink: {
    flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.white, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border, paddingHorizontal: 12, paddingVertical: 10,
  },
  upcomingText: { fontSize: 15, fontWeight: '600', color: colors.text },
  waitingPill: { backgroundColor: colors.accentSoft, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  waitingPillText: { fontSize: 12, fontWeight: '700', color: colors.accentDark },
});
