import React, { useEffect, useRef, useState } from 'react';
import { Platform, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import Constants from 'expo-constants';
import { Bell, BellOff, CircleAlert, CircleCheck, LogOut, RefreshCw, Send, Server, User } from 'lucide-react-native';
import { useApi, useSession } from '../session';
import { KEYS, storage } from '../storage';
import {
  checkForNewOrders, disableBackgroundChecks, notificationStatus, sendTestNotification, setupNotifications,
  type NotificationStatus,
} from '../notifications';
import { Button, Card, FadeIn, Row, SectionTitle } from '../components/ui';
import { useToast } from '../components/toast';
import { colors, font, radius, space } from '../theme';
import { useLayout } from '../useLayout';

export default function SettingsScreen() {
  const api = useApi();
  const { session, signOut, invalidate, builtIn } = useSession();
  const toast = useToast();
  const [notify, setNotify] = useState(true);
  const [status, setStatus] = useState<NotificationStatus | null>(null);
  const [background, setBackground] = useState<boolean | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [confirmingExit, setConfirmingExit] = useState(false);
  const exitTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { gutter, narrowContent } = useLayout();

  useEffect(() => {
    storage.get(KEYS.notifications).then((v) => setNotify(v !== 'off')).catch(() => {});
    notificationStatus().then(setStatus).catch(() => setStatus('error'));
    return () => { if (exitTimer.current) clearTimeout(exitTimer.current); };
  }, []);

  const toggleNotify = async (on: boolean) => {
    setNotify(on);
    try {
      await storage.set(KEYS.notifications, on ? 'on' : 'off');
    } catch {
      // The stored preference is best-effort; what follows is what actually matters.
    }
    if (!on) {
      await disableBackgroundChecks();
      setBackground(false);
      return;
    }
    const result = await setupNotifications();
    setStatus(result.status);
    setBackground(result.background);
    if (result.status === 'denied') {
      toast.show('Lejoni njoftimet te cilësimet e telefonit', 'error');
    } else if (result.status === 'error') {
      toast.show(result.error ?? 'Njoftimet nuk u aktivizuan.', 'error');
    } else if (result.status === 'granted' && !result.background) {
      toast.show('Njoftimet u aktivizuan, por kontrolli në sfond nuk është i disponueshëm', 'info');
    }
  };

  const checkNow = async () => {
    setBusy('check');
    try {
      const { newCount, pendingCount } = await checkForNewOrders(api);
      invalidate();
      toast.show(
        newCount > 0 ? 'Porosi e re!' : pendingCount > 0
          ? `${pendingCount} ${pendingCount === 1 ? 'porosi pret' : 'porosi presin'} konfirmim`
          : 'Asnjë porosi e re',
        'info',
      );
    } catch (e) {
      toast.show(e instanceof Error ? e.message : 'Kontrolli dështoi.', 'error');
    } finally {
      setBusy(null);
    }
  };

  const testNotification = async () => {
    setBusy('test');
    try {
      await sendTestNotification();
      toast.show('Njoftimi u dërgua — shikoni sipër');
    } catch (e) {
      toast.show(e instanceof Error ? e.message : 'Njoftimi nuk u dërgua.', 'error');
    } finally {
      setBusy(null);
    }
  };

  /** Two taps instead of a system dialog, so signing out cannot depend on Alert being available. */
  const logout = async () => {
    if (!confirmingExit) {
      setConfirmingExit(true);
      exitTimer.current = setTimeout(() => setConfirmingExit(false), 5000);
      return;
    }
    if (exitTimer.current) clearTimeout(exitTimer.current);
    setConfirmingExit(false);
    setBusy('logout');
    try {
      await disableBackgroundChecks();
      await signOut();
    } catch (e) {
      toast.show(e instanceof Error ? e.message : 'Dalja dështoi.', 'error');
    } finally {
      setBusy(null);
    }
  };

  const statusLine: Record<NotificationStatus, { text: string; tone: 'ok' | 'warn' }> = {
    granted: { text: background === false ? 'Të lejuara (vetëm kur aplikacioni është hapur)' : 'Të lejuara', tone: 'ok' },
    denied: { text: 'Të bllokuara — lejojini te Cilësimet e telefonit › Aplikacionet › PCMania Admin', tone: 'warn' },
    unsupported: { text: 'Nuk mbështeten në shfletues', tone: 'warn' },
    error: { text: 'Gabim gjatë kontrollit të lejeve', tone: 'warn' },
  };
  const line = status ? statusLine[status] : null;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={[{ padding: gutter, paddingBottom: 40 }, narrowContent]}>
      <FadeIn>
        <SectionTitle>Llogaria</SectionTitle>
        <Card>
          <View style={styles.line}><User size={18} color={colors.textMuted} />
            <Text style={font.body}>{builtIn ? 'Hyrje automatike (çelës i aplikacionit)' : session?.username}</Text>
          </View>
          <View style={styles.line}><Server size={18} color={colors.textMuted} />
            <Text style={[font.body, { flex: 1 }]} numberOfLines={1}>{session?.server === 'demo' ? 'Demo (pa server)' : session?.server}</Text>
          </View>
        </Card>
      </FadeIn>

      <FadeIn delay={60}>
        <SectionTitle>Njoftimet</SectionTitle>
        <Card>
          <View style={[styles.line, { justifyContent: 'space-between' }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
              {notify ? <Bell size={18} color={colors.textMuted} /> : <BellOff size={18} color={colors.textMuted} />}
              <View style={{ flex: 1 }}>
                <Text style={font.body}>Njoftim për porosi të reja</Text>
                <Text style={font.small}>Kontrollon çdo 30 sek. kur aplikacioni është hapur, rreth çdo 35 min kur është mbyllur.</Text>
              </View>
            </View>
            <Switch value={notify} onValueChange={toggleNotify} trackColor={{ true: colors.accent, false: '#cbd5e1' }} thumbColor={colors.white} />
          </View>

          {line && (
            <View style={[styles.status, line.tone === 'ok' ? styles.statusOk : styles.statusWarn]}>
              {line.tone === 'ok' ? <CircleCheck size={16} color={colors.success} /> : <CircleAlert size={16} color={colors.accentDark} />}
              <Text style={[font.small, { flex: 1, color: line.tone === 'ok' ? colors.success : colors.accentDark }]}>{line.text}</Text>
            </View>
          )}

          <View style={{ flexDirection: 'row', gap: space.sm, marginTop: space.md }}>
            <Button title="Kontrollo tani" icon={RefreshCw} variant="secondary" compact loading={busy === 'check'}
                    disabled={busy != null && busy !== 'check'} onPress={checkNow} style={{ flex: 1 }} />
            {Platform.OS !== 'web' && (
              <Button title="Provo njoftimin" icon={Send} variant="secondary" compact loading={busy === 'test'}
                      disabled={busy != null && busy !== 'test'} onPress={testNotification} style={{ flex: 1 }} />
            )}
          </View>
        </Card>
      </FadeIn>

      <FadeIn delay={120}>
        <SectionTitle>Rreth aplikacionit</SectionTitle>
        <Card>
          <Row label="Versioni" value={Constants.expoConfig?.version ?? '1.0.0'} />
          <Text style={[font.small, { marginTop: 6 }]}>
            Fotot dhe raportet e plota menaxhohen nga paneli web (/admin).
          </Text>
        </Card>
      </FadeIn>

      {/* A build with the key built in has no sign-in screen to go back to, so there is nothing to sign out of. */}
      {!builtIn && <FadeIn delay={160}>
        <Button title={confirmingExit ? 'Shtypni sërish për të dalë' : 'Dil'} icon={LogOut}
                variant="danger" loading={busy === 'logout'} onPress={logout} style={{ marginTop: space.xl }} />
        {confirmingExit && (
          <Text style={[font.small, { textAlign: 'center', marginTop: space.sm }]}>
            Njoftimet do të ndalen në këtë telefon.
          </Text>
        )}
      </FadeIn>}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  line: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 },
  status: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: space.sm, borderRadius: radius.sm, marginTop: space.sm },
  statusOk: { backgroundColor: colors.successSoft },
  statusWarn: { backgroundColor: colors.accentSoft },
});
