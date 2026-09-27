import React, { useEffect, useRef, useState } from 'react';
import {
  Animated, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Gpu, Lock, Server, User } from 'lucide-react-native';
import { useSession } from '../session';
import { KEYS, storage } from '../storage';
import { Button, FadeIn, haptic } from '../components/ui';
import { colors, radius, space } from '../theme';

export default function LoginScreen() {
  const { signIn } = useSession();
  const [server, setServer] = useState('');
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const shake = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    storage.get(KEYS.lastServer).then((s) => s && s !== 'demo' && setServer(s));
  }, []);

  const submit = async (demo = false) => {
    if (!demo && (!server.trim() || !password)) {
      setError('Plotësoni adresën e serverit dhe fjalëkalimin.');
      return runShake();
    }
    setLoading(true);
    setError(null);
    try {
      await (demo ? signIn('demo', 'demo', '') : signIn(server, username, password));
      haptic('success');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Hyrja dështoi.');
      haptic('error');
      runShake();
    } finally {
      setLoading(false);
    }
  };

  const runShake = () => {
    const native = Platform.OS !== 'web';
    Animated.sequence([10, -10, 7, -7, 0].map((toValue) =>
      Animated.timing(shake, { toValue, duration: 55, useNativeDriver: native }))).start();
  };

  return (
    <View style={styles.root}>
      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
            <FadeIn style={styles.brand}>
              <View style={styles.logo}><Gpu size={34} color={colors.accent} strokeWidth={2} /></View>
              <Text style={styles.title}>PC<Text style={{ color: colors.accent }}>Mania</Text></Text>
              <Text style={styles.subtitle}>Porositë dhe inventari në telefon</Text>
            </FadeIn>

            <FadeIn delay={120}>
              <Animated.View style={[styles.card, { transform: [{ translateX: shake }] }]}>
                <Field icon={Server} label="Serveri" value={server} onChangeText={setServer}
                       placeholder="pc-mania.onrender.com ose 192.168.1.10:8070" autoCapitalize="none" keyboardType="url" />
                <Field icon={User} label="Përdoruesi" value={username} onChangeText={setUsername} autoCapitalize="none" />
                <Field icon={Lock} label="Fjalëkalimi" value={password} onChangeText={setPassword} secureTextEntry
                       onSubmitEditing={() => submit()} returnKeyType="go" />
                {error && <Text style={styles.error}>{error}</Text>}
                <Button title="Hyr" onPress={() => submit()} loading={loading} style={{ marginTop: space.sm }} />
              </Animated.View>
            </FadeIn>

            <FadeIn delay={220}>
              <Button title="Provo me të dhëna demo" variant="ghost" onPress={() => submit(true)} disabled={loading}
                      style={{ marginTop: space.md }} />
            </FadeIn>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

function Field({ icon: Icon, label, ...input }: { icon: typeof Server; label: string } & React.ComponentProps<typeof TextInput>) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={{ marginBottom: space.md }}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.inputWrap, focused && styles.inputFocused]}>
        <Icon size={18} color={focused ? colors.accentDark : colors.textFaint} />
        <TextInput
          {...input}
          style={styles.input}
          placeholderTextColor={colors.textFaint}
          autoCorrect={false}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.navy },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: space.xl, maxWidth: 460, width: '100%', alignSelf: 'center' },
  brand: { alignItems: 'center', marginBottom: space.xl },
  logo: { width: 72, height: 72, borderRadius: 22, backgroundColor: colors.navy2, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  title: { fontSize: 34, fontWeight: '800', color: colors.white, letterSpacing: -0.5 },
  subtitle: { color: '#94a3b8', fontSize: 15, marginTop: 4 },
  card: { backgroundColor: colors.white, borderRadius: radius.xl, padding: space.xl },
  label: { fontSize: 13, fontWeight: '600', color: colors.textMuted, marginBottom: 6 },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1.5, borderColor: colors.border,
    borderRadius: radius.md, paddingHorizontal: 12, backgroundColor: '#f8fafc',
  },
  inputFocused: { borderColor: colors.accent, backgroundColor: colors.white },
  input: { flex: 1, fontSize: 16, paddingVertical: 12, color: colors.text, outlineStyle: 'none' } as object,
  error: { color: colors.danger, marginBottom: space.sm },
});
