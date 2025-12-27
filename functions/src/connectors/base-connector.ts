/**
 * Base connector class for all marketplace integrations
 * Provides common functionality and enforces interface
 */

import {
  MarketplaceConnector,
  MarketplaceType,
  MarketplaceProduct,
  MarketplaceOrder,
  InventoryUpdate,
  ShipmentUpdate,
  Category,
  CategoryAttribute,
  Brand,
  OrderQueryParams,
  ClaimQueryParams,
  Claim,
  Question,
  StoreCredentials
} from '../types';
import { HttpClient } from '../utils/http';
import { Logger, createLogger } from '../utils/logger';
import { decryptCredentials } from '../utils/encryption';

export abstract class BaseConnector implements MarketplaceConnector {
  protected credentials: StoreCredentials;
  protected storeId: string;
  protected marketplace: MarketplaceType;
  protected logger: Logger;
  protected http?: HttpClient;

  constructor(
    marketplace: MarketplaceType,
    storeId: string,
    encryptedCredentials: StoreCredentials
  ) {
    this.marketplace = marketplace;
    this.storeId = storeId;
    this.credentials = decryptCredentials(encryptedCredentials as any) as any;
    this.logger = createLogger(`${marketplace}:${storeId}`);
  }

  /**
   * Initialize HTTP client with marketplace-specific config
   */
  protected abstract initializeHttpClient(): void;

  /**
   * Authenticate with marketplace
   */
  abstract authenticate(): Promise<boolean>;

  /**
   * Get categories
   */
  abstract getCategories(): Promise<Category[]>;

  /**
   * Get category attributes
   */
  abstract getCategoryAttributes(categoryId: string): Promise<CategoryAttribute[]>;

  /**
   * Get brands (optional for some marketplaces)
   */
  async getBrands?(): Promise<Brand[]>;

  /**
   * Create product
   */
  abstract createProduct(product: MarketplaceProduct): Promise<{
    success: boolean;
    productId?: string;
    error?: string;
  }>;

  /**
   * Update product
   */
  abstract updateProduct(productId: string, product: Partial<MarketplaceProduct>): Promise<{
    success: boolean;
    error?: string;
  }>;

  /**
   * Get product
   */
  abstract getProduct(productId: string): Promise<MarketplaceProduct | null>;

  /**
   * Update inventory (stock/price)
   */
  abstract updateInventory(items: InventoryUpdate[]): Promise<{
    success: boolean;
    taskId?: string;
    error?: string;
  }>;

  /**
   * Check inventory update status (for async marketplaces)
   */
  async checkInventoryStatus?(taskId: string): Promise<{
    completed: boolean;
    success: boolean;
    details?: any;
  }>;

  /**
   * Get orders
   */
  abstract getOrders(params: OrderQueryParams): Promise<MarketplaceOrder[]>;

  /**
   * Get order detail
   */
  abstract getOrderDetail(orderNumber: string): Promise<MarketplaceOrder | null>;

  /**
   * Update order status
   */
  abstract updateOrderStatus(orderNumber: string, status: string): Promise<{
    success: boolean;
    error?: string;
  }>;

  /**
   * Create shipment
   */
  abstract createShipment(shipment: ShipmentUpdate): Promise<{
    success: boolean;
    error?: string;
  }>;

  /**
   * Get claims/returns
   */
  async getClaims?(params: ClaimQueryParams): Promise<Claim[]>;

  /**
   * Update claim
   */
  async updateClaim?(claimId: string, action: 'approve' | 'reject', note?: string): Promise<{
    success: boolean;
    error?: string;
  }>;

  /**
   * Get questions
   */
  async getQuestions?(): Promise<Question[]>;

  /**
   * Answer question
   */
  async answerQuestion?(questionId: string, answer: string): Promise<{
    success: boolean;
    error?: string;
  }>;

  /**
   * Normalize marketplace status to our internal status
   */
  protected abstract normalizeOrderStatus(marketplaceStatus: string): string;

  /**
   * Helper: Chunk array into smaller arrays
   */
  protected chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  /**
   * Helper: Format price (2 decimals, dot separator)
   */
  protected formatPrice(price: number): string {
    return price.toFixed(2);
  }

  /**
   * Helper: Parse date to ISO string
   */
  protected formatDate(date: Date): string {
    return date.toISOString();
  }

  /**
   * Helper: Safe JSON parse
   */
  protected safeJsonParse<T>(json: string, defaultValue: T): T {
    try {
      return JSON.parse(json);
    } catch {
      return defaultValue;
    }
  }
}
