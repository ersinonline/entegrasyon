/**
 * n11 Marketplace Connector
 * API Docs: https://api.n11.com/
 * Uses both REST and SOAP APIs
 */

import soap from 'soap';
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

const N11_API_BASE = process.env.N11_API_BASE_URL || 'https://api.n11.com';
const N11_REST_BASE = `${N11_API_BASE}/ms/product`;
const N11_DELIVERY_BASE = `${N11_API_BASE}/rest/delivery/v1`;

// SOAP WSDL URLs
const CATEGORY_WSDL = `${N11_API_BASE}/ws/CategoryService.wsdl`;
const PRODUCT_WSDL = `${N11_API_BASE}/ws/ProductService.wsdl`;

export class N11Connector extends BaseConnector {
  private appKey: string;
  private appSecret: string;

  constructor(storeId: string, credentials: StoreCredentials) {
    super(MarketplaceType.N11, storeId, credentials);

    this.appKey = this.credentials.appKey || '';
    this.appSecret = this.credentials.appSecret || '';

    if (!this.appKey || !this.appSecret) {
      throw new Error('n11 appKey and appSecret are required');
    }

    this.initializeHttpClient();
  }

  protected initializeHttpClient(): void {
    this.http = new HttpClient({
      baseURL: N11_API_BASE,
      marketplace: this.marketplace,
      storeId: this.storeId,
      headers: {
        'appkey': this.appKey,
        'appsecret': this.appSecret
      },
      logger: this.logger
    });
  }

  async authenticate(): Promise<boolean> {
    try {
      // Test with a simple API call
      await this.getCategories();
      this.logger.success('n11 authentication successful');
      return true;
    } catch (error) {
      this.logger.error('n11 authentication failed', error);
      return false;
    }
  }

  // =========================================================================
  // CATEGORIES (SOAP)
  // =========================================================================

  async getCategories(): Promise<Category[]> {
    try {
      const client = await soap.createClientAsync(CATEGORY_WSDL);

      const auth = {
        appKey: this.appKey,
        appSecret: this.appSecret
      };

      const [result] = await client.GetTopLevelCategoriesAsync({ auth });

      const categories: Category[] = [];
      const categoryList = result?.categoryList?.category || [];

      for (const cat of categoryList) {
        categories.push({
          id: cat.id.toString(),
          name: cat.name,
          level: 0
        });

        // Get subcategories
        const subCategories = await this.getSubCategories(cat.id);
        categories.push(...subCategories);
      }

      this.logger.info(`Retrieved ${categories.length} categories`);
      return categories;
    } catch (error) {
      this.logger.error('Failed to get categories', error);
      throw error;
    }
  }

  private async getSubCategories(parentId: number, level = 1): Promise<Category[]> {
    try {
      const client = await soap.createClientAsync(CATEGORY_WSDL);

      const auth = {
        appKey: this.appKey,
        appSecret: this.appSecret
      };

      const [result] = await client.GetSubCategoriesAsync({
        auth,
        categoryId: parentId
      });

      const categories: Category[] = [];
      const categoryList = result?.categoryList?.category || [];

      for (const cat of categoryList) {
        categories.push({
          id: cat.id.toString(),
          name: cat.name,
          parentId: parentId.toString(),
          level
        });

        // Recursively get subcategories (max 3 levels)
        if (level < 3 && cat.subCategoryExists) {
          const subCategories = await this.getSubCategories(cat.id, level + 1);
          categories.push(...subCategories);
        }
      }

      return categories;
    } catch (error) {
      this.logger.error(`Failed to get subcategories for ${parentId}`, error);
      return [];
    }
  }

  async getCategoryAttributes(categoryId: string): Promise<CategoryAttribute[]> {
    try {
      const client = await soap.createClientAsync(CATEGORY_WSDL);

      const auth = {
        appKey: this.appKey,
        appSecret: this.appSecret
      };

      const [result] = await client.GetCategoryAttributesAsync({
        auth,
        categoryId: parseInt(categoryId)
      });

      const attributes: CategoryAttribute[] = [];
      const attributeList = result?.categoryAttributeList?.categoryAttribute || [];

      for (const attr of attributeList) {
        attributes.push({
          id: attr.id.toString(),
          name: attr.name,
          type: this.mapAttributeType(attr.valueType),
          required: attr.mandatory || false,
          options: attr.valueList?.value || []
        });
      }

      return attributes;
    } catch (error) {
      this.logger.error(`Failed to get category attributes for ${categoryId}`, error);
      throw error;
    }
  }

  private mapAttributeType(valueType: string): 'text' | 'number' | 'select' | 'multiselect' | 'boolean' {
    switch (valueType?.toLowerCase()) {
      case 'list':
        return 'select';
      case 'multilist':
        return 'multiselect';
      case 'number':
        return 'number';
      case 'bool':
        return 'boolean';
      default:
        return 'text';
    }
  }

  // =========================================================================
  // PRODUCTS (REST)
  // =========================================================================

  async createProduct(product: MarketplaceProduct): Promise<{
    success: boolean;
    productId?: string;
    error?: string;
  }> {
    try {
      const payload = {
        product: {
          productSellerCode: product.sku,
          title: product.title,
          description: product.description,
          brand: product.brand,
          barcode: product.barcode,
          categoryId: parseInt(product.categoryId),
          images: product.images.map(url => ({ url })),
          attributes: product.attributes.map(attr => ({
            name: attr.name,
            value: attr.value
          })),
          stockItems: {
            stockItem: [{
              sellerStockCode: product.sku,
              quantity: product.quantity,
              listPrice: this.formatPrice(product.listPrice),
              salePrice: this.formatPrice(product.salePrice),
              bundle: false
            }]
          },
          shipmentTemplate: product.shipmentTemplate || 'Default'
        }
      };

      const response = await this.http!.post(
        '/ms/product/tasks/product-create',
        payload,
        {},
        'createProduct'
      );

      if (response.result?.status === 'success') {
        return {
          success: true,
          productId: response.result.productId
        };
      }

      return {
        success: false,
        error: response.result?.errorMessage || 'Unknown error'
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
        product: {
          id: productId,
          ...product.sku && { productSellerCode: product.sku },
          ...product.title && { title: product.title },
          ...product.description && { description: product.description },
          ...product.images && { images: product.images.map(url => ({ url })) }
        }
      };

      const response = await this.http!.post(
        '/ms/product/tasks/product-update',
        payload,
        {},
        'updateProduct'
      );

      return {
        success: response.result?.status === 'success',
        error: response.result?.errorMessage
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
    // n11 doesn't have a direct GET product endpoint in REST
    // Would need to use SOAP ProductService
    this.logger.warn('getProduct not fully implemented for n11');
    return null;
  }

  async updateInventory(items: InventoryUpdate[]): Promise<{
    success: boolean;
    taskId?: string;
    error?: string;
  }> {
    try {
      // n11 max 1000 items per request
      const chunks = this.chunkArray(items, 1000);
      const results: boolean[] = [];

      for (const chunk of chunks) {
        const payload = {
          stockItems: chunk.map(item => ({
            sellerStockCode: item.sku,
            quantity: item.quantity,
            ...item.listPrice && { listPrice: this.formatPrice(item.listPrice) },
            ...item.salePrice && { salePrice: this.formatPrice(item.salePrice) }
          }))
        };

        const response = await this.http!.post(
          '/ms/product/tasks/price-stock-update',
          payload,
          {},
          'updateInventory'
        );

        results.push(response.result?.status === 'success');
      }

      const allSuccess = results.every(r => r);

      return {
        success: allSuccess,
        error: allSuccess ? undefined : 'Some chunks failed'
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
  // ORDERS (REST)
  // =========================================================================

  async getOrders(params: OrderQueryParams): Promise<MarketplaceOrder[]> {
    try {
      const queryParams = new URLSearchParams({
        ...params.startDate && { startDate: this.formatDate(params.startDate) },
        ...params.endDate && { endDate: this.formatDate(params.endDate) },
        ...params.status && { status: params.status },
        page: (params.page || 0).toString(),
        size: (params.size || 100).toString()
      });

      const response = await this.http!.get(
        `${N11_DELIVERY_BASE}/shipmentPackages?${queryParams}`,
        {},
        'getOrders'
      );

      const packages = response.shipmentPackages || [];
      const orders: MarketplaceOrder[] = [];

      for (const pkg of packages) {
        orders.push({
          marketplaceOrderNumber: pkg.orderNumber,
          packageNumber: pkg.id,
          status: this.normalizeOrderStatus(pkg.shipmentPackageStatus),
          buyer: {
            name: pkg.recipientName,
            email: pkg.buyerEmail || '',
            phone: pkg.recipientGsm || ''
          },
          shippingAddress: {
            fullName: pkg.recipientName,
            addressLine1: pkg.recipientAddress,
            district: pkg.recipientDistrict,
            city: pkg.recipientCity,
            postalCode: pkg.recipientPostalCode,
            country: 'TR',
            phone: pkg.recipientGsm
          },
          billingAddress: {
            fullName: pkg.invoiceName || pkg.recipientName,
            addressLine1: pkg.invoiceAddress || pkg.recipientAddress,
            district: pkg.invoiceDistrict || pkg.recipientDistrict,
            city: pkg.invoiceCity || pkg.recipientCity,
            postalCode: pkg.invoicePostalCode || pkg.recipientPostalCode,
            country: 'TR',
            phone: pkg.invoiceGsm || pkg.recipientGsm
          },
          lines: (pkg.items || []).map((item: any) => ({
            id: item.id,
            sku: item.sellerStockCode,
            title: item.productName,
            barcode: item.barcode,
            quantity: item.quantity,
            price: parseFloat(item.price),
            totalPrice: parseFloat(item.totalPrice),
            vatRate: parseFloat(item.vatRate || '0')
          })),
          totalAmount: parseFloat(pkg.totalAmount),
          currency: 'TRY',
          orderDate: new Date(pkg.orderDate)
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
    const orders = await this.getOrders({ });
    return orders.find(o => o.marketplaceOrderNumber === orderNumber) || null;
  }

  async updateOrderStatus(orderNumber: string, status: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    // n11 status updates are typically done via shipment creation
    this.logger.warn('updateOrderStatus should be done via createShipment for n11');
    return {
      success: false,
      error: 'Use createShipment instead'
    };
  }

  async createShipment(shipment: ShipmentUpdate): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      const payload = {
        packageNumber: shipment.packageNumber,
        trackingNumber: shipment.trackingNumber,
        shipmentCompanyName: shipment.cargoCompany,
        shipmentDate: this.formatDate(shipment.shipmentDate)
      };

      const response = await this.http!.post(
        `${N11_DELIVERY_BASE}/shipments`,
        payload,
        {},
        'createShipment'
      );

      return {
        success: response.success || false,
        error: response.errorMessage
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
      'Preparing': OrderStatus.PICKING,
      'Shipped': OrderStatus.SHIPPED,
      'Delivered': OrderStatus.DELIVERED,
      'Cancelled': OrderStatus.CANCELLED,
      'Returned': OrderStatus.RETURNED
    };

    return statusMap[marketplaceStatus] || OrderStatus.CREATED;
  }
}
