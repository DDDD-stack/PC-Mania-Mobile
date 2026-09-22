import React, { useEffect, useState } from 'react';
import { Linking, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRoute } from '@react-navigation/native';
import { CircleCheck, CircleX, MessageCircle, Phone, Save, Truck } from 'lucide-react-native';
import { useApi, useSession } from '../session';
import { useLoad } from '../useLoad';
import { useLayout } from '../useLayout';
import type { OrderDetail } from '../api/types';
import {
  Button, Card, ErrorBanner, FadeIn, haptic, Row, SectionTitle, Skeleton, StatusBadge,
} from '../components/ui';
import { confirm } from '../components/confirm';
import { useToast } from '../components/toast';
import { dateTime, lek } from '../format';
import { colors, font, radius, space } from '../theme';

const ACTION_ICONS = { CONFIRMED: CircleCheck, SHIPPED: Truck, DELIVERED: CircleCheck, CANCELLED: CircleX } as const;
const ACTION_TEXT: Record<string, string> = {
  CONFIRMED: 'Konfirmo porosinë',
  SHIPPED: 'Shëno si të dërguar',
  DELIVERED: 'Shëno si të dorëzuar',
  CANCELLED: 'Anulo porosinë',
};

export default function OrderDetailScreen() {
  const api = useApi();
  const { invalidate } = useSession();
  const toast = useToast();
  const { id } = useRoute<any>().params as { id: number };
  const { gutter, narrowContent } = useLayout();
  const { data: o, setData, error, loading, refreshing, refresh } = useLoad(() => api.order(id), [api, id]);
  const [busy, setBusy] = useState<string | null>(null);
  const [notes, setNotes] = useState('');

  useEffect(() => { if (o) setNotes(o.adminNotes ?? ''); }, [o?.id, o?.adminNotes]);

  const changeStatus = async (status: string, label: string) => {
    if (status === 'CANCELLED' && !(await confirm('Anulo porosinë?', 'Stoku do të rikthehet dhe produkti bëhet sërish aktiv.', 'Anulo porosinë', true))) return;
    if (status === 'DELIVERED' && !(await confirm('Shëno si të dorëzuar?', 'Shitja do të hyjë në raportet e fitimit.', 'Po, u dorëzua'))) return;
    setBusy(status);
    try {
      const updated = await api.changeOrderStatus(id, status);
      setData(updated);
      haptic('success');
      toast.show(`Statusi: ${label}`);
      invalidate();
    } catch (e) {
      haptic('error');
      toast.show(e instanceof Error ? e.message : 'Ndryshimi dështoi.', 'error');
    } finally {
      setBusy(null);
    }
  };

  const saveNotes = async () => {
    setBusy('notes');
    try {
      setData(await api.saveOrderNotes(id, notes));
      toast.show('Shënimet u ruajtën');
    } catch (e) {
      toast.show(e instanceof Error ? e.message : 'Ruajtja dështoi.', 'error');
    } finally {
      setBusy(null);
    }
  };

  if (loading && !o) return <LoadingSkeleton />;
  if (!o) return <View style={styles.pad}><ErrorBanner message={error ?? 'Porosia nuk u gjet.'} onRetry={refresh} /></View>;

  const phone = o.customerPhone.replace(/\s/g, '');

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={[styles.pad, { paddingHorizontal: gutter }, narrowContent]}
      keyboardShouldPersistTaps="handled"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.accent} colors={[colors.accent]} />}
    >
      <FadeIn>
        <Card>
          <View style={styles.headRow}>
            <Text style={styles.number}>{o.orderNumber}</Text>
            <StatusBadge status={o.status} label={o.statusLabel} />
          </View>
          <Text style={[styles.total, font.money]}>{lek(o.totalLek)}</Text>
          <Text style={font.small}>Porositur më {dateTime(o.createdAt)}{o.deliveredAt ? ` · dorëzuar ${dateTime(o.deliveredAt)}` : ''}</Text>
        </Card>
      </FadeIn>

      {o.transitions.length > 0 && (
        <FadeIn delay={60}>
          <SectionTitle>Veprime</SectionTitle>
          <View style={{ gap: space.sm }}>
            {o.transitions.map((t) => (
              <Button
                key={t.value}
                title={ACTION_TEXT[t.value] ?? t.label}
                icon={ACTION_ICONS[t.value as keyof typeof ACTION_ICONS]}
                variant={t.value === 'CANCELLED' ? 'danger' : t === o.transitions[0] ? 'primary' : 'secondary'}
                loading={busy === t.value}
                disabled={busy != null && busy !== t.value}
                onPress={() => changeStatus(t.value, t.label)}
              />
            ))}
          </View>
        </FadeIn>
      )}

      <FadeIn delay={100}>
        <SectionTitle>Klienti</SectionTitle>
        <Card>
          <Text style={font.h2}>{o.customerName}</Text>
          <Text style={[font.body, { color: colors.textMuted, marginTop: 2 }]}>{o.customerPhone}</Text>
          <View style={styles.contactRow}>
            <Button title="Telefono" icon={Phone} variant="dark" compact style={{ flex: 1 }}
                    onPress={() => Linking.openURL(`tel:${phone}`)} />
            {o.whatsappUrl && (
              <Button title="WhatsApp" icon={MessageCircle} variant="whatsapp" compact style={{ flex: 1 }}
                      onPress={() => Linking.openURL(o.whatsappUrl!)} />
            )}
          </View>
          <View style={styles.divider} />
          <Row label="Qyteti" value={o.city} />
          {o.address ? <Row label="Adresa" value={o.address} /> : null}
          <Row label="Dorëzimi" value={o.delivery} />
          <Row label="Pagesa" value={o.payment} />
          {o.customerEmail ? <Row label="Email" value={o.customerEmail} /> : null}
          {o.customerNotes ? (
            <View style={styles.customerNote}>
              <Text style={font.tiny}>Shënim nga klienti</Text>
              <Text style={[font.body, { marginTop: 4 }]}>{o.customerNotes}</Text>
            </View>
          ) : null}
        </Card>
      </FadeIn>

      <FadeIn delay={140}>
        <SectionTitle>Produktet</SectionTitle>
        <Card>
          {o.items.map((i, idx) => (
            <View key={idx} style={[styles.item, idx > 0 && { borderTopWidth: 1, borderTopColor: colors.border }]}>
              <Text style={[font.title, { flex: 1 }]} numberOfLines={2}>{i.quantity > 1 ? `${i.quantity} × ` : ''}{i.title}</Text>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={[font.title, font.money]}>{lek(i.priceLek * i.quantity)}</Text>
                <Text style={[font.small, font.money]}>kosto {lek(i.costLek * i.quantity)}</Text>
              </View>
            </View>
          ))}
          <View style={styles.divider} />
          <Row label="Nëntotali" value={lek(o.subtotalLek)} />
          <Row label="Transporti" value={o.shippingLek === 0 ? 'Falas' : lek(o.shippingLek)} />
          <Row label="Totali" value={lek(o.totalLek)} strong />
          <View style={styles.profit}>
            <Text style={{ color: colors.success, fontWeight: '700' }}>Fitimi</Text>
            <Text style={[{ color: colors.success, fontWeight: '800', fontSize: 16 }, font.money]}>{lek(o.profitLek)}</Text>
          </View>
        </Card>
      </FadeIn>

      <FadeIn delay={180}>
        <SectionTitle>Shënime të brendshme</SectionTitle>
        <Card>
          <TextInput
            value={notes}
            onChangeText={setNotes}
            placeholder="p.sh. i telefonova, vjen nesër në 18:00"
            placeholderTextColor={colors.textFaint}
            multiline
            style={styles.notes}
          />
          <Button title="Ruaj shënimet" icon={Save} variant="secondary" compact loading={busy === 'notes'}
                  disabled={notes === (o.adminNotes ?? '')} onPress={saveNotes} style={{ marginTop: space.sm }} />
        </Card>
      </FadeIn>
    </ScrollView>
  );
}

function LoadingSkeleton() {
  return (
    <View style={[styles.root, styles.pad]}>
      <Card><Skeleton width="40%" /><Skeleton width="60%" height={30} style={{ marginTop: 12 }} /><Skeleton width="50%" style={{ marginTop: 10 }} /></Card>
      <Skeleton height={50} style={{ marginTop: 24, borderRadius: radius.md }} />
      <Card style={{ marginTop: 24 }}><Skeleton width="55%" height={20} /><Skeleton width="35%" style={{ marginTop: 10 }} /></Card>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  pad: { padding: space.lg, paddingBottom: 40 },
  headRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  number: { fontSize: 15, fontWeight: '700', color: colors.textMuted, fontVariant: ['tabular-nums'] },
  total: { fontSize: 32, fontWeight: '900', color: colors.text, marginTop: 6, marginBottom: 2 },
  contactRow: { flexDirection: 'row', gap: space.sm, marginTop: space.md },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: space.md },
  customerNote: { backgroundColor: colors.accentSoft, borderRadius: radius.sm, padding: space.md, marginTop: space.sm },
  item: { flexDirection: 'row', gap: space.md, paddingVertical: space.sm },
  profit: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: colors.successSoft, borderRadius: radius.sm, padding: space.md, marginTop: space.sm },
  notes: {
    minHeight: 90, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: space.md,
    fontSize: 15, color: colors.text, textAlignVertical: 'top', backgroundColor: '#f8fafc',
  },
});
