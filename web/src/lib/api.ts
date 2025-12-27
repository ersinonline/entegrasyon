/**
 * API Client for Firebase Functions
 */

import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/teknotech-app/europe-west1/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Stores API
export const storesApi = {
  list: (merchantId: string) =>
    apiClient.get('/stores', { params: { merchantId } }),

  create: (data: any) =>
    apiClient.post('/stores', data),

  update: (id: string, data: any) =>
    apiClient.put(`/stores/${id}`, data),

  delete: (id: string) =>
    apiClient.delete(`/stores/${id}`),

  test: (id: string) =>
    apiClient.post(`/stores/${id}/test`)
};

// Products API
export const productsApi = {
  list: (merchantId: string) =>
    apiClient.get('/products', { params: { merchantId } }),

  sync: (productId: string, storeIds: string[]) =>
    apiClient.post(`/products/${productId}/sync`, { storeIds })
};

// Orders API
export const ordersApi = {
  list: (params: any) =>
    apiClient.get('/orders', { params }),

  sync: (storeId: string, startDate?: string, endDate?: string) =>
    apiClient.post('/orders/sync', { storeId, startDate, endDate })
};

// Inventory API
export const inventoryApi = {
  sync: (storeId: string, items: any[]) =>
    apiClient.post('/inventory/sync', { storeId, items }),

  checkStatus: (storeId: string, taskId: string) =>
    apiClient.get(`/inventory/status/${taskId}`, { params: { storeId } })
};

// Shipments API
export const shipmentsApi = {
  create: (data: any) =>
    apiClient.post('/shipments', data)
};

// Categories API
export const categoriesApi = {
  list: (storeId: string) =>
    apiClient.get('/categories', { params: { storeId } }),

  getAttributes: (storeId: string, categoryId: string) =>
    apiClient.get(`/categories/${categoryId}/attributes`, { params: { storeId } })
};

export default apiClient;
