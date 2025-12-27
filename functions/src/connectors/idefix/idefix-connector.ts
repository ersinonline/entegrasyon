/**
 * İdefix Marketplace Connector
 * API Docs: https://developer.idefix.com
 * Uses base64(ApiKey:Secret) token auth
 * Rate limit aware: 429 Too Many Requests
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
  Brand,
  OrderQueryParams,
  StoreCredentials,
  OrderStatus,
  Claim,
  ClaimQueryParams,
  ClaimStatus,
  ClaimType
} from '../../types';
import { HttpClient } from '../../utils/http';

const IDEFIX_API_BASE = process.env.IDEFIX_API_BASE_URL || 'https://merchantapi.idefix.com';

export class IdefixConnector extends BaseConnector {
  private vendorId: string;
  private apiKeyIdefix: string;
  private apiSecret: string;
  private token: string;

  constructor(storeId: string, credentials: StoreCredentials) {
    super(MarketplaceType.IDEFIX, storeId, credentials);

    this.vendorId = this.credentials.vendorId || '';
    this.apiKeyIdefix = this.credentials.apiKeyIdefix || '';
    this.apiSecret = this.credentials.apiSecret || '';

    if (!this.vendorId || !this.apiKeyIdefix || !this.apiSecret) {
      throw new Error('İdefix vendorId, apiKey, and apiSecret are required');
    }

    // Generate token: base64(ApiKey:Secret)
    this.token = Buffer.from(`${this.apiKeyIdefix}:${this.apiSecret}`).toString('base64');

    this.initializeHttpClient();
  }

  protected initializeHttpClient(): void {
    this.http = new HttpClient({
      baseURL: IDEFIX_API_BASE,
      marketplace: this.marketplace,
      storeId: this.storeId,
      headers: {
        'X-API-KEY': this.token
      },
      logger: this.logger
    });
  }

  async authenticate(): Promise<boolean> {
    try {
      await this.getCategories();
      this.logger.success('İdefix authentication successful');
      return true;
    } catch (error) {
      this.logger.error('İdefix authentication failed', error);
      return false;
    }
  }

  async getCategories(): Promise<Category[]> {
    try {
      const response = await this.http!.get(
        '/product/categories',
        {},
        'getCategories'
      );

      const categories: Category[] = [];
      const catList = response.data || [];

      for (const cat of catList) {
        categories.push({
          id: cat.id.toString(),
          name: cat.name,
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
      const response = await this.http!.get(
        `/product/category-attributes/${categoryId}`,
        {},
        'getCategoryAttributes'
      );

      const attributes: CategoryAttribute[] = [];
      const attrList = response.data?.attributes || [];

      for (const attr of attrList) {
        attributes.push({
          id: attr.id.toString(),
          name: attr.name,
          type: attr.type === 'dropdown' ? 'select' : 'text',
          required: attr.required || false,
          options: (attr.options || []).map((o: any) => o.value)
        });
      }

      return attributes;
    } catch (error) {
      this.logger.error(`Failed to get category attributes for ${categoryId}`, error);
      throw error;
    }
  }

  async getBrands(): Promise<Brand[]> {
    try {
      const response = await this.http!.get(
        '/product/brands',
        {},
        'getBrands'
      );

      return (response.data || []).map((b: any) => ({
        id: b.id.toString(),
        name: b.name
      }));
    } catch (error) {
      this.logger.error('Failed to get brands', error);
      throw error;
    }
  }

  async createProduct(product: MarketplaceProduct): Promise<{
    success: boolean;
    productId?: string;
    error?: string;
  }> {
    try {
      // İdefix "hızlı ürün yükleme" veya "yeni ürün create" mantığı var
      const payload = {
        vendorSku: product.sku,
        title: product.title,
        description: product.description,
        brandId: parseInt(product.brand) || 0,
        categoryId: parseInt(product.categoryId),
        barcode: product.barcode,
        images: product.images,
        attributes: product.attributes.map(attr => ({
          attributeId: attr.name,
          value: attr.value
        })),
        price: product.salePrice,
        listPrice: product.listPrice,
        stock: product.quantity,
        vatRate: product.vatRate
      };

      const response = await this.http!.post(
        `/product/${this.vendorId}/create`,
        payload,
        {},
        'createProduct'
      );

      if (response.success) {
        return {
          success: true,
          productId: response.data?.batchId || response.data?.productId
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

      const response = await this.http!.put(
        `/product/${this.vendorId}/update`,
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
    try {
      const response = await this.http!.get(
        `/product/${this.vendorId}/${productId}`,
        {},
        'getProduct'
      );

      const item = response.data;
      if (!item) return null;

      return {
        sku: item.vendorSku,
        title: item.title,
        description: item.description,
        brand: item.brandId?.toString() || '',
        barcode: item.barcode,
        categoryId: item.categoryId?.toString() || '',
        images: item.images || [],
        attributes: item.attributes || [],
        variants: [],
        listPrice: item.listPrice,
        salePrice: item.price,
        quantity: item.stock,
        vatRate: item.vatRate,
        currency: 'TRY',
        shipmentTemplate: ''
      };
    } catch (error) {
      this.logger.error('Failed to get product', error);
      return null;
    }
  }

  async updateInventory(items: InventoryUpdate[]): Promise<{
    success: boolean;
    taskId?: string;
    error?: string;
  }> {
    try {
      const payload = {
        items: items.map(item => ({
          vendorSku: item.sku,
          stock: item.quantity,
          ...item.salePrice && { price: item.salePrice },
          ...item.listPrice && { listPrice: item.listPrice }
        }))
      };

      const response = await this.http!.put(
        `/product/${this.vendorId}/stock-price`,
        payload,
        {},
        'updateInventory'
      );

      return {
        success: response.success || false,
        taskId: response.data?.batchId,
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

  async checkInventoryStatus(taskId: string): Promise<{
    completed: boolean;
    success: boolean;
    details?: any;
  }> {
    try {
      const response = await this.http!.get(
        `/product/${this.vendorId}/batch-status/${taskId}`,
        {},
        'checkInventoryStatus'
      );

      return {
        completed: response.data?.status === 'completed',
        success: response.success || false,
        details: response.data
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
      const queryParams = new URLSearchParams({
        ...params.startDate && { startDate: this.formatDate(params.startDate) },
        ...params.endDate && { endDate: this.formatDate(params.endDate) },
        ...params.status && { status: params.status },
        page: (params.page || 1).toString(),
        size: (params.size || 100).toString()
      });

      const response = await this.http!.get(
        `/oms/${this.vendorId}/orders?${queryParams}`,
        {},
        'getOrders'
      );

      const ordersList = response.data?.orders || [];
      const orders: MarketplaceOrder[] = [];

      for (const order of ordersList) {
        orders.push({
          marketplaceOrderNumber: order.orderNumber,
          packageNumber: order.packageId,
          status: this.normalizeOrderStatus(order.status),
          buyer: {
            name: order.customer?.fullName || '',
            email: order.customer?.email || '',
            phone: order.customer?.phone || ''
          },
          shippingAddress: order.shippingAddress,
          billingAddress: order.billingAddress || order.shippingAddress,
          lines: (order.items || []).map((item: any) => ({
            id: item.orderItemId,
            sku: item.vendorSku,
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
    try {
      const response = await this.http!.get(
        `/oms/${this.vendorId}/order/${orderNumber}`,
        {},
        'getOrderDetail'
      );

      const order = response.data;
      if (!order) return null;

      return {
        marketplaceOrderNumber: order.orderNumber,
        packageNumber: order.packageId,
        status: this.normalizeOrderStatus(order.status),
        buyer: {
          name: order.customer?.fullName || '',
          email: order.customer?.email || '',
          phone: order.customer?.phone || ''
        },
        shippingAddress: order.shippingAddress,
        billingAddress: order.billingAddress || order.shippingAddress,
        lines: (order.items || []).map((item: any) => ({
          id: item.orderItemId,
          sku: item.vendorSku,
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
      };
    } catch (error) {
      this.logger.error('Failed to get order detail', error);
      return null;
    }
  }

  async updateOrderStatus(orderNumber: string, status: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      const response = await this.http!.put(
        `/oms/${this.vendorId}/order/${orderNumber}/status`,
        { status },
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
        `/oms/${this.vendorId}/shipment`,
        {
          orderNumber: shipment.orderNumber,
          trackingNumber: shipment.trackingNumber,
          cargoCompany: shipment.cargoCompany,
          shipmentDate: this.formatDate(shipment.shipmentDate)
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

  async getClaims(params: ClaimQueryParams): Promise<Claim[]> {
    try {
      const queryParams = new URLSearchParams({
        ...params.startDate && { startDate: this.formatDate(params.startDate) },
        ...params.endDate && { endDate: this.formatDate(params.endDate) },
        ...params.status && { status: params.status }
      });

      const response = await this.http!.get(
        `/oms/${this.vendorId}/claims?${queryParams}`,
        {},
        'getClaims'
      );

      const claimsList = response.data?.claims || [];
      const claims: Claim[] = [];

      for (const claim of claimsList) {
        claims.push({
          id: claim.claimId,
          orderId: claim.orderNumber,
          orderLineId: claim.orderItemId,
          storeId: this.storeId,
          marketplace: this.marketplace,
          marketplaceClaimId: claim.claimId,
          type: claim.type === 'return' ? ClaimType.RETURN : ClaimType.CANCEL,
          status: this.normalizeClaimStatus(claim.status),
          reason: claim.reason,
          quantity: claim.quantity,
          amount: claim.amount,
          customerNote: claim.customerNote,
          images: claim.images || [],
          createdAt: claim.createdAt,
          updatedAt: claim.updatedAt
        } as any);
      }

      this.logger.info(`Retrieved ${claims.length} claims`);
      return claims;
    } catch (error) {
      this.logger.error('Failed to get claims', error);
      throw error;
    }
  }

  async updateClaim(claimId: string, action: 'approve' | 'reject', note?: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      const response = await this.http!.post(
        `/oms/${this.vendorId}/claim-create`,
        {
          claimId,
          action,
          vendorNote: note
        },
        {},
        'updateClaim'
      );

      return {
        success: response.success || false,
        error: response.message
      };
    } catch (error: any) {
      this.logger.error('Failed to update claim', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  private normalizeClaimStatus(status: string): ClaimStatus {
    const statusMap: Record<string, ClaimStatus> = {
      'pending': ClaimStatus.PENDING,
      'approved': ClaimStatus.APPROVED,
      'rejected': ClaimStatus.REJECTED,
      'completed': ClaimStatus.COMPLETED
    };

    return statusMap[status.toLowerCase()] || ClaimStatus.PENDING;
  }

  protected normalizeOrderStatus(marketplaceStatus: string): string {
    const statusMap: Record<string, string> = {
      'new': OrderStatus.CREATED,
      'preparing': OrderStatus.PICKING,
      'ready_to_ship': OrderStatus.READY_TO_SHIP,
      'shipped': OrderStatus.SHIPPED,
      'delivered': OrderStatus.DELIVERED,
      'cancelled': OrderStatus.CANCELLED,
      'returned': OrderStatus.RETURNED
    };

    return statusMap[marketplaceStatus.toLowerCase()] || OrderStatus.CREATED;
  }
}
