/**
 * Trendyol Marketplace Connector
 * API Docs: https://api.trendyol.com/sapigw
 * Uses Basic Auth with supplierId
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
  OrderStatus,
  Brand
} from '../../types';
import { HttpClient } from '../../utils/http';

const TRENDYOL_API_BASE = process.env.TRENDYOL_API_BASE_URL || 'https://api.trendyol.com/sapigw';

export class TrendyolConnector extends BaseConnector {
  private supplierId: string;
  private username: string;
  private password: string;

  constructor(storeId: string, credentials: StoreCredentials) {
    super(MarketplaceType.TRENDYOL, storeId, credentials);

    this.supplierId = this.credentials.supplierId || '';
    this.username = this.credentials.username || '';
    this.password = this.credentials.password || '';

    if (!this.supplierId || !this.username || !this.password) {
      throw new Error('Trendyol supplierId, username, and password are required');
    }

    this.initializeHttpClient();
  }

  protected initializeHttpClient(): void {
    const basicAuth = Buffer.from(`${this.username}:${this.password}`).toString('base64');

    this.http = new HttpClient({
      baseURL: TRENDYOL_API_BASE,
      marketplace: this.marketplace,
      storeId: this.storeId,
      headers: {
        'Authorization': `Basic ${basicAuth}`,
        'User-Agent': 'TeknoTech-Integration/1.0'
      },
      logger: this.logger
    });
  }

  async authenticate(): Promise<boolean> {
    try {
      // Test with supplier addresses endpoint
      await this.http!.get(
        `/suppliers/${this.supplierId}/addresses`,
        {},
        'authenticate'
      );
      this.logger.success('Trendyol authentication successful');
      return true;
    } catch (error) {
      this.logger.error('Trendyol authentication failed', error);
      return false;
    }
  }

  // =========================================================================
  // CATEGORIES
  // =========================================================================

  async getCategories(): Promise<Category[]> {
    try {
      const response = await this.http!.get(
        '/product-categories',
        {},
        'getCategories'
      );

      const categories: Category[] = [];
      const categoryTree = response.categories || [];

      const flattenCategories = (cats: any[], level = 0, parentId?: string) => {
        for (const cat of cats) {
          categories.push({
            id: cat.id.toString(),
            name: cat.name,
            parentId,
            level
          });

          if (cat.subCategories && cat.subCategories.length > 0) {
            flattenCategories(cat.subCategories, level + 1, cat.id.toString());
          }
        }
      };

      flattenCategories(categoryTree);

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
        `/product-categories/${categoryId}/attributes`,
        {},
        'getCategoryAttributes'
      );

      const attributes: CategoryAttribute[] = [];
      const attrList = response.categoryAttributes || [];

      for (const attr of attrList) {
        attributes.push({
          id: attr.attribute.id.toString(),
          name: attr.attribute.name,
          type: attr.attributeValueType === 'FREE_TEXT' ? 'text' : 'select',
          required: attr.required || false,
          options: (attr.attributeValues || []).map((v: any) => v.name)
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
        '/brands',
        {},
        'getBrands'
      );

      return (response.brands || []).map((b: any) => ({
        id: b.id.toString(),
        name: b.name
      }));
    } catch (error) {
      this.logger.error('Failed to get brands', error);
      throw error;
    }
  }

  // =========================================================================
  // PRODUCTS
  // =========================================================================

  async createProduct(product: MarketplaceProduct): Promise<{
    success: boolean;
    productId?: string;
    error?: string;
  }> {
    try {
      const payload = {
        items: [{
          barcode: product.barcode,
          title: product.title,
          productMainId: product.sku,
          brandId: parseInt(product.brand) || 0,
          categoryId: parseInt(product.categoryId),
          quantity: product.quantity,
          stockCode: product.sku,
          dimensionalWeight: 1,
          description: product.description,
          currencyType: product.currency || 'TRY',
          listPrice: product.listPrice,
          salePrice: product.salePrice,
          vatRate: product.vatRate || 18,
          cargoCompanyId: 10, // Default cargo
          images: product.images.map(url => ({ url })),
          attributes: product.attributes.map(attr => ({
            attributeName: attr.name,
            attributeValue: attr.value
          }))
        }]
      };

      const response = await this.http!.post(
        `/suppliers/${this.supplierId}/products`,
        payload,
        {},
        'createProduct'
      );

      if (response.batchRequestId) {
        return {
          success: true,
          productId: response.batchRequestId
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
        items: [{
          barcode: productId,
          ...product.quantity !== undefined && { quantity: product.quantity },
          ...product.listPrice && { listPrice: product.listPrice },
          ...product.salePrice && { salePrice: product.salePrice }
        }]
      };

      const response = await this.http!.post(
        `/suppliers/${this.supplierId}/products/price-and-inventory`,
        payload,
        {},
        'updateProduct'
      );

      return {
        success: response.batchRequestId !== undefined,
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
        `/suppliers/${this.supplierId}/products?barcode=${productId}`,
        {},
        'getProduct'
      );

      const item = response.content?.[0];
      if (!item) return null;

      return {
        sku: item.stockCode,
        title: item.title,
        description: item.description,
        brand: item.brandId?.toString() || '',
        barcode: item.barcode,
        categoryId: item.categoryId?.toString() || '',
        images: (item.images || []).map((img: any) => img.url),
        attributes: (item.attributes || []).map((attr: any) => ({
          name: attr.attributeName,
          value: attr.attributeValue
        })),
        variants: [],
        listPrice: item.listPrice,
        salePrice: item.salePrice,
        quantity: item.quantity,
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
      // Trendyol max 1000 items per request
      const chunks = this.chunkArray(items, 1000);
      const taskIds: string[] = [];

      for (const chunk of chunks) {
        const payload = {
          items: chunk.map(item => ({
            barcode: item.sku,
            quantity: item.quantity,
            ...item.listPrice && { listPrice: item.listPrice },
            ...item.salePrice && { salePrice: item.salePrice }
          }))
        };

        const response = await this.http!.post(
          `/suppliers/${this.supplierId}/products/price-and-inventory`,
          payload,
          {},
          'updateInventory'
        );

        if (response.batchRequestId) {
          taskIds.push(response.batchRequestId);
        }
      }

      return {
        success: taskIds.length > 0,
        taskId: taskIds.join(','),
        error: taskIds.length === 0 ? 'No batch request ID received' : undefined
      };
    } catch (error: any) {
      this.logger.error('Failed to update inventory', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // =========================================================================
  // ORDERS
  // =========================================================================

  async getOrders(params: OrderQueryParams): Promise<MarketplaceOrder[]> {
    try {
      const queryParams = new URLSearchParams({
        ...params.startDate && { startDate: params.startDate.getTime().toString() },
        ...params.endDate && { endDate: params.endDate.getTime().toString() },
        ...params.status && { status: params.status },
        page: (params.page || 0).toString(),
        size: (params.size || 200).toString()
      });

      const response = await this.http!.get(
        `/suppliers/${this.supplierId}/orders?${queryParams}`,
        {},
        'getOrders'
      );

      const ordersList = response.content || [];
      const orders: MarketplaceOrder[] = [];

      for (const order of ordersList) {
        orders.push({
          marketplaceOrderNumber: order.orderNumber,
          packageNumber: order.packageNumber,
          status: this.normalizeOrderStatus(order.status),
          buyer: {
            name: order.customerFirstName + ' ' + order.customerLastName,
            email: order.customerEmail || '',
            phone: order.customerPhone || ''
          },
          shippingAddress: {
            fullName: order.shipmentAddress?.fullName || '',
            addressLine1: order.shipmentAddress?.address1 || '',
            addressLine2: order.shipmentAddress?.address2,
            district: order.shipmentAddress?.district || '',
            city: order.shipmentAddress?.city || '',
            postalCode: order.shipmentAddress?.postalCode,
            country: 'TR',
            phone: order.shipmentAddress?.phone || ''
          },
          billingAddress: {
            fullName: order.invoiceAddress?.fullName || '',
            addressLine1: order.invoiceAddress?.address1 || '',
            addressLine2: order.invoiceAddress?.address2,
            district: order.invoiceAddress?.district || '',
            city: order.invoiceAddress?.city || '',
            postalCode: order.invoiceAddress?.postalCode,
            country: 'TR',
            phone: order.invoiceAddress?.phone || ''
          },
          lines: (order.lines || []).map((line: any) => ({
            id: line.id,
            sku: line.merchantSku,
            title: line.productName,
            barcode: line.barcode,
            quantity: line.quantity,
            price: line.price,
            totalPrice: line.amount,
            vatRate: line.vatBaseAmount || 0
          })),
          totalAmount: order.totalPrice,
          currency: order.currencyCode || 'TRY',
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
      const response = await this.http!.post(
        `/suppliers/${this.supplierId}/orders/${orderNumber}/status`,
        { status },
        {},
        'updateOrderStatus'
      );

      return {
        success: true
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
      const payload = {
        orderNumber: shipment.orderNumber,
        trackingNumber: shipment.trackingNumber
      };

      const response = await this.http!.post(
        `/suppliers/${this.supplierId}/orders/shipment-packages`,
        payload,
        {},
        'createShipment'
      );

      return {
        success: true
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
      'Created': OrderStatus.CREATED,
      'Picking': OrderStatus.PICKING,
      'Shipped': OrderStatus.SHIPPED,
      'Delivered': OrderStatus.DELIVERED,
      'Cancelled': OrderStatus.CANCELLED,
      'Returned': OrderStatus.RETURNED
    };

    return statusMap[marketplaceStatus] || OrderStatus.CREATED;
  }
}
