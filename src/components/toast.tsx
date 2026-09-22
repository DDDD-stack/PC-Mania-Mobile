import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import { Animated, Platform, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CircleAlert, CircleCheck, Info } from 'lucide-react-native';
import { colors, radius, shadow } from '../theme';

type Tone = 'success' | 'error' | 'info';
type ToastApi = { show: (message: string, tone?: Tone) => void };

const Ctx = createContext<ToastApi>({ show: () => {} });
const nativeDriver = Platform.OS !== 'web';

/** A single toast that slides down from the top and dismisses itself. */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  const [toast, setToast] = useState<{ message: string; tone: Tone } | null>(null);
  const anim = useRef(new Animated.Value(0)).current;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback((message: string, tone: Tone = 'success') => {
    if (timer.current) clearTimeout(timer.current);
    setToast({ message, tone });
    anim.setValue(0);
    Animated.spring(anim, { toValue: 1, useNativeDriver: nativeDriver, speed: 16, bounciness: 7 }).start();
    timer.current = setTimeout(() => {
      Animated.timing(anim, { toValue: 0, duration: 220, useNativeDriver: nativeDriver }).start(() => setToast(null));
    }, 2600);
  }, [anim]);

  const Icon = toast?.tone === 'error' ? CircleAlert : toast?.tone === 'info' ? Info : CircleCheck;
  const iconColor = toast?.tone === 'error' ? '#fca5a5' : toast?.tone === 'info' ? '#93c5fd' : '#86efac';

  return (
    <Ctx.Provider value={{ show }}>
      {children}
      {toast && (
        <Animated.View
          pointerEvents="none"
          style={[styles.wrap, { bottom: insets.bottom + 84, opacity: anim,
            transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [40, 0] }) }] }]}
        >
          <View style={styles.toast} accessibilityLiveRegion="polite">
            <Icon size={20} color={iconColor} />
            <Text style={styles.text}>{toast.message}</Text>
          </View>
        </Animated.View>
      )}
    </Ctx.Provider>
  );
}

export const useToast = () => useContext(Ctx);

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 16, right: 16, alignItems: 'center', zIndex: 1000 },
  toast: {
    flexDirection: 'row', alignItems: 'center', gap: 10, maxWidth: 480,
    backgroundColor: colors.navy, paddingHorizontal: 16, paddingVertical: 12, borderRadius: radius.md, ...shadow,
  },
  text: { color: colors.white, fontSize: 15, fontWeight: '600', flexShrink: 1 },
});
