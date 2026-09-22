import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, AppState, Platform, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { DefaultTheme, NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import * as Notifications from 'expo-notifications';
import { Bell, LayoutDashboard, Package, Settings, ShoppingBag, Wrench } from 'lucide-react-native';

import { SessionProvider, useSession } from './src/session';
import { ToastProvider, useToast } from './src/components/toast';
import { haptic } from './src/components/ui';
import { checkForNewOrders, setupNotifications } from './src/notifications';
import { KEYS, storage } from './src/storage';
import { colors } from './src/theme';
import LoginScreen from './src/screens/LoginScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import OrdersScreen from './src/screens/OrdersScreen';
import OrderDetailScreen from './src/screens/OrderDetailScreen';
import BuildsScreen from './src/screens/BuildsScreen';
import BuildDetailScreen from './src/screens/BuildDetailScreen';
import InventoryScreen from './src/screens/InventoryScreen';
import ProductDetailScreen from './src/screens/ProductDetailScreen';
import UpcomingScreen from './src/screens/UpcomingScreen';
import UpcomingDetailScreen from './src/screens/UpcomingDetailScreen';
import SettingsScreen from './src/screens/SettingsScreen';

const navigationRef = createNavigationContainerRef<any>();
const Tab = createBottomTabNavigator();
const OrdersStack = createNativeStackNavigator();
const BuildsStack = createNativeStackNavigator();
const InventoryStack = createNativeStackNavigator();

const theme = { ...DefaultTheme, colors: { ...DefaultTheme.colors, background: colors.bg, primary: colors.accentDark } };

const stackOptions = {
  headerStyle: { backgroundColor: colors.navy },
  headerTintColor: colors.white,
  headerTitleStyle: { fontWeight: '700' as const },
  headerShadowVisible: false,
  animation: 'slide_from_right' as const,
  contentStyle: { backgroundColor: colors.bg },
};

function OrdersNavigator() {
  return (
    <OrdersStack.Navigator screenOptions={stackOptions}>
      <OrdersStack.Screen name="Orders" component={OrdersScreen} options={{ title: 'Porositë' }} />
      <OrdersStack.Screen name="OrderDetail" component={OrderDetailScreen}
                          options={({ route }: any) => ({ title: route.params?.title ?? 'Porosia' })} />
    </OrdersStack.Navigator>
  );
}

function BuildsNavigator() {
  return (
    <BuildsStack.Navigator screenOptions={stackOptions}>
      <BuildsStack.Screen name="Builds" component={BuildsScreen} options={{ title: 'Kërkesa PC' }} />
      <BuildsStack.Screen name="BuildDetail" component={BuildDetailScreen}
                          options={({ route }: any) => ({ title: route.params?.title ?? 'Kërkesa' })} />
    </BuildsStack.Navigator>
  );
}

function InventoryNavigator() {
  return (
    <InventoryStack.Navigator screenOptions={stackOptions}>
      <InventoryStack.Screen name="Inventory" component={InventoryScreen} options={{ title: 'Inventari' }} />
      <InventoryStack.Screen name="ProductDetail" component={ProductDetailScreen} options={{ title: 'Produkti' }} />
      {/* Stock on its way lives with the stock you already have, to keep the tab bar readable at 360 dp. */}
      <InventoryStack.Screen name="Upcoming" component={UpcomingScreen} options={{ title: 'Së shpejti' }} />
      <InventoryStack.Screen name="UpcomingDetail" component={UpcomingDetailScreen}
                             options={({ route }: any) => ({ title: route.params?.title ?? 'Artikulli' })} />
    </InventoryStack.Navigator>
  );
}

/**
 * Polls for new orders every 30 s while the app is in the foreground: shows a toast, vibrates,
 * refreshes open screens and keeps the Porositë and Kërkesa tab badges current.
 */
function useOrderWatcher(): { newOrders: number; newBuilds: number } {
  const { api, session, invalidate } = useSession();
  const toast = useToast();
  const [newOrders, setNewOrders] = useState(0);
  const [newBuilds, setNewBuilds] = useState(0);
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    if (!api || !session) return;
    let cancelled = false;

    const tick = async () => {
      if (appState.current !== 'active') return;
      try {
        const before = await storage.get(KEYS.lastSeenOrderId);
        const result = await checkForNewOrders(api);
        const summary = await api.summary();
        if (cancelled) return;
        setNewOrders(summary.newOrders);
        setNewBuilds(summary.newBuildRequests);
        if (before != null && result.latestOrderId != null && result.latestOrderId > Number(before)) {
          haptic('success');
          toast.show('Porosi e re! 🛒', 'info');
          invalidate();
        }
      } catch {
        // Offline or server down: the screens show their own errors.
      }
    };

    if (Platform.OS !== 'web') setupNotifications().catch(() => {});
    tick();
    const interval = setInterval(tick, 30_000);
    const sub = AppState.addEventListener('change', (next) => {
      const resumed = appState.current !== 'active' && next === 'active';
      appState.current = next;
      if (resumed) { tick(); invalidate(); }
    });
    return () => { cancelled = true; clearInterval(interval); sub.remove(); };
  }, [api, session, invalidate, toast]);

  return { newOrders, newBuilds };
}

function SignedIn() {
  const { newOrders, newBuilds } = useOrderWatcher();

  useEffect(() => {
    if (Platform.OS === 'web') return;
    const sub = Notifications.addNotificationResponseReceivedListener(() => {
      if (navigationRef.isReady()) navigationRef.navigate('OrdersTab', { screen: 'Orders', params: { group: 'new' } });
    });
    return () => sub.remove();
  }, []);

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.navy,
        tabBarInactiveTintColor: colors.textFaint,
        tabBarLabelStyle: { fontSize: 12, fontWeight: '600' },
        tabBarStyle: {
          backgroundColor: colors.white, borderTopColor: colors.border,
          ...(Platform.OS === 'web' ? { height: 72, paddingTop: 6, paddingBottom: 14 } : {}),
        },
        animation: 'shift',
      }}
    >
      <Tab.Screen name="DashboardTab" component={DashboardScreen}
                  options={{ title: 'Paneli', tabBarIcon: ({ color, size }) => <LayoutDashboard color={color} size={size} /> }} />
      <Tab.Screen name="OrdersTab" component={OrdersNavigator}
                  options={{
                    title: 'Porositë',
                    tabBarIcon: ({ color, size }) => <ShoppingBag color={color} size={size} />,
                    tabBarBadge: newOrders > 0 ? newOrders : undefined,
                    tabBarBadgeStyle: { backgroundColor: colors.danger, fontWeight: '700' },
                  }} />
      <Tab.Screen name="BuildsTab" component={BuildsNavigator}
                  options={{
                    title: 'Kërkesa',
                    tabBarIcon: ({ color, size }) => <Wrench color={color} size={size} />,
                    tabBarBadge: newBuilds > 0 ? newBuilds : undefined,
                    tabBarBadgeStyle: { backgroundColor: colors.danger, fontWeight: '700' },
                  }} />
      <Tab.Screen name="InventoryTab" component={InventoryNavigator}
                  options={{ title: 'Inventari', tabBarIcon: ({ color, size }) => <Package color={color} size={size} /> }} />
      <Tab.Screen name="SettingsTab" component={SettingsScreen}
                  options={{ title: 'Cilësimet', headerShown: true, headerStyle: { backgroundColor: colors.navy },
                    headerTintColor: colors.white, headerShadowVisible: false,
                    tabBarIcon: ({ color, size }) => <Settings color={color} size={size} /> }} />
    </Tab.Navigator>
  );
}

function Root() {
  const { ready, session } = useSession();
  if (!ready) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.navy, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.accent} size="large" />
      </View>
    );
  }
  return (
    <NavigationContainer ref={navigationRef} theme={theme}>
      <StatusBar style="light" />
      {session ? <SignedIn /> : <LoginScreen />}
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <SessionProvider>
        <ToastProvider>
          <Root />
        </ToastProvider>
      </SessionProvider>
    </SafeAreaProvider>
  );
}
