import { normalizeServer, type Session } from './api/client';

/**
 * The owner's build of the app opens straight to the shop: the server address and a key are built in
 * from .env.local (not committed), so there is nothing to type. The key must equal MOBILE_API_KEY on
 * the server, which treats it like a signed-in admin on the API only.
 *
 * Expo inlines EXPO_PUBLIC_* variables at bundle time, and only when they are written exactly as
 * process.env.EXPO_PUBLIC_NAME - no destructuring or bracket access. A build without them (Expo Go,
 * or a checkout without .env.local) falls back to the sign-in screen.
 */
const server = process.env.EXPO_PUBLIC_SERVER_URL?.trim();
const key = process.env.EXPO_PUBLIC_API_KEY?.trim();

export const builtInSession: Session | null =
  server && key ? { server: normalizeServer(server), token: key, username: 'PCMania' } : null;
