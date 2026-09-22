import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';
import type { Api } from './api/types';
import { ApiError, createApi, login as apiLogin, type Session } from './api/client';
import { KEYS, storage } from './storage';

type SessionState = {
  ready: boolean;
  session: Session | null;
  api: Api | null;
  signIn: (server: string, username: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  /** Bumped when data changed elsewhere (e.g. a new order arrived) so screens can refetch. */
  dataVersion: number;
  invalidate: () => void;
};

const Ctx = createContext<SessionState | null>(null);

export async function loadStoredSession(): Promise<Session | null> {
  const raw = await storage.get(KEYS.session);
  const token = await storage.getSecret('pcmania.token');
  if (!raw || !token) return null;
  const { server, username } = JSON.parse(raw);
  return { server, username, token };
}

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [dataVersion, setDataVersion] = useState(0);

  useEffect(() => {
    // Web preview: "?demo" opens straight into demo mode.
    if (Platform.OS === 'web' && typeof window !== 'undefined'
        && (/[?&]demo\b/.test(window.location.search) || (window as { __PCMANIA_DEMO__?: boolean }).__PCMANIA_DEMO__)) {
      setSession({ server: 'demo', token: 'demo', username: 'demo' });
      setReady(true);
      return;
    }
    loadStoredSession().then(setSession).finally(() => setReady(true));
  }, []);

  // Drop the session first: signing out must take effect even if a storage call rejects
  // (SecureStore can throw on a locked keystore), otherwise the button appears to do nothing.
  const clear = useCallback(async () => {
    setSession(null);
    const forget = async (fn: () => Promise<void>) => { try { await fn(); } catch { /* best effort */ } };
    await forget(() => storage.set(KEYS.session, null));
    await forget(() => storage.setSecret('pcmania.token', null));
    await forget(() => storage.set(KEYS.lastSeenOrderId, null));
  }, []);

  const signIn = useCallback(async (server: string, username: string, password: string) => {
    const s = await apiLogin(server, username.trim(), password, 'PCMania Admin (Android)');
    await storage.set(KEYS.session, JSON.stringify({ server: s.server, username: s.username }));
    await storage.set(KEYS.lastServer, s.server);
    await storage.setSecret('pcmania.token', s.token);
    setSession(s);
  }, []);

  const api = useMemo<Api | null>(() => {
    if (!session) return null;
    const inner = createApi(session);
    // Any 401 means the token was revoked or expired: drop back to the login screen.
    return new Proxy(inner, {
      get(target, prop: keyof Api) {
        const fn = target[prop] as (...args: unknown[]) => Promise<unknown>;
        return async (...args: unknown[]) => {
          try {
            return await fn(...args);
          } catch (e) {
            if (e instanceof ApiError && e.status === 401 && prop !== 'logout') clear();
            throw e;
          }
        };
      },
    });
  }, [session, clear]);

  const signOut = useCallback(async () => {
    try {
      await api?.logout();
    } catch {
      // Logging out locally matters more than telling the server.
    }
    await clear();
  }, [api, clear]);

  const invalidate = useCallback(() => setDataVersion((v) => v + 1), []);

  return (
    <Ctx.Provider value={{ ready, session, api, signIn, signOut, dataVersion, invalidate }}>
      {children}
    </Ctx.Provider>
  );
}

export function useSession(): SessionState {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useSession outside SessionProvider');
  return ctx;
}

/** For screens rendered only when signed in. */
export function useApi(): Api {
  const { api } = useSession();
  if (!api) throw new Error('Not signed in');
  return api;
}
