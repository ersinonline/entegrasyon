/**
 * Core type definitions for marketplace integration platform
 */

import { Timestamp } from 'firebase-admin/firestore';

// ============================================================================
// ENUMS
// ============================================================================

export enum MarketplaceType {
  N11 = 'n11',
  TRENDYOL = 'trendyol',
  HEPSIBURADA = 'hepsiburada',
  PAZARAMA = 'pazarama',
  IDEFIX = 'idefix'
}

export enum OrderStatus {
  CREATED = 'created',
  PICKING = 'picking',
  READY_TO_SHIP = 'ready_to_ship',
  SHIPPED = 'shipped',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled',
  RETURNED = 'returned'
}

export enum ClaimStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  COMPLETED = 'completed'
}

export enum ClaimType {
  RETURN = 'return',
  CANCEL = 'cancel',
  EXCHANGE = 'exchange'
}

export enum SyncStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  SUCCESS = 'success',
  FAILED = 'failed',
  PARTIAL = 'partial'
}

export enum JobType {
  PRODUCT_SYNC = 'product_sync',
  INVENTORY_SYNC = 'inventory_sync',
  ORDER_FETCH = 'order_fetch',
  ORDER_UPDATE = 'order_update',
  CLAIM_SYNC = 'claim_sync'
}

// ============================================================================
// FIRESTORE DOCUMENT TYPES
// ============================================================================

export interface User {
  id: string;
  email: string;
  displayName: string;
  role: 'admin' | 'merchant';
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Merchant {
  id: string;
  userId: string;
  companyName: string;
  taxNumber: string;
  phone: string;
  email: string;
  address: Address;
  isActive: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Store {
  id: string;
  merchantId: string;
  marketplace: MarketplaceType;
  storeName: string;
  credentials: StoreCredentials; // Encrypted
  isActive: boolean;
  syncSettings: SyncSettings;
  lastSyncAt?: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface StoreCredentials {
  // n11
  appKey?: string;
  appSecret?: string;

  // Trendyol
  supplierId?: string;
  username?: string;
  password?: string;

  // Hepsiburada
  merchantId?: string;

  // Pazarama
  apiKey?: string;
  secretKey?: string;
  companyId?: string;

  // İdefix
  vendorId?: string;
  apiKeyIdefix?: string;
  apiSecret?: string;
}

export interface SyncSettings {
  autoSyncInventory: boolean;
  inventorySyncInterval: number; // minutes
  autoSyncOrders: boolean;
  orderSyncInterval: number; // minutes
  useWebhook: boolean;
  webhookUrl?: string;
}

export interface Product {
  id: string;
  merchantId: string;
  sku: string;
  title: string;
  description: string;
  brand: string;
  barcode?: string;
  gtin?: string;
  images: string[];
  categoryId?: string;
  categoryName?: string;
  attributes: ProductAttribute[];
  variants: ProductVariant[];
  vatRate: number;
  listPrice: number;
  salePrice: number;
  currency: string;
  quantity: number;
  shipmentTemplate?: string;
  isActive: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface ProductAttribute {
  name: string;
  value: string;
  required?: boolean;
}

export interface ProductVariant {
  sku: string;
  barcode?: string;
  attributes: { name: string; value: string }[];
  price?: number;
  quantity?: number;
  images?: string[];
}

export interface ProductMapping {
  id: string;
  productId: string;
  storeId: string;
  sku: string;
  marketplaceItemId: string; // n11 productId, Trendyol barcode, vb.
  marketplaceSKU?: string;
  barcode?: string;
  catalogId?: string;
  status: 'active' | 'pending' | 'rejected' | 'inactive';
  lastSyncAt?: Timestamp;
  syncError?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface InventorySnapshot {
  id: string;
  productId: string;
  storeId: string;
  sku: string;
  quantity: number;
  listPrice: number;
  salePrice: number;
  currency: string;
  lastSyncAt: Timestamp;
  syncStatus: SyncStatus;
  syncError?: string;
  createdAt: Timestamp;
}

export interface Order {
  id: string;
  merchantId: string;
  storeId: string;
  marketplace: MarketplaceType;
  marketplaceOrderNumber: string;
  packageNumber?: string;
  status: OrderStatus;
  buyer: BuyerInfo;
  shippingAddress: Address;
  billingAddress: Address;
  lines: OrderLine[];
  totalAmount: number;
  currency: string;
  cargoCompany?: string;
  trackingNumber?: string;
  shipmentDate?: Timestamp;
  deliveryDate?: Timestamp;
  invoiceUrl?: string;
  notes?: string;
  rawData: any; // Ham pazaryeri datası
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface OrderLine {
  id: string;
  sku: string;
  productId?: string;
  title: string;
  barcode?: string;
  quantity: number;
  price: number;
  totalPrice: number;
  vatRate: number;
  marketplaceItemId?: string;
}

export interface BuyerInfo {
  name: string;
  email: string;
  phone: string;
  tcKimlikNo?: string;
}

export interface Address {
  fullName: string;
  addressLine1: string;
  addressLine2?: string;
  district: string;
  city: string;
  postalCode?: string;
  country: string;
  phone: string;
}

export interface Shipment {
  id: string;
  orderId: string;
  storeId: string;
  marketplace: MarketplaceType;
  cargoCompany: string;
  trackingNumber: string;
  cargoSenderNumber?: string;
  shipmentDate: Timestamp;
  labelUrl?: string;
  status: string;
  packages: ShipmentPackage[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface ShipmentPackage {
  packageNumber: string;
  items: { sku: string; quantity: number }[];
  weight?: number;
  desi?: number;
}

export interface Claim {
  id: string;
  orderId: string;
  orderLineId?: string;
  storeId: string;
  marketplace: MarketplaceType;
  marketplaceClaimId: string;
  type: ClaimType;
  status: ClaimStatus;
  reason: string;
  quantity: number;
  amount?: number;
  customerNote?: string;
  merchantNote?: string;
  images?: string[];
  resolution?: string;
  refundAmount?: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  resolvedAt?: Timestamp;
}

export interface IntegrationLog {
  id: string;
  storeId: string;
  marketplace: MarketplaceType;
  operation: string;
  jobType?: JobType;
  method: string;
  endpoint: string;
  requestPayload?: any; // Sanitized (no credentials)
  responsePayload?: any;
  statusCode?: number;
  success: boolean;
  errorMessage?: string;
  errorStack?: string;
  duration: number; // milliseconds
  timestamp: Timestamp;
}

export interface SyncJob {
  id: string;
  storeId: string;
  marketplace: MarketplaceType;
  jobType: JobType;
  status: SyncStatus;
  progress: number; // 0-100
  totalItems: number;
  processedItems: number;
  failedItems: number;
  errorMessages: string[];
  metadata?: any;
  startedAt: Timestamp;
  completedAt?: Timestamp;
  createdAt: Timestamp;
}

// ============================================================================
// API REQUEST/RESPONSE TYPES
// ============================================================================

export interface MarketplaceProduct {
  sku: string;
  title: string;
  description: string;
  brand: string;
  barcode?: string;
  categoryId: string;
  images: string[];
  attributes: ProductAttribute[];
  variants?: ProductVariant[];
  listPrice: number;
  salePrice: number;
  quantity: number;
  shipmentTemplate?: string;
  vatRate: number;
}

export interface MarketplaceOrder {
  marketplaceOrderNumber: string;
  packageNumber?: string;
  status: string;
  buyer: BuyerInfo;
  shippingAddress: Address;
  billingAddress?: Address;
  lines: OrderLine[];
  totalAmount: number;
  currency: string;
  orderDate: Date;
}

export interface InventoryUpdate {
  sku: string;
  quantity: number;
  listPrice?: number;
  salePrice?: number;
}

export interface ShipmentUpdate {
  orderNumber: string;
  packageNumber?: string;
  trackingNumber: string;
  cargoCompany: string;
  shipmentDate: Date;
}

// ============================================================================
// CONNECTOR INTERFACE
// ============================================================================

export interface MarketplaceConnector {
  // Auth
  authenticate(): Promise<boolean>;

  // Categories
  getCategories(): Promise<Category[]>;
  getCategoryAttributes(categoryId: string): Promise<CategoryAttribute[]>;

  // Brands
  getBrands?(): Promise<Brand[]>;

  // Products
  createProduct(product: MarketplaceProduct): Promise<{ success: boolean; productId?: string; error?: string }>;
  updateProduct(productId: string, product: Partial<MarketplaceProduct>): Promise<{ success: boolean; error?: string }>;
  getProduct(productId: string): Promise<MarketplaceProduct | null>;

  // Inventory
  updateInventory(items: InventoryUpdate[]): Promise<{ success: boolean; taskId?: string; error?: string }>;
  checkInventoryStatus?(taskId: string): Promise<{ completed: boolean; success: boolean; details?: any }>;

  // Orders
  getOrders(params: OrderQueryParams): Promise<MarketplaceOrder[]>;
  getOrderDetail(orderNumber: string): Promise<MarketplaceOrder | null>;
  updateOrderStatus(orderNumber: string, status: string): Promise<{ success: boolean; error?: string }>;

  // Shipment
  createShipment(shipment: ShipmentUpdate): Promise<{ success: boolean; error?: string }>;

  // Claims
  getClaims?(params: ClaimQueryParams): Promise<Claim[]>;
  updateClaim?(claimId: string, action: 'approve' | 'reject', note?: string): Promise<{ success: boolean; error?: string }>;

  // Questions (optional)
  getQuestions?(): Promise<Question[]>;
  answerQuestion?(questionId: string, answer: string): Promise<{ success: boolean; error?: string }>;
}

export interface Category {
  id: string;
  name: string;
  parentId?: string;
  level: number;
}

export interface CategoryAttribute {
  id: string;
  name: string;
  type: 'text' | 'number' | 'select' | 'multiselect' | 'boolean';
  required: boolean;
  options?: string[];
}

export interface Brand {
  id: string;
  name: string;
}

export interface OrderQueryParams {
  startDate?: Date;
  endDate?: Date;
  status?: string;
  page?: number;
  size?: number;
}

export interface ClaimQueryParams {
  startDate?: Date;
  endDate?: Date;
  status?: ClaimStatus;
  type?: ClaimType;
}

export interface Question {
  id: string;
  productId: string;
  question: string;
  askedAt: Date;
  customerName: string;
}

// ============================================================================
// ERROR TYPES
// ============================================================================

export class MarketplaceError extends Error {
  constructor(
    message: string,
    public marketplace: MarketplaceType,
    public statusCode?: number,
    public details?: any
  ) {
    super(message);
    this.name = 'MarketplaceError';
  }
}

export class AuthenticationError extends MarketplaceError {
  constructor(marketplace: MarketplaceType, details?: any) {
    super('Authentication failed', marketplace, 401, details);
    this.name = 'AuthenticationError';
  }
}

export class RateLimitError extends MarketplaceError {
  constructor(
    marketplace: MarketplaceType,
    public retryAfter?: number,
    details?: any
  ) {
    super('Rate limit exceeded', marketplace, 429, details);
    this.name = 'RateLimitError';
  }
}
