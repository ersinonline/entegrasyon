/**
 * Pazarama Marketplace Connector
 * API: https://isortagimapi.pazarama.com
 * Uses API Key + Secret Key
 * Important: Async operations with status checks
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

const PAZARAMA_API_BASE = process.env.PAZARAMA_API_BASE_URL || 'https://isortagimapi.pazarama.com';

export class PazaramaConnector extends BaseConnector {
  private apiKey: string;
  private secretKey: string;
  private companyId: string;

  constructor(storeId: string, credentials: StoreCredentials) {
    super(MarketplaceType.PAZARAMA, storeId, credentials);

    this.apiKey = this.credentials.apiKey || '';
    this.secretKey = this.credentials.secretKey || '';
    this.companyId = this.credentials.companyId || '';

    if (!this.apiKey || !this.secretKey || !this.companyId) {
      throw new Error('Pazarama apiKey, secretKey, and companyId are required');
    }

    this.initializeHttpClient();
  }

  protected initializeHttpClient(): void {
    this.http = new HttpClient({
      baseURL: PAZARAMA_API_BASE,
      marketplace: this.marketplace,
      storeId: this.storeId,
      headers: {
        'ApiKey': this.apiKey,
        'SecretKey': this.secretKey,
        'CompanyId': this.companyId
      },
      logger: this.logger
    });
  }

  async authenticate(): Promise<boolean> {
    try {
      await this.getCategories();
      this.logger.success('Pazarama authentication successful');
      return true;
    } catch (error) {
      this.logger.error('Pazarama authentication failed', error);
      return false;
    }
  }

  async getCategories(): Promise<Category[]> {
    try {
      const response = await this.http!.post(
        '/category/getCategory',
        {},
        {},
        'getCategories'
      );

      const categories: Category[] = [];
      const catList = response.data || [];

      for (const cat of catList) {
        categories.push({
          id: cat.categoryId.toString(),
          name: cat.categoryName,
          parentId: cat.parentId ? cat.parentId.toString() : undefined,
          level: cat.level || 0
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
      const response = await this.http!.post(
        '/category/getCategoryAttribute',
        { categoryId: parseInt(categoryId) },
        {},
        'getCategoryAttributes'
      );

      const attributes: CategoryAttribute[] = [];
      const attrList = response.data || [];

      for (const attr of attrList) {
        attributes.push({
          id: attr.attributeId.toString(),
          name: attr.attributeName,
          type: attr.attributeType === 1 ? 'select' : 'text',
          required: attr.isRequired || false,
          options: (attr.attributeValues || []).map((v: any) => v.valueName)
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
      const payload = {
        sellerStockCode: product.sku,
        productName: product.title,
        productDescription: product.description,
        brandName: product.brand,
        barcode: product.barcode,
        categoryId: parseInt(product.categoryId),
        images: product.images,
        attributes: product.attributes.map(attr => ({
          attributeName: attr.name,
          attributeValue: attr.value
        })),
        price: product.salePrice,
        listPrice: product.listPrice,
        quantity: product.quantity,
        vatRate: product.vatRate
      };

      const response = await this.http!.post(
        '/product/createProduct',
        payload,
        {},
        'createProduct'
      );

      if (response.success) {
        return {
          success: true,
          productId: response.dataId
        };
      }

      return {
        success: false,
        error: response.message || 'Unknown error'
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
        productId,
        ...product
      };

      const response = await this.http!.post(
        '/product/updateProduct',
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
    this.logger.warn('getProduct not implemented for Pazarama');
    return null;
  }

  async updateInventory(items: InventoryUpdate[]): Promise<{
    success: boolean;
    taskId?: string;
    error?: string;
  }> {
    try {
      // Pazarama async işlem - dataId döner
      const priceResponse = await this.http!.post(
        '/product/updatePrice-v2',
        {
          products: items.map(item => ({
            sellerStockCode: item.sku,
            price: item.salePrice,
            listPrice: item.listPrice
          }))
        },
        {},
        'updatePrice'
      );

      const stockResponse = await this.http!.post(
        '/product/updateStock-v2',
        {
          products: items.map(item => ({
            sellerStockCode: item.sku,
            quantity: item.quantity
          }))
        },
        {},
        'updateStock'
      );

      const taskIds = [
        priceResponse.dataId,
        stockResponse.dataId
      ].filter(Boolean);

      return {
        success: taskIds.length > 0,
        taskId: taskIds.join(','),
        error: taskIds.length === 0 ? 'No dataId received' : undefined
      };
    } catch (error: any) {
      this.logger.error('Failed to update inventory', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async checkInventoryStatus(taskId: string): Promise<{
    completed: boolean;
    success: boolean;
    details?: any;
  }> {
    try {
      const response = await this.http!.post(
        '/product/getOperationStatus',
        { dataId: taskId },
        {},
        'checkInventoryStatus'
      );

      return {
        completed: response.operationStatusText === 'Completed',
        success: response.success || false,
        details: response
      };
    } catch (error) {
      this.logger.error('Failed to check inventory status', error);
      return {
        completed: false,
        success: false
      };
    }
  }

  async getOrders(params: OrderQueryParams): Promise<MarketplaceOrder[]> {
    try {
      const payload = {
        ...params.startDate && { startDate: this.formatDate(params.startDate) },
        ...params.endDate && { endDate: this.formatDate(params.endDate) },
        ...params.status && { orderStatus: params.status },
        page: params.page || 1,
        pageSize: params.size || 100
      };

      const response = await this.http!.post(
        '/order/getOrders',
        payload,
        {},
        'getOrders'
      );

      const ordersList = response.data || [];
      const orders: MarketplaceOrder[] = [];

      for (const order of ordersList) {
        orders.push({
          marketplaceOrderNumber: order.orderNumber,
          packageNumber: order.packageNumber,
          status: this.normalizeOrderStatus(order.orderStatus),
          buyer: {
            name: order.customerName,
            email: order.customerEmail || '',
            phone: order.customerPhone || ''
          },
          shippingAddress: order.shippingAddress,
          billingAddress: order.billingAddress || order.shippingAddress,
          lines: (order.orderItems || []).map((item: any) => ({
            id: item.orderItemId,
            sku: item.sellerStockCode,
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
      // Pazarama statü akışı: 3 -> 12 -> kargoya verme
      const response = await this.http!.put(
        '/order/updateOrderStatusList',
        {
          orderItems: [{
            orderNumber,
            orderStatus: parseInt(status)
          }]
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
        '/order/shipOrder',
        {
          orderNumber: shipment.orderNumber,
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

  protected normalizeOrderStatus(marketplaceStatus: string | number): string {
    // Pazarama numeric status codes
    const statusMap: Record<string, string> = {
      '3': OrderStatus.CREATED, // Siparişiniz Alındı
      '12': OrderStatus.PICKING, // Siparişiniz Hazırlanıyor
      '13': OrderStatus.CANCELLED, // Tedarik Edilemedi
      'Shipped': OrderStatus.SHIPPED,
      'Delivered': OrderStatus.DELIVERED,
      'Cancelled': OrderStatus.CANCELLED,
      'Returned': OrderStatus.RETURNED
    };

    return statusMap[marketplaceStatus.toString()] || OrderStatus.CREATED;
  }
}
