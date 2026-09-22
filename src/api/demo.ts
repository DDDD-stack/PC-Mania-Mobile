import type { Api, BuildDetail, BuildGroup, BuildRow, Interest, OrderDetail, OrderGroup, OrderRow, ProductGroup, ProductRow, UpcomingRow, UpcomingStatus } from './types';

/** In-memory data so the app can be tried (and previewed on the web) without a server. */

const now = Date.now();
const hoursAgo = (h: number) => new Date(now - h * 3600_000).toISOString();

const ORDER_LABELS: Record<string, string> = {
  NEW: 'E re', CONFIRMED: 'E konfirmuar', SHIPPED: 'E dërguar', DELIVERED: 'E dorëzuar', CANCELLED: 'E anuluar',
};
const PRODUCT_LABELS: Record<string, string> = {
  DRAFT: 'Draft', ACTIVE: 'Aktiv', RESERVED: 'I rezervuar', SOLD: 'I shitur', HIDDEN: 'I fshehur',
};
const TRANSITIONS: Record<string, string[]> = {
  NEW: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['SHIPPED', 'DELIVERED', 'CANCELLED'],
  SHIPPED: ['DELIVERED', 'CANCELLED'],
  DELIVERED: [],
  CANCELLED: [],
};

let products: ProductRow[] = [
  p(1, 'MSI GeForce RTX 3060 Ventus 2X 12G OC', 'RESERVED', 'E përdorur', 27000, 20500, 0, 41, 212),
  p(2, 'Gigabyte GeForce RTX 4070 Super Windforce OC 12G', 'ACTIVE', 'E re', 72000, 62000, 2, 13, 96),
  p(3, 'ASUS TUF Gaming RTX 4080 Super OC 16G', 'SOLD', 'Open box', 125000, 108000, 0, 4, 143),
  p(4, 'Sapphire Pulse Radeon RX 6700 XT 12GB', 'ACTIVE', 'E përdorur', 32000, 25000, 1, 47, 58),
  p(5, 'Zotac Gaming RTX 4060 Ti Twin Edge 8GB', 'ACTIVE', 'E re', 49000, 42500, 3, 6, 31),
  p(6, 'PowerColor Red Devil RX 7900 XTX 24GB', 'ACTIVE', 'E përdorur', 98000, 84000, 1, 33, 177),
  p(7, 'MSI GeForce GTX 1660 Super Gaming X 6G', 'DRAFT', 'E përdorur', 15000, 11000, 1, null, 0),
];

let orders: OrderDetail[] = [
  o(1024, 'PM-2026-0024', 'NEW', 'Arben Hoxha', '069 123 4567', 'Durrës', 'Rr. Taulantia, pallati 12', 'Me korrier', 2, 72000, 1, 0.4,
    'Ju lutem telefononi pas orës 17.'),
  o(1023, 'PM-2026-0023', 'NEW', 'Besa Kola', '068 555 1122', 'Tiranë', null, 'Marrje në Tiranë', 4, 32000, 1, 2.5, null),
  o(1022, 'PM-2026-0022', 'CONFIRMED', 'Dritan Leka', '067 111 2233', 'Fier', 'Lagjja 1 Maji', 'Me korrier', 1, 27000, 1, 20, null),
  o(1021, 'PM-2026-0021', 'SHIPPED', 'Elira Meta', '069 900 4411', 'Shkodër', 'Rr. Kolë Idromeno', 'Me korrier', 5, 49000, 2, 30, null),
  o(1020, 'PM-2026-0020', 'DELIVERED', 'Gent Basha', '068 222 3344', 'Tiranë', null, 'Marrje në Tiranë', 3, 125000, 1, 72, null),
  o(1019, 'PM-2026-0019', 'CANCELLED', 'Klajdi Rama', '069 777 8899', 'Vlorë', 'Lungomare', 'Me korrier', 6, 98000, 1, 96, null),
];

function p(id: number, title: string, status: string, condition: string, priceLek: number, costLek: number,
           quantity: number, daysListed: number | null, viewCount: number): ProductRow {
  return {
    id, title, status, statusLabel: PRODUCT_LABELS[status], condition,
    conditionValue: condition === 'E re' ? 'NEW' : condition === 'Open box' ? 'OPEN_BOX' : 'USED',
    shortDescription: null, category: 'karta-grafike', priceLek, costLek,
    quantity, thumbUrl: null, daysListed, viewCount, publicUrl: 'https://pcmania.al/produkt/demo-' + id,
  };
}

function o(id: number, orderNumber: string, status: string, customerName: string, customerPhone: string, city: string,
           address: string | null, delivery: string, productId: number, price: number, qty: number, ageHours: number,
           notes: string | null): OrderDetail {
  const product = products.find((x) => x.id === productId)!;
  const shipping = delivery === 'Me korrier' ? 500 : 0;
  return withTransitions({
    id, orderNumber, status, statusLabel: ORDER_LABELS[status], transitions: [], customerName, customerPhone,
    customerEmail: null, city, address, customerNotes: notes, adminNotes: null, delivery,
    payment: 'Para në dorë në dorëzim', subtotalLek: price * qty, shippingLek: shipping, totalLek: price * qty + shipping,
    profitLek: (price - product.costLek) * qty,
    items: [{ productId, title: product.title, quantity: qty, priceLek: price, costLek: product.costLek, thumbUrl: null }],
    whatsappUrl: 'https://wa.me/355' + customerPhone.replace(/\D/g, '').slice(1),
    createdAt: hoursAgo(ageHours), deliveredAt: status === 'DELIVERED' ? hoursAgo(ageHours - 20) : null,
  });
}

function withTransitions(d: OrderDetail): OrderDetail {
  return { ...d, statusLabel: ORDER_LABELS[d.status], transitions: TRANSITIONS[d.status].map((s) => ({ value: s, label: ORDER_LABELS[s] })) };
}

const BUILD_LABELS: Record<string, string> = {
  NEW: 'E re', QUOTED: 'Me ofertë', ACCEPTED: 'E pranuar', DECLINED: 'E refuzuar', CLOSED: 'E mbyllur',
};

let builds: BuildDetail[] = [
  b(7, 'NEW', 'Ilir Progri', '069 445 2200', 150000, 'Lojëra 1440p', 3,
    'Dua një PC për Warzone dhe Fortnite në 144 Hz. Kam monitor, tastierë dhe mouse. Buxheti është fleksibël deri në 170 mijë.'),
  b(6, 'NEW', 'Marsida Hoxha', '068 330 9911', 90000, 'Punë / studime', 26,
    'Për Photoshop dhe Illustrator, punoj me foto të mëdha. Preferoj SSD të madh.'),
  b(5, 'QUOTED', 'Endrit Dema', '067 800 1234', 220000, 'Streaming / krijim përmbajtjeje', 74,
    'Stream në Twitch me dy monitorë, dua që të mos më bjerë FPS kur regjistroj.', 218000, 'Ofertë e dërguar me WhatsApp, pret përgjigje nga i vëllai.'),
  b(4, 'ACCEPTED', 'Sara Bejko', '069 112 8877', 120000, 'Lojëra 1080p', 120, 'Për djalin, lojëra dhe shkollë.', 118500,
    'Pagesa gjysmë paradhënie, montimi të premten.'),
  b(3, 'CLOSED', 'Fatjon Kurti', '068 654 3210', 300000, 'Tjetër', 400, 'Workstation për render 3D.', 295000, 'U dorëzua dhe u faturua.'),
];

function b(id: number, status: string, customerName: string, customerPhone: string, budgetLek: number, useCase: string,
           ageHours: number, notes: string, quotedTotalLek: number | null = null, adminNotes: string | null = null): BuildDetail {
  return {
    id, status, statusLabel: BUILD_LABELS[status],
    statuses: Object.entries(BUILD_LABELS).map(([value, label]) => ({ value, label })),
    customerName, customerPhone, budgetLek, useCase, notes, adminNotes, quotedTotalLek,
    whatsappUrl: 'https://wa.me/355' + customerPhone.replace(/\D/g, '').slice(1),
    createdAt: hoursAgo(ageHours),
  };
}

const toBuildRow = (d: BuildDetail): BuildRow => ({
  id: d.id, status: d.status, statusLabel: d.statusLabel, customerName: d.customerName, customerPhone: d.customerPhone,
  budgetLek: d.budgetLek, useCase: d.useCase, quotedTotalLek: d.quotedTotalLek,
  notesPreview: (d.notes ?? '').slice(0, 120), createdAt: d.createdAt,
});

const CONDITION_LABELS: Record<string, string> = { NEW: 'E re', OPEN_BOX: 'Open box', USED: 'E përdorur' };
const UPCOMING_LABELS: Record<UpcomingStatus, string> = { HIDDEN: 'I fshehur', VISIBLE: 'I dukshëm', ARRIVED: 'Ka ardhur' };

let upcoming: UpcomingRow[] = [
  u(1, 'RTX 5070 Ti – 2 copë', 'VISIBLE', 'Porositur nga Gjermania, të reja në kuti.', 165000, 'Brenda javës', 'NEW', 10, 3),
  u(2, 'RX 9070 XT Sapphire Nitro+', 'VISIBLE', 'Një copë, open box, testuar.', 138000, 'Fundi i muajit', 'OPEN_BOX', 20, 1),
  u(3, 'DDR5 32GB 6000 CL30 – disa kite', 'HIDDEN', null, 28000, null, 'NEW', 30, 0),
];

let interestList: (Interest & { upcomingId: number })[] = [
  { id: 1, upcomingId: 1, customerName: 'Arben Hoxha', customerPhone: '069 123 4567', notified: false, whatsappUrl: 'https://wa.me/355691234567', createdAt: hoursAgo(20) },
  { id: 2, upcomingId: 1, customerName: 'Besa Kola', customerPhone: '068 555 1122', notified: false, whatsappUrl: 'https://wa.me/355685551122', createdAt: hoursAgo(9) },
  { id: 3, upcomingId: 1, customerName: 'Dritan Leka', customerPhone: '067 111 2233', notified: true, whatsappUrl: 'https://wa.me/355671112233', createdAt: hoursAgo(40) },
  { id: 4, upcomingId: 2, customerName: 'Elira Meta', customerPhone: '069 900 4411', notified: false, whatsappUrl: 'https://wa.me/355699004411', createdAt: hoursAgo(5) },
];

function u(id: number, title: string, status: UpcomingStatus, teaser: string | null, expectedPriceLek: number | null,
           expectedLabel: string | null, condition: string | null, sortOrder: number, interestCount: number): UpcomingRow {
  return {
    id, title, slug: 'demo-' + id, status, statusLabel: UPCOMING_LABELS[status], teaser,
    categorySlug: 'karta-grafike', expectedPriceLek, expectedLabel, condition, imageUrl: null,
    sortOrder, interestCount, productId: null, createdAt: hoursAgo(sortOrder * 3),
  };
}

const GROUPS: Record<OrderGroup, string[]> = { new: ['NEW'], active: ['CONFIRMED', 'SHIPPED'], done: ['DELIVERED', 'CANCELLED'] };
const BUILD_GROUPS: Record<BuildGroup, string[]> = { new: ['NEW'], active: ['QUOTED', 'ACCEPTED'], done: ['DECLINED', 'CLOSED'] };
const PRODUCT_GROUPS: Record<ProductGroup, string[]> = { active: ['ACTIVE'], reserved: ['RESERVED'], hidden: ['DRAFT', 'HIDDEN'], sold: ['SOLD'] };

const delay = <T,>(value: T, ms = 350) => new Promise<T>((r) => setTimeout(() => r(structuredCloneSafe(value)), ms));
const structuredCloneSafe = <T,>(v: T): T => (v === undefined ? v : JSON.parse(JSON.stringify(v)));

const toRow = (d: OrderDetail): OrderRow => ({
  id: d.id, orderNumber: d.orderNumber, status: d.status, statusLabel: d.statusLabel, customerName: d.customerName,
  customerPhone: d.customerPhone, city: d.city, delivery: d.delivery, totalLek: d.totalLek,
  itemCount: d.items.reduce((n, i) => n + i.quantity, 0), itemsSummary: d.items[0]?.title ?? '', createdAt: d.createdAt,
});

export const demoApi: Api = {
  summary: () => {
    const active = products.filter((x) => x.status === 'ACTIVE');
    return delay({
      newOrders: orders.filter((x) => x.status === 'NEW').length,
      inProgressOrders: orders.filter((x) => GROUPS.active.includes(x.status)).length,
      newBuildRequests: builds.filter((x) => x.status === 'NEW').length,
      soldUnitsThisMonth: 7,
      revenueThisMonth: 486000,
      profitThisMonth: 61500,
      profitAllTime: 318000,
      marginPct: 13.4,
      avgDaysToSell: 11.6,
      stockUnits: products.filter((x) => x.status !== 'SOLD').reduce((n, x) => n + x.quantity, 0),
      stockCost: products.filter((x) => x.status !== 'SOLD').reduce((n, x) => n + x.quantity * x.costLek, 0),
      reservedUnits: orders.filter((x) => x.status === 'NEW' || GROUPS.active.includes(x.status)).length,
      activeProducts: active.length,
      slowProducts: active.filter((x) => (x.daysListed ?? 0) >= 30).length,
      fastestBand: '0 – 100k',
      latestOrderId: Math.max(...orders.map((x) => x.id)),
    });
  },
  orderCounts: () => delay({
    new: orders.filter((x) => GROUPS.new.includes(x.status)).length,
    active: orders.filter((x) => GROUPS.active.includes(x.status)).length,
    done: orders.filter((x) => GROUPS.done.includes(x.status)).length,
  }, 150),
  orders: (group) => {
    const items = orders.filter((x) => GROUPS[group].includes(x.status)).map(toRow);
    return delay({ items, page: 0, totalPages: 1, totalElements: items.length });
  },
  order: (id) => delay(orders.find((x) => x.id === id)!),
  changeOrderStatus: (id, status) => {
    orders = orders.map((x) => (x.id === id ? withTransitions({
      ...x, status, deliveredAt: status === 'DELIVERED' ? new Date().toISOString() : x.deliveredAt,
    }) : x));
    return delay(orders.find((x) => x.id === id)!, 450);
  },
  saveOrderNotes: (id, notes) => {
    orders = orders.map((x) => (x.id === id ? { ...x, adminNotes: notes || null } : x));
    return delay(orders.find((x) => x.id === id)!, 300);
  },
  buildCounts: () => delay({
    new: builds.filter((x) => BUILD_GROUPS.new.includes(x.status)).length,
    active: builds.filter((x) => BUILD_GROUPS.active.includes(x.status)).length,
    done: builds.filter((x) => BUILD_GROUPS.done.includes(x.status)).length,
  }, 150),
  builds: (group) => {
    const items = builds.filter((x) => BUILD_GROUPS[group].includes(x.status)).map(toBuildRow);
    return delay({ items, page: 0, totalPages: 1, totalElements: items.length });
  },
  build: (id) => delay(builds.find((x) => x.id === id)!),
  updateBuild: (id, patch) => {
    builds = builds.map((x) => (x.id === id ? {
      ...x,
      ...(patch.status ? { status: patch.status, statusLabel: BUILD_LABELS[patch.status] } : {}),
      ...(patch.quotedTotalLek != null ? { quotedTotalLek: patch.quotedTotalLek } : {}),
      ...(patch.adminNotes != null ? { adminNotes: patch.adminNotes || null } : {}),
    } : x));
    return delay(builds.find((x) => x.id === id)!, 400);
  },
  productCounts: () => delay({
    active: products.filter((x) => PRODUCT_GROUPS.active.includes(x.status)).length,
    reserved: products.filter((x) => PRODUCT_GROUPS.reserved.includes(x.status)).length,
    hidden: products.filter((x) => PRODUCT_GROUPS.hidden.includes(x.status)).length,
    sold: products.filter((x) => PRODUCT_GROUPS.sold.includes(x.status)).length,
  }, 150),
  products: (group, q) => {
    const items = products
      .filter((x) => PRODUCT_GROUPS[group].includes(x.status))
      .filter((x) => !q || x.title.toLowerCase().includes(q.toLowerCase()))
      .sort((a, b) => (b.daysListed ?? 0) - (a.daysListed ?? 0));
    return delay({ items, page: 0, totalPages: 1, totalElements: items.length });
  },
  product: (id) => delay(products.find((x) => x.id === id)!),
  updateProduct: (id, patch) => {
    products = products.map((x) => (x.id === id ? {
      ...x,
      ...(patch.quantity != null ? { quantity: patch.quantity } : {}),
      ...(patch.priceLek != null ? { priceLek: patch.priceLek } : {}),
      ...(patch.title != null ? { title: patch.title } : {}),
      ...(patch.costLek != null ? { costLek: patch.costLek } : {}),
      ...(patch.shortDescription != null ? { shortDescription: patch.shortDescription } : {}),
      ...(patch.condition != null ? { conditionValue: patch.condition, condition: CONDITION_LABELS[patch.condition] } : {}),
      ...(patch.status ? { status: patch.status, statusLabel: PRODUCT_LABELS[patch.status], daysListed: x.daysListed ?? 0 } : {}),
    } : x));
    return delay(products.find((x) => x.id === id)!, 350);
  },
  deleteProduct: (id) => {
    products = products.filter((x) => x.id !== id);
    return delay(undefined, 300);
  },
  productStatuses: () => delay(Object.entries(PRODUCT_LABELS).map(([value, label]) => ({ value, label })), 50),
  conditions: () => delay(Object.entries(CONDITION_LABELS).map(([value, label]) => ({ value, label })), 50),
  upcomingStatuses: () => delay(Object.entries(UPCOMING_LABELS).map(([value, label]) => ({ value, label })), 50),
  upcoming: () => delay(upcoming),
  createUpcoming: (patch) => {
    const row: UpcomingRow = {
      id: Math.max(0, ...upcoming.map((x) => x.id)) + 1,
      title: patch.title ?? 'Pa titull',
      slug: (patch.title ?? 'pa-titull').toLowerCase().replace(/\s+/g, '-'),
      status: patch.status ?? 'VISIBLE',
      statusLabel: UPCOMING_LABELS[patch.status ?? 'VISIBLE'],
      teaser: patch.teaser ?? null,
      categorySlug: patch.categorySlug ?? 'karta-grafike',
      expectedPriceLek: patch.expectedPriceLek ?? null,
      expectedLabel: patch.expectedLabel ?? null,
      condition: patch.condition ?? null,
      imageUrl: null,
      sortOrder: patch.sortOrder ?? (Math.max(0, ...upcoming.map((x) => x.sortOrder)) + 10),
      interestCount: 0,
      productId: null,
      createdAt: new Date().toISOString(),
    };
    upcoming = [...upcoming, row].sort((a, x) => a.sortOrder - x.sortOrder);
    return delay(row, 400);
  },
  updateUpcoming: (id, patch) => {
    upcoming = upcoming.map((x) => (x.id === id ? {
      ...x,
      ...(patch.title != null ? { title: patch.title } : {}),
      ...(patch.teaser != null ? { teaser: patch.teaser } : {}),
      ...(patch.expectedPriceLek != null ? { expectedPriceLek: patch.expectedPriceLek } : {}),
      ...(patch.expectedLabel != null ? { expectedLabel: patch.expectedLabel } : {}),
      ...(patch.condition != null ? { condition: patch.condition } : {}),
      ...(patch.sortOrder != null ? { sortOrder: patch.sortOrder } : {}),
      ...(patch.status ? { status: patch.status, statusLabel: UPCOMING_LABELS[patch.status] } : {}),
    } : x)).sort((a, x) => a.sortOrder - x.sortOrder);
    return delay(upcoming.find((x) => x.id === id)!, 350);
  },
  deleteUpcoming: (id) => {
    upcoming = upcoming.filter((x) => x.id !== id);
    interestList = interestList.filter((i) => i.upcomingId !== id);
    return delay(undefined, 300);
  },
  upcomingInterest: (id) => delay(interestList.filter((i) => i.upcomingId === id).map(({ upcomingId, ...rest }) => rest)),
  markInterestNotified: (interestId) => {
    interestList = interestList.map((i) => (i.id === interestId ? { ...i, notified: true } : i));
    return delay(undefined, 250);
  },
  logout: () => delay(undefined, 50),
};
