import React, { useEffect, useState } from 'react';
import { Linking, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRoute } from '@react-navigation/native';
import { MessageCircle, Phone, Save } from 'lucide-react-native';
import { useApi, useSession } from '../session';
import { useLoad } from '../useLoad';
import { useLayout } from '../useLayout';
import { Button, Card, ErrorBanner, FadeIn, haptic, PressableScale, Row, SectionTitle, Skeleton, StatusBadge } from '../components/ui';
import { useToast } from '../components/toast';
import { dateTime, lek } from '../format';
import { colors, font, radius, space, statusColors } from '../theme';

export default function BuildDetailScreen() {
  const api = useApi();
  const { invalidate } = useSession();
  const toast = useToast();
  const { id } = useRoute<any>().params as { id: number };
  const { gutter, narrowContent } = useLayout();
  const { data: b, setData, error, loading, refreshing, refresh } = useLoad(() => api.build(id), [api, id]);

  const [quote, setQuote] = useState('');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!b) return;
    setQuote(b.quotedTotalLek == null ? '' : String(b.quotedTotalLek));
    setNotes(b.adminNotes ?? '');
    setStatus(b.status);
  }, [b?.id, b?.status, b?.quotedTotalLek, b?.adminNotes]);

  if (loading && !b) return <LoadingSkeleton />;
  if (!b) return <View style={styles.pad}><ErrorBanner message={error ?? 'Kërkesa nuk u gjet.'} onRetry={refresh} /></View>;

  const quoteNum = quote === '' ? null : Number(quote.replace(/\D/g, ''));
  const dirty = quoteNum !== b.quotedTotalLek || notes !== (b.adminNotes ?? '') || status !== b.status;
  const phone = b.customerPhone.replace(/\s/g, '');

  const save = async () => {
    setSaving(true);
    try {
      const updated = await api.updateBuild(id, {
        ...(status !== b.status ? { status } : {}),
        ...(quoteNum != null && quoteNum !== b.quotedTotalLek ? { quotedTotalLek: quoteNum } : {}),
        ...(notes !== (b.adminNotes ?? '') ? { adminNotes: notes } : {}),
      });
      setData(updated);
      haptic('success');
      toast.show('Kërkesa u përditësua');
      invalidate();
    } catch (e) {
      haptic('error');
      toast.show(e instanceof Error ? e.message : 'Ruajtja dështoi.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={[styles.pad, { paddingBottom: 110, paddingHorizontal: gutter }, narrowContent]}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.accent} colors={[colors.accent]} />}
      >
        <FadeIn>
          <Card>
            <View style={styles.headRow}>
              <Text style={font.h2}>{b.customerName}</Text>
              <StatusBadge status={b.status} label={b.statusLabel} />
            </View>
            <Text style={[styles.budget, font.money]}>{lek(b.budgetLek)}</Text>
            <Text style={font.small}>Buxheti i kërkuar · {b.useCase}</Text>
            <Text style={[font.small, { marginTop: 4 }]}>Dërguar më {dateTime(b.createdAt)}</Text>
            <View style={styles.contactRow}>
              <Button title="Telefono" icon={Phone} variant="dark" compact style={{ flex: 1 }}
                      onPress={() => Linking.openURL(`tel:${phone}`)} />
              {b.whatsappUrl && (
                <Button title="WhatsApp" icon={MessageCircle} variant="whatsapp" compact style={{ flex: 1 }}
                        onPress={() => Linking.openURL(b.whatsappUrl!)} />
              )}
            </View>
            <Text style={[font.small, { marginTop: space.sm }]}>{b.customerPhone}</Text>
          </Card>
        </FadeIn>

        <FadeIn delay={60}>
          <SectionTitle>Çfarë kërkon klienti</SectionTitle>
          <Card>
            <Text style={[font.body, { lineHeight: 22 }]}>{b.notes?.trim() || 'Klienti nuk la shënime.'}</Text>
          </Card>
        </FadeIn>

        <FadeIn delay={100}>
          <SectionTitle>Oferta</SectionTitle>
          <Card>
            <View style={styles.quoteInput}>
              <TextInput value={quote} onChangeText={(t) => setQuote(t.replace(/\D/g, ''))} keyboardType="number-pad"
                         placeholder="0" placeholderTextColor={colors.textFaint} style={styles.quoteText} selectTextOnFocus />
              <Text style={font.small}>Lekë</Text>
            </View>
            <Row label="Buxheti i klientit" value={lek(b.budgetLek)} />
            {quoteNum != null && quoteNum > 0 && (
              <Row label="Diferenca" value={
                <Text style={[font.body, font.money, { fontWeight: '700', color: quoteNum > b.budgetLek ? colors.danger : colors.success }]}>
                  {quoteNum > b.budgetLek ? '+' : ''}{lek(quoteNum - b.budgetLek)}
                </Text>
              } />
            )}
            <Text style={[font.small, { marginTop: space.sm }]}>
              Totali i ofertës duhet plotësuar para se ta shënoni "Me ofertë" ose "E pranuar".
            </Text>
          </Card>
        </FadeIn>

        <FadeIn delay={140}>
          <SectionTitle>Statusi</SectionTitle>
          <View style={styles.chips}>
            {b.statuses.map((s) => {
              const active = s.value === status;
              const c = statusColors[s.value];
              return (
                <PressableScale key={s.value} onPress={() => { haptic('light'); setStatus(s.value); }}
                                style={[styles.chip, active && { backgroundColor: c?.bg, borderColor: c?.fg }]}>
                  <Text style={[styles.chipText, active && { color: c?.fg }]}>{s.label}</Text>
                </PressableScale>
              );
            })}
          </View>
        </FadeIn>

        <FadeIn delay={180}>
          <SectionTitle>Shënime të brendshme</SectionTitle>
          <Card>
            <TextInput
              value={notes}
              onChangeText={setNotes}
              placeholder="p.sh. i dërgova ofertën me WhatsApp, pret përgjigje"
              placeholderTextColor={colors.textFaint}
              multiline
              style={styles.notes}
            />
          </Card>
        </FadeIn>
      </ScrollView>

      {dirty && (
        <FadeIn style={styles.saveBar}>
          <View style={narrowContent}><Button title="Ruaj ndryshimet" icon={Save} onPress={save} loading={saving} /></View>
        </FadeIn>
      )}
    </View>
  );
}

function LoadingSkeleton() {
  return (
    <View style={[styles.root, styles.pad]}>
      <Card><Skeleton width="50%" height={20} /><Skeleton width="40%" height={30} style={{ marginTop: 12 }} /><Skeleton width="60%" style={{ marginTop: 10 }} /></Card>
      <Card style={{ marginTop: 24 }}><Skeleton /><Skeleton width="80%" style={{ marginTop: 8 }} /></Card>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  pad: { padding: space.lg, paddingBottom: 40 },
  headRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: space.sm },
  budget: { fontSize: 30, fontWeight: '900', color: colors.text, marginTop: 6, marginBottom: 2 },
  contactRow: { flexDirection: 'row', gap: space.sm, marginTop: space.md },
  quoteInput: {
    flexDirection: 'row', alignItems: 'center', gap: 8, borderBottomWidth: 1, borderBottomColor: colors.border,
    paddingBottom: space.sm, marginBottom: space.sm,
  },
  quoteText: { flex: 1, fontSize: 28, fontWeight: '800', color: colors.text, paddingVertical: 4, outlineStyle: 'none' } as object,
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  chip: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 999, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.white },
  chipText: { fontWeight: '600', color: colors.textMuted },
  notes: {
    minHeight: 90, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: space.md,
    fontSize: 15, color: colors.text, textAlignVertical: 'top', backgroundColor: '#f8fafc',
  },
  saveBar: {
    position: 'absolute', left: 0, right: 0, bottom: 0, padding: space.lg, paddingBottom: space.lg + 8,
    backgroundColor: 'rgba(244,245,247,.96)', borderTopWidth: 1, borderTopColor: colors.border,
  },
});
