import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

/**
 * Secrets (the API token) go to the Android Keystore via SecureStore; everything else to AsyncStorage.
 * SecureStore does not exist on the web preview, so there both fall back to AsyncStorage.
 */
export const storage = {
  async getSecret(key: string): Promise<string | null> {
    return Platform.OS === 'web' ? AsyncStorage.getItem(key) : SecureStore.getItemAsync(key);
  },
  async setSecret(key: string, value: string | null): Promise<void> {
    if (Platform.OS === 'web') {
      value == null ? await AsyncStorage.removeItem(key) : await AsyncStorage.setItem(key, value);
    } else {
      value == null ? await SecureStore.deleteItemAsync(key) : await SecureStore.setItemAsync(key, value);
    }
  },
  get: (key: string) => AsyncStorage.getItem(key),
  async set(key: string, value: string | null): Promise<void> {
    value == null ? await AsyncStorage.removeItem(key) : await AsyncStorage.setItem(key, value);
  },
};

export const KEYS = {
  session: 'pcmania.session',
  lastServer: 'pcmania.lastServer',
  lastSeenOrderId: 'pcmania.lastSeenOrderId',
  notifications: 'pcmania.notifications',
};
