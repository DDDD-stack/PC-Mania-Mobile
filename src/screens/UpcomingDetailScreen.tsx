import React, { useEffect, useRef, useState } from 'react';
import { Linking, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Check, MessageCircle, Phone, Save, Trash2, Users } from 'lucide-react-native';
import { useApi, useSession } from '../session';
import { useLoad } from '../useLoad';
import { useLayout } from '../useLayout';
import type { UpcomingStatus } from '../api/types';
import { Button, Card, ErrorBanner, FadeIn, haptic, PressableScale, SectionTitle, Skeleton, StatusBadge } from '../components/ui';
import { useToast } from '../components/toast';
import { ago, lek } from '../format';
import { colors, font, radius, space, statusColors } from '../theme';

const STATUS_HELP: Record<UpcomingStatus, string> = {
  HIDDEN: 'Nuk duket askund në faqe.',
  VISIBLE: 'Shfaqet te "Së shpejti" dhe në kryefaqe. Klientët mund të lënë numrin.',
  ARRIVED: 'Mbetet në faqe me shenjën "Ka ardhur". Telefonojini ata që presin.',
};

export default function UpcomingDetailScreen() {
  const api = useApi();
  const nav = useNavigation<any>();
  const { invalidate } = useSession();
  const toast = useToast();
  const { id } = useRoute<any>().params as { id: number | null };
  const isNew = id == null;
  const { gutter, narrowContent } = useLayout();

  const list = useLoad(() => (isNew ? Promise.resolve([]) : api.upcoming()), [api, id]);
  const u = isNew ? null : (list.data ?? []).find((x) => x.id === id) ?? null;
  const interest = useLoad(() => (isNew ? Promise.resolve([]) : api.upcomingInterest(id)), [api, id]);
  const statuses = useLoad(() => api.upcomingStatuses(), [api]);

  const [title, setTitle] = useState('');
  const [teaser, setTeaser] = useState('');
  const [price, setPrice] = useState('');
  const [when, setWhen] = useState('');
  const [status, setStatus] = useState<UpcomingStatus>('VISIBLE');
  const [saving, setSaving] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const deleteTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!u) return;
    setTitle(u.title);
    setTeaser(u.teaser ?? '');
    setPrice(u.expectedPriceLek == null ? '' : String(u.expectedPriceLek));
    setWhen(u.expectedLabel ?? '');
    setStatus(u.status);
  }, [u?.id, u?.title, u?.teaser, u?.expectedPriceLek, u?.expectedLabel, u?.status]);

  useEffect(() => () => { if (deleteTimer.current) clearTimeout(deleteTimer.current); }, []);

  if (!isNew && list.loading && !u) {
    return <View style={styles.pad}><Card><Skeleton width="60%" height={22} /><Skeleton width="40%" style={{ marginTop: 10 }} /></Card></View>;
  }
  if (!isNew && !u) {
    return <View style={styles.pad}><ErrorBanner message={list.error ?? 'Artikulli nuk u gjet.'} onRetry={list.refresh} /></View>;
  }

  const priceNum = price === '' ? null : Number(price.replace(/\D/g, ''));
  const dirty = isNew
    ? title.trim().length > 0
    : title.trim() !== u!.title || teaser !== (u!.teaser ?? '') || priceNum !== u!.expectedPriceLek
      || when !== (u!.expectedLabel ?? '') || status !== u!.status;

  const save = async () => {
    if (title.trim().length < 3) {
      toast.show('Shkruani një titull.', 'error');
      return;
    }
    setSaving(true);
    const patch = {
      title: title.trim(),
      teaser,
      expectedLabel: when,
      status,
      ...(priceNum != null ? { expectedPriceLek: priceNum } : {}),
    };
    try {
      if (isNew) {
        const created = await api.createUpcoming(patch);
        haptic('success');
        toast.show('U shtua te "Së shpejti"');
        invalidate();
        nav.replace('UpcomingDetail', { id: created.id, title: created.title });
      } else {
        await api.updateUpcoming(u!.id, patch);
        haptic('success');
        toast.show('Ndryshimet u ruajtën');
        list.reload();
        invalidate();
      }
    } catch (e) {
      haptic('error');
      toast.show(e instanceof Error ? e.message : 'Ruajtja dështoi.', 'error');
    } finally {
      setSaving(false);
    }
  };

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
      await api.deleteUpcoming(u!.id);
      haptic('success');
      toast.show('U fshi');
      invalidate();
      nav.goBack();
    } catch (e) {
      haptic('error');
      toast.show(e instanceof Error ? e.message : 'Fshirja dështoi.', 'error');
    } finally {
      setDeleting(false);
    }
  };

  const markNotified = async (interestId: number) => {
    try {
      await api.markInterestNotified(interestId);
      haptic('success');
      interest.reload();
    } catch (e) {
      toast.show(e instanceof Error ? e.message : 'Nuk u ruajt.', 'error');
    }
  };

  const waiting = (interest.data ?? []).filter((i) => !i.notified).length;

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={[styles.pad, { paddingBottom: 110, paddingHorizontal: gutter }, narrowContent]}
                  keyboardShouldPersistTaps="handled">
        {!isNew && u && (
          <FadeIn>
            <Card>
              <View style={styles.headRow}>
                <Text style={[font.h2, { flex: 1 }]} numberOfLines={2}>{u.title}</Text>
                <StatusBadge status={u.status} label={u.statusLabel} />
              </View>
              <View style={[styles.waiting, waiting > 0 && { backgroundColor: colors.accentSoft }]}>
                <Users size={16} color={waiting > 0 ? colors.accentDark : colors.textMuted} />
                <Text style={[font.small, waiting > 0 && { color: colors.accentDark, fontWeight: '700' }]}>
                  {waiting === 0 ? 'Askush nuk pret ende' : `${waiting} ${waiting === 1 ? 'person pret' : 'persona presin'} këtë`}
                </Text>
              </View>
            </Card>
          </FadeIn>
        )}

        <FadeIn delay={40}>
          <SectionTitle>Artikulli</SectionTitle>
          <Card>
            <Text style={font.tiny}>Titulli</Text>
            <TextInput value={title} onChangeText={setTitle} style={styles.titleInput} multiline
                       placeholder="p.sh. RTX 5070 Ti – 2 copë" placeholderTextColor={colors.textFaint} />
            <View style={styles.divider} />
            <Text style={font.tiny}>Përshkrim i shkurtër</Text>
            <TextInput value={teaser} onChangeText={setTeaser} multiline style={styles.notes}
                       placeholder="Një rresht që e bën interesant" placeholderTextColor={colors.textFaint} />
          </Card>
        </FadeIn>

        <FadeIn delay={80}>
          <SectionTitle>Çmimi dhe afati</SectionTitle>
          <Card>
            <Text style={font.tiny}>Çmimi i pritshëm (Lekë)</Text>
            <View style={styles.priceInput}>
              <TextInput value={price} onChangeText={(t) => setPrice(t.replace(/\D/g, ''))} keyboardType="number-pad"
                         style={styles.priceText} placeholder="0" placeholderTextColor={colors.textFaint} selectTextOnFocus />
            </View>
            <Text style={font.tiny}>Kur pritet</Text>
            <TextInput value={when} onChangeText={setWhen} style={styles.whenInput}
                       placeholder="p.sh. Brenda javës" placeholderTextColor={colors.textFaint} />
            <Text style={[font.small, { marginTop: 6 }]}>
              Mbajeni të përafërt – dërgesat vonojnë dhe klientët e mbajnë mend datën.
            </Text>
          </Card>
        </FadeIn>

        <FadeIn delay={120}>
          <SectionTitle>Statusi</SectionTitle>
          <View style={styles.chips}>
            {(statuses.data ?? []).map((s) => {
              const active = s.value === status;
              const c = statusColors[s.value];
              return (
                <PressableScale key={s.value} onPress={() => { haptic('light'); setStatus(s.value as UpcomingStatus); }}
                                style={[styles.chip, active && { backgroundColor: c?.bg ?? colors.accentSoft, borderColor: c?.fg ?? colors.accentDark }]}>
                  <Text style={[styles.chipText, active && { color: c?.fg ?? colors.accentDark }]}>{s.label}</Text>
                </PressableScale>
              );
            })}
          </View>
          <Text style={[font.small, { marginTop: space.sm }]}>{STATUS_HELP[status]}</Text>
        </FadeIn>

        {!isNew && (
          <FadeIn delay={160}>
            <SectionTitle>Kush pret</SectionTitle>
            {(interest.data ?? []).length === 0 ? (
              <Card><Text style={font.small}>Askush ende. Numrat shfaqen këtu kur dikush shtyp "Më njofto" në faqe.</Text></Card>
            ) : (
              <Card>
                {(interest.data ?? []).map((i, idx) => (
                  <View key={i.id} style={[styles.person, idx > 0 && { borderTopWidth: 1, borderTopColor: colors.border }]}>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={font.title} numberOfLines={1}>{i.customerName}</Text>
                      <Text style={font.small}>{i.customerPhone} · {ago(i.createdAt)}</Text>
                    </View>
                    <PressableScale onPress={() => Linking.openURL(`tel:${i.customerPhone.replace(/\s/g, '')}`)}
                                    style={styles.iconBtn} accessibilityLabel="Telefono">
                      <Phone size={18} color={colors.navy} />
                    </PressableScale>
                    {i.whatsappUrl ? (
                      <PressableScale onPress={() => Linking.openURL(i.whatsappUrl!)}
                                      style={[styles.iconBtn, { backgroundColor: '#dcfce7' }]} accessibilityLabel="WhatsApp">
                        <MessageCircle size={18} color={colors.whatsapp} />
                      </PressableScale>
                    ) : null}
                    <PressableScale onPress={() => markNotified(i.id)} disabled={i.notified}
                                    style={[styles.iconBtn, i.notified && { backgroundColor: colors.successSoft }]}
                                    accessibilityLabel="Shëno si të njoftuar">
                      <Check size={18} color={i.notified ? colors.success : colors.textMuted} />
                    </PressableScale>
                  </View>
                ))}
              </Card>
            )}
          </FadeIn>
        )}

        {!isNew && (
          <FadeIn delay={200}>
            <Button title={confirmingDelete ? 'Shtypni sërish për ta fshirë' : 'Fshi'} icon={Trash2}
                    variant="danger" loading={deleting} onPress={remove} style={{ marginTop: space.xl }} />
            <Text style={[font.small, { textAlign: 'center', marginTop: space.sm }]}>
              Fshihet bashkë me listën e personave në pritje.
            </Text>
          </FadeIn>
        )}
      </ScrollView>

      {dirty && (
        <FadeIn style={styles.saveBar}>
          <View style={narrowContent}>
            <Button title={isNew ? 'Shto' : 'Ruaj ndryshimet'} icon={Save} onPress={save} loading={saving} />
          </View>
        </FadeIn>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  pad: { padding: space.lg, paddingBottom: 40 },
  headRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: space.sm },
  waiting: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: space.md, padding: space.sm, borderRadius: radius.sm, backgroundColor: '#f1f5f9' },
  titleInput: {
    fontSize: 16, fontWeight: '600', color: colors.text, padding: 0, minHeight: 44, marginTop: 4,
    textAlignVertical: 'top', outlineStyle: 'none',
  } as object,
  divider: { height: 1, backgroundColor: colors.border, marginVertical: space.md },
  notes: {
    minHeight: 64, marginTop: 4, fontSize: 15, color: colors.text, textAlignVertical: 'top',
    padding: 0, outlineStyle: 'none',
  } as object,
  priceInput: { borderBottomWidth: 1, borderBottomColor: colors.border, paddingBottom: space.xs, marginBottom: space.md },
  priceText: { flex: 1, fontSize: 26, fontWeight: '800', color: colors.text, paddingVertical: 4, outlineStyle: 'none' } as object,
  whenInput: {
    fontSize: 15, color: colors.text, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: colors.border,
    outlineStyle: 'none',
  } as object,
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  chip: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 999, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.white },
  chipText: { fontWeight: '600', color: colors.textMuted },
  person: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingVertical: space.sm },
  iconBtn: { width: 38, height: 38, borderRadius: radius.sm, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' },
  saveBar: {
    position: 'absolute', left: 0, right: 0, bottom: 0, padding: space.lg, paddingBottom: space.lg + 8,
    backgroundColor: 'rgba(244,245,247,.96)', borderTopWidth: 1, borderTopColor: colors.border,
  },
});
