import React from 'react';
import { FlatList, Image, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Bell, Calendar, ChevronRight, Package, Plus, Users } from 'lucide-react-native';
import { useApi } from '../session';
import { useLoad } from '../useLoad';
import { useLayout } from '../useLayout';
import type { UpcomingRow } from '../api/types';
import { Button, Card, EmptyState, ErrorBanner, FadeIn, SkeletonList, StatusBadge } from '../components/ui';
import { lek } from '../format';
import { colors, font, radius, space } from '../theme';

export default function UpcomingScreen() {
  const api = useApi();
  const nav = useNavigation<any>();
  const { gutter, listColumns, content } = useLayout();
  const list = useLoad(() => api.upcoming(), [api]);

  return (
    <View style={styles.root}>
      <View style={[{ paddingHorizontal: gutter, paddingTop: space.md }, content]}>
        <Button title="Shto artikull" icon={Plus} onPress={() => nav.navigate('UpcomingDetail', { id: null, title: 'Artikull i ri' })} />
      </View>

      {list.error && <View style={{ paddingHorizontal: space.lg, paddingTop: space.md }}>
        <ErrorBanner message={list.error} onRetry={list.refresh} />
      </View>}

      {list.loading && !list.data ? (
        <View style={styles.content}><SkeletonList /></View>
      ) : (
        <FlatList
          key={String(listColumns)}
          data={list.data ?? []}
          keyExtractor={(u) => String(u.id)}
          numColumns={listColumns}
          columnWrapperStyle={listColumns > 1 ? { gap: space.md } : undefined}
          contentContainerStyle={[styles.content, { flexGrow: 1, paddingHorizontal: gutter }, content]}
          ItemSeparatorComponent={() => <View style={{ height: space.md }} />}
          refreshControl={<RefreshControl refreshing={list.refreshing} onRefresh={list.refresh} tintColor={colors.accent} colors={[colors.accent]} />}
          ListEmptyComponent={
            <EmptyState icon={Bell} title="Asgjë në rrugë"
                        subtitle="Shtoni çfarë keni porositur. Klientët lënë numrin dhe ju i telefononi kur të vijë." />
          }
          renderItem={({ item, index }) => (
            <FadeIn delay={Math.min(index, 8) * 45} style={listColumns > 1 ? { flex: 1 } : undefined}>
              <UpcomingCard item={item} onPress={() => nav.navigate('UpcomingDetail', { id: item.id, title: item.title })} />
            </FadeIn>
          )}
        />
      )}
    </View>
  );
}

function UpcomingCard({ item: u, onPress }: { item: UpcomingRow; onPress: () => void }) {
  return (
    <Card onPress={onPress} style={{ flexDirection: 'row', gap: space.md }}>
      {u.imageUrl
        ? <Image source={{ uri: u.imageUrl }} style={styles.thumb} />
        : <View style={[styles.thumb, styles.thumbEmpty]}><Package size={22} color={colors.textFaint} /></View>}
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={styles.top}>
          <Text style={[font.title, { flex: 1 }]} numberOfLines={2}>{u.title}</Text>
          <StatusBadge status={u.status} label={u.statusLabel} size="sm" />
        </View>
        <View style={styles.meta}>
          {u.expectedLabel ? (
            <View style={styles.metaItem}>
              <Calendar size={13} color={colors.textFaint} />
              <Text style={font.small}>{u.expectedLabel}</Text>
            </View>
          ) : null}
          {u.expectedPriceLek != null ? (
            <Text style={[font.small, font.money]}>rreth {lek(u.expectedPriceLek)}</Text>
          ) : null}
        </View>
        <View style={styles.bottom}>
          <View style={[styles.waiting, u.interestCount > 0 && { backgroundColor: colors.accentSoft }]}>
            <Users size={13} color={u.interestCount > 0 ? colors.accentDark : colors.textFaint} />
            <Text style={[font.small, u.interestCount > 0 && { color: colors.accentDark, fontWeight: '700' }]}>
              {u.interestCount} interesuar
            </Text>
          </View>
          <ChevronRight size={18} color={colors.textFaint} />
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  content: { padding: space.lg, paddingTop: space.md, paddingBottom: 32 },
  thumb: { width: 64, height: 64, borderRadius: radius.sm, backgroundColor: '#e2e8f0' },
  thumbEmpty: { alignItems: 'center', justifyContent: 'center' },
  top: { flexDirection: 'row', gap: space.sm, alignItems: 'flex-start' },
  meta: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: space.md, marginTop: 4 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  bottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 },
  waiting: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, backgroundColor: '#f1f5f9' },
});
