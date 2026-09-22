import React, { useEffect, useRef, useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { ExternalLink, Minus, Plus, Save, Trash2 } from 'lucide-react-native';
import { useApi, useSession } from '../session';
import { useLoad } from '../useLoad';
import { useLayout } from '../useLayout';
import { Button, Card, ErrorBanner, FadeIn, haptic, PressableScale, Row, SectionTitle, Skeleton, StatusBadge } from '../components/ui';
import { useToast } from '../components/toast';
import { lek, pct } from '../format';
import { colors, font, radius, space, statusColors } from '../theme';
import { ProductThumb } from './InventoryScreen';

export default function ProductDetailScreen() {
  const api = useApi();
  const nav = useNavigation<any>();
  const { invalidate } = useSession();
  const toast = useToast();
  const { id } = useRoute<any>().params as { id: number };
  const { gutter, narrowContent } = useLayout();
  const { data: p, setData, error, loading, refresh } = useLoad(() => api.product(id), [api, id]);
  const statuses = useLoad(() => api.productStatuses(), [api]);
  const conditions = useLoad(() => api.conditions(), [api]);

  const [title, setTitle] = useState('');
  const [quantity, setQuantity] = useState(0);
  const [price, setPrice] = useState('');
  const [cost, setCost] = useState('');
  const [status, setStatus] = useState('');
  const [condition, setCondition] = useState('');
  const [blurb, setBlurb] = useState('');
  const [saving, setSaving] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const deleteTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!p) return;
    setTitle(p.title);
    setQuantity(p.quantity);
    setPrice(String(p.priceLek));
    setCost(String(p.costLek));
    setStatus(p.status);
    setCondition(p.conditionValue ?? '');
    setBlurb(p.shortDescription ?? '');
  }, [p]);

  useEffect(() => () => { if (deleteTimer.current) clearTimeout(deleteTimer.current); }, []);

  if (loading && !p) {
    return (
      <View style={styles.pad}>
        <Card><Skeleton width={96} height={96} /><Skeleton width="80%" height={20} style={{ marginTop: 12 }} /></Card>
      </View>
    );
  }
  if (!p) return <View style={styles.pad}><ErrorBanner message={error ?? 'Produkti nuk u gjet.'} onRetry={refresh} /></View>;

  const priceNum = Number(price.replace(/\D/g, ''));
  const costNum = Number(cost.replace(/\D/g, ''));
  const dirty = title.trim() !== p.title || quantity !== p.quantity || priceNum !== p.priceLek || costNum !== p.costLek
    || status !== p.status || condition !== (p.conditionValue ?? '') || blurb !== (p.shortDescription ?? '');
  const margin = priceNum > 0 ? ((priceNum - costNum) / priceNum) * 100 : null;

  const save = async () => {
    if (title.trim().length < 3) {
      toast.show('Titulli është shumë i shkurtër.', 'error');
      return;
    }
    setSaving(true);
    try {
      const updated = await api.updateProduct(id, {
        ...(title.trim() !== p.title ? { title: title.trim() } : {}),
        ...(quantity !== p.quantity ? { quantity } : {}),
        ...(priceNum !== p.priceLek ? { priceLek: priceNum } : {}),
        ...(costNum !== p.costLek ? { costLek: costNum } : {}),
        ...(status !== p.status ? { status } : {}),
        ...(condition && condition !== p.conditionValue ? { condition } : {}),
        ...(blurb !== (p.shortDescription ?? '') ? { shortDescription: blurb } : {}),
      });
      setData(updated);
      haptic('success');
      toast.show('Produkti u përditësua');
      invalidate();
    } catch (e) {
      haptic('error');
      toast.show(e instanceof Error ? e.message : 'Ruajtja dështoi.', 'error');
    } finally {
      setSaving(false);
    }
  };

  /** Two taps rather than a system dialog, so deleting behaves the same on every device. */
  const remove = async () => {
    if (!confirmingDelete) {
      setConfirmingDelete(true);
      deleteTimer.current = setTimeout(() => setConfirmingDelete(false), 5000);
      return;
    }
    if (deleteTimer.current) clearTimeout(deleteTimer.current);
    setConfirmingDelete(false);
    setDeleting(true);
    try {
      await api.deleteProduct(id);
      haptic('success');
      toast.show('Produkti u fshi');
      invalidate();
      nav.goBack();
    } catch (e) {
      haptic('error');
      toast.show(e instanceof Error ? e.message : 'Fshirja dështoi.', 'error');
    } finally {
      setDeleting(false);
    }
  };

  const step = (delta: number) => {
    haptic('light');
    setQuantity((q) => Math.max(0, q + delta));
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={[styles.pad, { paddingBottom: 110, paddingHorizontal: gutter }, narrowContent]} keyboardShouldPersistTaps="handled">
        <FadeIn>
          <Card style={{ flexDirection: 'row', gap: space.md }}>
            <ProductThumb uri={p.thumbUrl} size={88} />
            <View style={{ flex: 1 }}>
              <Text style={font.title}>{p.title}</Text>
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 8, alignItems: 'center' }}>
                <StatusBadge status={p.status} label={p.statusLabel} size="sm" />
                <Text style={font.small}>{p.condition}</Text>
              </View>
              <Pressable onPress={() => Linking.openURL(p.publicUrl)} style={styles.link}>
                <ExternalLink size={14} color={colors.accentDark} />
                <Text style={{ color: colors.accentDark, fontWeight: '600' }}>Shiko në faqe</Text>
              </Pressable>
            </View>
          </Card>
        </FadeIn>

        <FadeIn delay={40}>
          <SectionTitle>Titulli</SectionTitle>
          <Card>
            <TextInput value={title} onChangeText={setTitle} style={styles.titleInput} multiline
                       placeholder="Emri i produktit" placeholderTextColor={colors.textFaint} />
            <Text style={[font.small, { marginTop: 4 }]}>
              Adresa e faqes nuk ndryshon, që linket e dërguara më parë të mbeten të vlefshme.
            </Text>
          </Card>
        </FadeIn>

        <FadeIn delay={60}>
          <SectionTitle>Sasia në stok</SectionTitle>
          <Card style={styles.stepper}>
            <PressableScale onPress={() => step(-1)} style={styles.stepBtn} disabled={quantity === 0} accessibilityLabel="Zbrit sasinë">
              <Minus size={22} color={colors.text} />
            </PressableScale>
            <Text style={[styles.qty, font.money]}>{quantity}</Text>
            <PressableScale onPress={() => step(1)} style={styles.stepBtn} accessibilityLabel="Shto sasinë">
              <Plus size={22} color={colors.text} />
            </PressableScale>
          </Card>
        </FadeIn>

        <FadeIn delay={100}>
          <SectionTitle>Çmimi dhe kostoja</SectionTitle>
          <Card>
            <Text style={font.tiny}>Shitja (Lekë)</Text>
            <View style={styles.priceInput}>
              <TextInput value={price} onChangeText={(t) => setPrice(t.replace(/\D/g, ''))} keyboardType="number-pad"
                         style={styles.priceText} selectTextOnFocus />
            </View>
            <Text style={[font.tiny, { marginTop: space.sm }]}>Kostoja (Lekë)</Text>
            <View style={styles.priceInput}>
              <TextInput value={cost} onChangeText={(t) => setCost(t.replace(/\D/g, ''))} keyboardType="number-pad"
                         style={[styles.priceText, { fontSize: 22 }]} selectTextOnFocus />
            </View>
            <Row label="Fitimi për copë" value={
              <Text style={[font.body, font.money, { fontWeight: '700', color: priceNum - costNum < 0 ? colors.danger : colors.success }]}>
                {lek(priceNum - costNum)} ({pct(margin)})
              </Text>
            } />
          </Card>
        </FadeIn>

        <FadeIn delay={120}>
          <SectionTitle>Gjendja</SectionTitle>
          <View style={styles.chips}>
            {(conditions.data ?? []).map((c) => {
              const active = c.value === condition;
              return (
                <PressableScale key={c.value} onPress={() => { haptic('light'); setCondition(c.value); }}
                                style={[styles.chip, active && { backgroundColor: colors.accentSoft, borderColor: colors.accentDark }]}>
                  <Text style={[styles.chipText, active && { color: colors.accentDark }]}>{c.label}</Text>
                </PressableScale>
              );
            })}
          </View>
        </FadeIn>

        <FadeIn delay={140}>
          <SectionTitle>Statusi</SectionTitle>
          <View style={styles.chips}>
            {(statuses.data ?? []).map((s) => {
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
          <Text style={[font.small, { marginTop: space.sm }]}>
            "Aktiv" e shfaq në faqe. "I fshehur" e heq nga faqja pa e fshirë. Për shitjet jashtë faqes përdorni panelin web.
          </Text>
        </FadeIn>

        <FadeIn delay={160}>
          <SectionTitle>Përshkrim i shkurtër</SectionTitle>
          <Card>
            <TextInput value={blurb} onChangeText={setBlurb} multiline style={styles.notes}
                       placeholder="Një rresht që shfaqet nën titull në faqe" placeholderTextColor={colors.textFaint} />
          </Card>
        </FadeIn>

        <FadeIn delay={180}>
          <SectionTitle>Statistika</SectionTitle>
          <Card>
            <Row label="Ditë në listë" value={p.daysListed == null ? '—' : String(p.daysListed)} />
            <Row label="Shikime" value={String(p.viewCount)} />
          </Card>
        </FadeIn>

        <FadeIn delay={220}>
          <Button title={confirmingDelete ? 'Shtypni sërish për ta fshirë' : 'Fshi produktin'} icon={Trash2}
                  variant="danger" loading={deleting} onPress={remove} style={{ marginTop: space.xl }} />
          <Text style={[font.small, { textAlign: 'center', marginTop: space.sm }]}>
            Produktet me porosi të lidhura nuk fshihen – vendosini "I fshehur".
          </Text>
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

const styles = StyleSheet.create({
  pad: { padding: space.lg },
  link: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 10 },
  titleInput: {
    fontSize: 16, fontWeight: '600', color: colors.text, padding: 0, minHeight: 44, textAlignVertical: 'top',
    outlineStyle: 'none',
  } as object,
  stepper: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: space.md },
  stepBtn: { width: 56, height: 56, borderRadius: radius.md, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' },
  qty: { fontSize: 36, fontWeight: '900', color: colors.text },
  priceInput: { borderBottomWidth: 1, borderBottomColor: colors.border, paddingBottom: space.xs, marginBottom: space.sm },
  priceText: { flex: 1, fontSize: 28, fontWeight: '800', color: colors.text, paddingVertical: 4, outlineStyle: 'none' } as object,
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  chip: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 999, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.white },
  chipText: { fontWeight: '600', color: colors.textMuted },
  notes: {
    minHeight: 70, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: space.md,
    fontSize: 15, color: colors.text, textAlignVertical: 'top', backgroundColor: '#f8fafc',
  },
  saveBar: {
    position: 'absolute', left: 0, right: 0, bottom: 0, padding: space.lg, paddingBottom: space.lg + 8,
    backgroundColor: 'rgba(244,245,247,.96)', borderTopWidth: 1, borderTopColor: colors.border,
  },
});
