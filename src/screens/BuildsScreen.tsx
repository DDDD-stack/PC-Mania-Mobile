import React, { useEffect, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { ChevronRight, Clock, Target, Wrench } from 'lucide-react-native';
import { useApi } from '../session';
import { useLoad } from '../useLoad';
import { useLayout } from '../useLayout';
import type { BuildGroup, BuildRow } from '../api/types';
import { Card, EmptyState, ErrorBanner, FadeIn, SegmentedTabs, SkeletonList, StatusBadge } from '../components/ui';
import { ago, lek } from '../format';
import { colors, font, space } from '../theme';

const EMPTY: Record<BuildGroup, { title: string; subtitle: string }> = {
  new: { title: 'Asnjë kërkesë e re', subtitle: 'Kërkesat për PC me porosi nga faqja shfaqen këtu.' },
  active: { title: 'Asnjë ofertë në pritje', subtitle: 'Kërkesat me ofertë të dërguar ose të pranuar shfaqen këtu.' },
  done: { title: 'Ende pa kërkesa të mbyllura', subtitle: 'Kërkesat e refuzuara dhe të mbyllura ruhen këtu.' },
};

export default function BuildsScreen() {
  const api = useApi();
  const nav = useNavigation<any>();
  const route = useRoute<any>();
  const [group, setGroup] = useState<BuildGroup>(route.params?.group ?? 'new');
  const { gutter, listColumns, content } = useLayout();

  useEffect(() => {
    if (route.params?.group) setGroup(route.params.group);
  }, [route.params?.group]);

  const counts = useLoad(() => api.buildCounts(), [api]);
  const list = useLoad(() => api.builds(group), [api, group]);

  const refresh = () => { counts.reload(); list.refresh(); };

  return (
    <View style={styles.root}>
      <View style={[styles.tabs, { paddingHorizontal: gutter }, content]}>
        <SegmentedTabs<BuildGroup>
          value={group}
          onChange={setGroup}
          tabs={[
            { key: 'new', label: 'Të reja', count: counts.data?.new },
            { key: 'active', label: 'Me ofertë', count: counts.data?.active },
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
          keyExtractor={(b) => String(b.id)}
          numColumns={listColumns}
          columnWrapperStyle={listColumns > 1 ? { gap: space.md } : undefined}
          contentContainerStyle={[styles.content, { flexGrow: 1, paddingHorizontal: gutter }, content]}
          ItemSeparatorComponent={() => <View style={{ height: space.md }} />}
          refreshControl={<RefreshControl refreshing={list.refreshing} onRefresh={refresh} tintColor={colors.accent} colors={[colors.accent]} />}
          ListEmptyComponent={<EmptyState icon={Wrench} {...EMPTY[group]} />}
          renderItem={({ item, index }) => (
            <FadeIn delay={Math.min(index, 8) * 45} style={listColumns > 1 ? { flex: 1 } : undefined}>
              <BuildCard build={item} onPress={() => nav.navigate('BuildDetail', { id: item.id, title: item.customerName })} />
            </FadeIn>
          )}
        />
      )}
    </View>
  );
}

function BuildCard({ build: b, onPress }: { build: BuildRow; onPress: () => void }) {
  return (
    <Card onPress={onPress} style={b.status === 'NEW' ? styles.newCard : undefined}>
      <View style={styles.top}>
        <Text style={[font.title, { flex: 1 }]} numberOfLines={1}>{b.customerName}</Text>
        <StatusBadge status={b.status} label={b.statusLabel} size="sm" />
      </View>
      <View style={styles.useCase}>
        <Target size={13} color={colors.textFaint} />
        <Text style={font.small} numberOfLines={1}>{b.useCase}</Text>
      </View>
      {b.notesPreview ? <Text style={[font.small, { marginTop: 6 }]} numberOfLines={2}>{b.notesPreview}</Text> : null}
      <View style={styles.bottom}>
        <View style={styles.meta}>
          <Clock size={13} color={colors.textFaint} />
          <Text style={font.small}>{ago(b.createdAt)}</Text>
        </View>
        <View style={styles.meta}>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={[styles.budget, font.money]}>{lek(b.budgetLek)}</Text>
            <Text style={font.tiny}>{b.quotedTotalLek == null ? 'buxheti' : `ofertë ${lek(b.quotedTotalLek)}`}</Text>
          </View>
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
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: space.sm },
  useCase: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  bottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 12 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  budget: { fontSize: 17, fontWeight: '800', color: colors.text },
});
