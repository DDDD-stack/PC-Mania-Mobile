// Mirrors al.pcmania.web.api.ApiDtos on the server.

export type Option = { value: string; label: string };

export type Page<T> = { items: T[]; page: number; totalPages: number; totalElements: number };

export type Summary = {
  newOrders: number;
  inProgressOrders: number;
  newBuildRequests: number;
  soldUnitsThisMonth: number;
  revenueThisMonth: number;
  profitThisMonth: number;
  profitAllTime: number;
  marginPct: number | null;
  avgDaysToSell: number | null;
  stockUnits: number;
  stockCost: number;
  reservedUnits: number;
  activeProducts: number;
  slowProducts: number;
  fastestBand: string | null;
  latestOrderId: number | null;
};

export type OrderGroup = 'new' | 'active' | 'done';

export type OrderRow = {
  id: number;
  orderNumber: string;
  status: string;
  statusLabel: string;
  customerName: string;
  customerPhone: string;
  city: string;
  delivery: string;
  totalLek: number;
  itemCount: number;
  itemsSummary: string;
  createdAt: string;
};

export type OrderItem = {
  productId: number | null;
  title: string;
  quantity: number;
  priceLek: number;
  costLek: number;
  thumbUrl: string | null;
};

export type OrderDetail = {
  id: number;
  orderNumber: string;
  status: string;
  statusLabel: string;
  transitions: Option[];
  customerName: string;
  customerPhone: string;
  customerEmail: string | null;
  city: string;
  address: string | null;
  customerNotes: string | null;
  adminNotes: string | null;
  delivery: string;
  payment: string;
  subtotalLek: number;
  shippingLek: number;
  totalLek: number;
  profitLek: number;
  items: OrderItem[];
  whatsappUrl: string | null;
  createdAt: string;
  deliveredAt: string | null;
};

export type BuildGroup = 'new' | 'active' | 'done';

export type BuildRow = {
  id: number;
  status: string;
  statusLabel: string;
  customerName: string;
  customerPhone: string;
  budgetLek: number;
  useCase: string;
  quotedTotalLek: number | null;
  notesPreview: string;
  createdAt: string;
};

export type BuildDetail = {
  id: number;
  status: string;
  statusLabel: string;
  statuses: Option[];
  customerName: string;
  customerPhone: string;
  budgetLek: number;
  useCase: string;
  notes: string | null;
  adminNotes: string | null;
  quotedTotalLek: number | null;
  whatsappUrl: string | null;
  createdAt: string;
};

export type BuildPatch = { status?: string; quotedTotalLek?: number; adminNotes?: string };

export type ProductGroup = 'active' | 'reserved' | 'hidden' | 'sold';

export type ProductRow = {
  id: number;
  title: string;
  status: string;
  statusLabel: string;
  condition: string;
  conditionValue: string;
  shortDescription: string | null;
  category: string;
  priceLek: number;
  costLek: number;
  quantity: number;
  thumbUrl: string | null;
  daysListed: number | null;
  viewCount: number;
  publicUrl: string;
};

export type ProductPatch = {
  status?: string;
  quantity?: number;
  priceLek?: number;
  costLek?: number;
  title?: string;
  condition?: string;
  shortDescription?: string;
};

export type UpcomingStatus = 'HIDDEN' | 'VISIBLE' | 'ARRIVED';

export type UpcomingRow = {
  id: number;
  title: string;
  slug: string;
  status: UpcomingStatus;
  statusLabel: string;
  teaser: string | null;
  categorySlug: string | null;
  expectedPriceLek: number | null;
  expectedLabel: string | null;
  condition: string | null;
  imageUrl: string | null;
  sortOrder: number;
  interestCount: number;
  productId: number | null;
  createdAt: string;
};

export type Interest = {
  id: number;
  customerName: string;
  customerPhone: string;
  notified: boolean;
  whatsappUrl: string | null;
  createdAt: string;
};

export type UpcomingPatch = {
  title?: string;
  teaser?: string;
  categorySlug?: string;
  expectedPriceLek?: number;
  expectedLabel?: string;
  condition?: string;
  status?: UpcomingStatus;
  sortOrder?: number;
};

export type Counts<K extends string> = Record<K, number>;

export interface Api {
  summary(): Promise<Summary>;
  orderCounts(): Promise<Counts<OrderGroup>>;
  orders(group: OrderGroup, page?: number): Promise<Page<OrderRow>>;
  order(id: number): Promise<OrderDetail>;
  changeOrderStatus(id: number, status: string): Promise<OrderDetail>;
  saveOrderNotes(id: number, notes: string): Promise<OrderDetail>;
  buildCounts(): Promise<Counts<BuildGroup>>;
  builds(group: BuildGroup, page?: number): Promise<Page<BuildRow>>;
  build(id: number): Promise<BuildDetail>;
  updateBuild(id: number, patch: BuildPatch): Promise<BuildDetail>;
  productCounts(): Promise<Counts<ProductGroup>>;
  products(group: ProductGroup, q?: string, page?: number): Promise<Page<ProductRow>>;
  product(id: number): Promise<ProductRow>;
  updateProduct(id: number, patch: ProductPatch): Promise<ProductRow>;
  deleteProduct(id: number): Promise<void>;
  productStatuses(): Promise<Option[]>;
  conditions(): Promise<Option[]>;
  upcomingStatuses(): Promise<Option[]>;
  upcoming(): Promise<UpcomingRow[]>;
  createUpcoming(patch: UpcomingPatch): Promise<UpcomingRow>;
  updateUpcoming(id: number, patch: UpcomingPatch): Promise<UpcomingRow>;
  deleteUpcoming(id: number): Promise<void>;
  upcomingInterest(id: number): Promise<Interest[]>;
  markInterestNotified(interestId: number): Promise<void>;
  logout(): Promise<void>;
}
