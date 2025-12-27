/**
 * Hepsiburada Marketplace Connector
 * API Docs: https://developers.hepsiburada.com
 * Uses HTTP Basic Auth
 */

import { BaseConnector } from '../base-connector';
import {
  MarketplaceType,
  MarketplaceProduct,
  MarketplaceOrder,
  InventoryUpdate,
  ShipmentUpdate,
  Category,
  CategoryAttribute,
  OrderQueryParams,
  StoreCredentials,
  OrderStatus
} from '../../types';
import { HttpClient } from '../../utils/http';

const HEPSIBURADA_API_BASE = process.env.HEPSIBURADA_API_BASE_URL || 'https://mpop-sit.hepsiburada.com';

export class HepsiburadaConnector extends BaseConnector {
  private merchantId: string;
  private username: string;
  private password: string;

  constructor(storeId: string, credentials: StoreCredentials) {
    super(MarketplaceType.HEPSIBURADA, storeId, credentials);

    this.merchantId = this.credentials.merchantId || '';
    this.username = this.credentials.username || '';
    this.password = this.credentials.password || '';

    if (!this.merchantId || !this.username || !this.password) {
      throw new Error('Hepsiburada merchantId, username, and password are required');
    }

    this.initializeHttpClient();
  }

  protected initializeHttpClient(): void {
    const basicAuth = Buffer.from(`${this.username}:${this.password}`).toString('base64');

    this.http = new HttpClient({
      baseURL: HEPSIBURADA_API_BASE,
      marketplace: this.marketplace,
      storeId: this.storeId,
      headers: {
        'Authorization': `Basic ${basicAuth}`
      },
      logger: this.logger
    });
  }

  async authenticate(): Promise<boolean> {
    try {
      await this.getCategories();
      this.logger.success('Hepsiburada authentication successful');
      return true;
    } catch (error) {
      this.logger.error('Hepsiburada authentication failed', error);
      return false;
    }
  }

  async getCategories(): Promise<Category[]> {
    try {
      const response = await this.http!.get(
        '/categories/list',
        {},
        'getCategories'
      );

      const categories: Category[] = [];
      const catList = response.categories || [];

      for (const cat of catList) {
        categories.push({
          id: cat.categoryId,
          name: cat.categoryName,
          level: 0
        });
      }

      this.logger.info(`Retrieved ${categories.length} categories`);
      return categories;
    } catch (error) {
      this.logger.error('Failed to get categories', error);
      throw error;
    }
  }

  async getCategoryAttributes(categoryId: string): Promise<CategoryAttribute[]> {
    try {
      const response = await this.http!.get(
        `/categories/${categoryId}/attributes`,
        {},
        'getCategoryAttributes'
      );

      const attributes: CategoryAttribute[] = [];
      const attrList = response.attributes || [];

      for (const attr of attrList) {
        attributes.push({
          id: attr.id,
          name: attr.name,
          type: attr.type === 'dropdown' ? 'select' : 'text',
          required: attr.required || false,
          options: attr.values || []
        });
      }

      return attributes;
    } catch (error) {
      this.logger.error(`Failed to get category attributes for ${categoryId}`, error);
      throw error;
    }
  }

  async createProduct(product: MarketplaceProduct): Promise<{
    success: boolean;
    productId?: string;
    error?: string;
  }> {
    try {
      // Hepsiburada kullanıcıdan JSON dosyası ile ürün yükleme yapıyor
      // Bu implementation basitleştirilmiş versiyondur
      const payload = {
        merchantId: this.merchantId,
        HepsiburadaSku: product.sku,
        MerchantSku: product.sku,
        ProductName: product.title,
        ProductDescription: product.description,
        BrandName: product.brand,
        Barcode: product.barcode,
        CategoryId: product.categoryId,
        Images: product.images,
        Attributes: product.attributes,
        Price: product.salePrice,
        AvailableStock: product.quantity
      };

      const response = await this.http!.post(
        '/product/api/products/create',
        payload,
        {},
        'createProduct'
      );

      return {
        success: response.success || false,
        productId: response.productId,
        error: response.message
      };
    } catch (error: any) {
      this.logger.error('Failed to create product', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async updateProduct(productId: string, product: Partial<MarketplaceProduct>): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      const payload = {
        merchantId: this.merchantId,
        HepsiburadaSku: productId,
        ...product
      };

      const response = await this.http!.put(
        `/product/api/products/${productId}`,
        payload,
        {},
        'updateProduct'
      );

      return {
        success: response.success || false,
        error: response.message
      };
    } catch (error: any) {
      this.logger.error('Failed to update product', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async getProduct(productId: string): Promise<MarketplaceProduct | null> {
    this.logger.warn('getProduct not implemented for Hepsiburada');
    return null;
  }

  async updateInventory(items: InventoryUpdate[]): Promise<{
    success: boolean;
    taskId?: string;
    error?: string;
  }> {
    try {
      const payload = {
        merchantId: this.merchantId,
        items: items.map(item => ({
          merchantSku: item.sku,
          availableStock: item.quantity,
          ...item.salePrice && { price: item.salePrice }
        }))
      };

      const response = await this.http!.post(
        '/product/api/products/price-and-inventory',
        payload,
        {},
        'updateInventory'
      );

      return {
        success: response.success || false,
        error: response.message
      };
    } catch (error: any) {
      this.logger.error('Failed to update inventory', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async getOrders(params: OrderQueryParams): Promise<MarketplaceOrder[]> {
    try {
      const queryParams = new URLSearchParams({
        merchantId: this.merchantId,
        ...params.startDate && { beginDate: this.formatDate(params.startDate) },
        ...params.endDate && { endDate: this.formatDate(params.endDate) },
        ...params.status && { status: params.status }
      });

      const response = await this.http!.get(
        `/orders/merchantid/${this.merchantId}?${queryParams}`,
        {},
        'getOrders'
      );

      const ordersList = response.orders || [];
      const orders: MarketplaceOrder[] = [];

      for (const order of ordersList) {
        orders.push({
          marketplaceOrderNumber: order.orderNumber,
          packageNumber: order.packageNumber,
          status: this.normalizeOrderStatus(order.status),
          buyer: {
            name: order.customer?.name || '',
            email: order.customer?.email || '',
            phone: order.customer?.phone || ''
          },
          shippingAddress: order.shippingAddress,
          billingAddress: order.billingAddress || order.shippingAddress,
          lines: (order.items || []).map((item: any) => ({
            id: item.lineItemId,
            sku: item.merchantSku,
            title: item.productName,
            barcode: item.barcode,
            quantity: item.quantity,
            price: item.price,
            totalPrice: item.totalPrice,
            vatRate: item.vatRate || 0
          })),
          totalAmount: order.totalAmount,
          currency: 'TRY',
          orderDate: new Date(order.orderDate)
        });
      }

      this.logger.info(`Retrieved ${orders.length} orders`);
      return orders;
    } catch (error) {
      this.logger.error('Failed to get orders', error);
      throw error;
    }
  }

  async getOrderDetail(orderNumber: string): Promise<MarketplaceOrder | null> {
    const orders = await this.getOrders({});
    return orders.find(o => o.marketplaceOrderNumber === orderNumber) || null;
  }

  async updateOrderStatus(orderNumber: string, status: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      const response = await this.http!.put(
        `/orders/status`,
        {
          merchantId: this.merchantId,
          packageNumber: orderNumber,
          status
        },
        {},
        'updateOrderStatus'
      );

      return {
        success: response.success || false,
        error: response.message
      };
    } catch (error: any) {
      this.logger.error('Failed to update order status', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async createShipment(shipment: ShipmentUpdate): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      const response = await this.http!.post(
        '/orders/shipment',
        {
          merchantId: this.merchantId,
          packageNumber: shipment.packageNumber,
          trackingNumber: shipment.trackingNumber,
          cargoCompany: shipment.cargoCompany
        },
        {},
        'createShipment'
      );

      return {
        success: response.success || false,
        error: response.message
      };
    } catch (error: any) {
      this.logger.error('Failed to create shipment', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  protected normalizeOrderStatus(marketplaceStatus: string): string {
    const statusMap: Record<string, string> = {
      'New': OrderStatus.CREATED,
      'Preparing': OrderStatus.PICKING,
      'Shipped': OrderStatus.SHIPPED,
      'Delivered': OrderStatus.DELIVERED,
      'Cancelled': OrderStatus.CANCELLED,
      'Returned': OrderStatus.RETURNED
    };

    return statusMap[marketplaceStatus] || OrderStatus.CREATED;
  }
}
