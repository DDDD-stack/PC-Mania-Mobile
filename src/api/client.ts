import type { Api, BuildDetail, BuildGroup, BuildPatch, BuildRow, Counts, Interest, OrderDetail, OrderGroup, Option, Page, OrderRow, ProductGroup, ProductPatch, ProductRow, Summary, UpcomingPatch, UpcomingRow } from './types';
import { demoApi } from './demo';

export const DEMO_SERVER = 'demo';

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export type Session = { server: string; token: string; username: string };

/** Accepts "192.168.1.10:8080", "pcmania.al" or a full URL; returns an origin without trailing slash. */
export function normalizeServer(input: string): string {
  let s = input.trim();
  if (s.toLowerCase() === DEMO_SERVER) return DEMO_SERVER;
  if (!/^https?:\/\//i.test(s)) s = (/^(localhost|\d{1,3}(\.\d{1,3}){3})(:\d+)?/.test(s) ? 'http://' : 'https://') + s;
  return s.replace(/\/+$/, '');
}

/**
 * A hosted server that sleeps while idle (Render's free plan does, after 15 minutes) needs most
 * of a minute to answer the first request. Waiting only 15s aborted that request and looked
 * exactly like a wrong address. Login usually is the call that wakes the server, so it waits longest.
 */
const TIMEOUT_MS = 30000;
const WAKE_TIMEOUT_MS = 60000;

async function request<T>(server: string, path: string, token: string | null, init: RequestInit = {},
                          timeoutMs: number = TIMEOUT_MS): Promise<T> {
  const controller = new AbortController();
  let timedOut = false;
  const timeout = setTimeout(() => { timedOut = true; controller.abort(); }, timeoutMs);
  let res: Response;
  try {
    res = await fetch(server + '/api/v1' + path, {
      ...init,
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        ...(init.body ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: 'Bearer ' + token } : {}),
      },
    });
  } catch {
    throw new ApiError(0, timedOut
      ? 'Serveri nuk u përgjigj në kohë. Nëse sapo është ndezur, provoni sërish pas pak.'
      : 'Nuk u lidh me serverin. Kontrolloni internetin dhe adresën e serverit.');
  } finally {
    clearTimeout(timeout);
  }
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  const body = text ? safeJson(text) : null;
  if (!res.ok) throw new ApiError(res.status, body?.message ?? `Gabim nga serveri (${res.status}).`);
  return body as T;
}

function safeJson(text: string): any {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export async function login(server: string, username: string, password: string, deviceName: string): Promise<Session> {
  const origin = normalizeServer(server);
  if (origin === DEMO_SERVER) return { server: DEMO_SERVER, token: 'demo', username: username || 'demo' };
  const res = await request<{ token: string; username: string }>(origin, '/auth/login', null, {
    method: 'POST',
    body: JSON.stringify({ username, password, deviceName }),
  }, WAKE_TIMEOUT_MS);
  return { server: origin, token: res.token, username: res.username };
}

export function createApi(session: Session): Api {
  if (session.server === DEMO_SERVER) return demoApi;
  const get = <T,>(path: string) => request<T>(session.server, path, session.token);
  const send = <T,>(method: string, path: string, body?: unknown) =>
    request<T>(session.server, path, session.token, { method, body: body === undefined ? undefined : JSON.stringify(body) });

  return {
    summary: () => get<Summary>('/summary'),
    orderCounts: () => get<Counts<OrderGroup>>('/orders/counts'),
    orders: (group, page = 0) => get<Page<OrderRow>>(`/orders?group=${group}&page=${page}`),
    order: (id) => get<OrderDetail>(`/orders/${id}`),
    changeOrderStatus: (id, status) => send<OrderDetail>('POST', `/orders/${id}/status`, { status }),
    saveOrderNotes: (id, notes) => send<OrderDetail>('PUT', `/orders/${id}/notes`, { notes }),
    buildCounts: () => get<Counts<BuildGroup>>('/builds/counts'),
    builds: (group, page = 0) => get<Page<BuildRow>>(`/builds?group=${group}&page=${page}`),
    build: (id) => get<BuildDetail>(`/builds/${id}`),
    updateBuild: (id, patch: BuildPatch) => send<BuildDetail>('PATCH', `/builds/${id}`, patch),
    productCounts: () => get<Counts<ProductGroup>>('/products/counts'),
    products: (group, q, page = 0) =>
      get<Page<ProductRow>>(`/products?group=${group}&page=${page}${q ? '&q=' + encodeURIComponent(q) : ''}`),
    product: (id) => get<ProductRow>(`/products/${id}`),
    updateProduct: (id, patch: ProductPatch) => send<ProductRow>('PATCH', `/products/${id}`, patch),
    deleteProduct: (id) => send<void>('DELETE', `/products/${id}`),
    productStatuses: async () => (await get<{ productStatuses: Option[] }>('/meta')).productStatuses,
    conditions: async () => (await get<{ conditions: Option[] }>('/meta')).conditions,
    upcomingStatuses: async () => (await get<{ upcomingStatuses: Option[] }>('/meta')).upcomingStatuses,
    upcoming: () => get<UpcomingRow[]>('/upcoming'),
    createUpcoming: (patch: UpcomingPatch) => send<UpcomingRow>('POST', '/upcoming', patch),
    updateUpcoming: (id, patch: UpcomingPatch) => send<UpcomingRow>('PATCH', `/upcoming/${id}`, patch),
    deleteUpcoming: (id) => send<void>('DELETE', `/upcoming/${id}`),
    upcomingInterest: (id) => get<Interest[]>(`/upcoming/${id}/interest`),
    markInterestNotified: (interestId) => send<void>('POST', `/upcoming/interest/${interestId}/notified`),
    logout: () => send<void>('POST', '/auth/logout'),
  };
}
