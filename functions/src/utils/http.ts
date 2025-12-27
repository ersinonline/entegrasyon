/**
 * HTTP client wrapper with logging and retry
 */

import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import { MarketplaceType, MarketplaceError, AuthenticationError, RateLimitError } from '../types';
import { Logger } from './logger';
import { logIntegration } from './logger';
import { retry } from './retry';

export interface HttpClientOptions {
  baseURL: string;
  marketplace: MarketplaceType;
  storeId: string;
  timeout?: number;
  headers?: Record<string, string>;
  logger?: Logger;
}

/**
 * HTTP client with automatic logging and retry
 */
export class HttpClient {
  private client: AxiosInstance;
  private marketplace: MarketplaceType;
  private storeId: string;
  private logger: Logger;

  constructor(options: HttpClientOptions) {
    this.marketplace = options.marketplace;
    this.storeId = options.storeId;
    this.logger = options.logger || new Logger(`HttpClient:${options.marketplace}`);

    this.client = axios.create({
      baseURL: options.baseURL,
      timeout: options.timeout || 30000,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    });

    // Request interceptor
    this.client.interceptors.request.use(
      (config) => {
        config.headers['X-Request-Time'] = Date.now().toString();
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response) => response,
      (error) => this.handleError(error)
    );
  }

  /**
   * GET request
   */
  async get<T = any>(
    url: string,
    config?: AxiosRequestConfig,
    operation = 'GET'
  ): Promise<T> {
    return this.request<T>('GET', url, undefined, config, operation);
  }

  /**
   * POST request
   */
  async post<T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig,
    operation = 'POST'
  ): Promise<T> {
    return this.request<T>('POST', url, data, config, operation);
  }

  /**
   * PUT request
   */
  async put<T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig,
    operation = 'PUT'
  ): Promise<T> {
    return this.request<T>('PUT', url, data, config, operation);
  }

  /**
   * DELETE request
   */
  async delete<T = any>(
    url: string,
    config?: AxiosRequestConfig,
    operation = 'DELETE'
  ): Promise<T> {
    return this.request<T>('DELETE', url, undefined, config, operation);
  }

  /**
   * Generic request with logging and retry
   */
  private async request<T>(
    method: string,
    url: string,
    data?: any,
    config?: AxiosRequestConfig,
    operation = method
  ): Promise<T> {
    const startTime = Date.now();

    try {
      const response = await retry(
        async () => {
          return this.client.request<T>({
            method,
            url,
            data,
            ...config
          });
        },
        {
          maxAttempts: 3,
          initialDelay: 2000,
          retryableErrors: ['ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND', '5'],
          onRetry: (attempt, error) => {
            this.logger.warn(`Retry attempt ${attempt} for ${method} ${url}`, {
              error: error.message
            });
          }
        },
        this.logger
      );

      const duration = Date.now() - startTime;

      // Log success
      await logIntegration({
        storeId: this.storeId,
        marketplace: this.marketplace,
        operation,
        method,
        endpoint: url,
        requestPayload: data,
        responsePayload: response.data,
        statusCode: response.status,
        success: true,
        duration
      });

      return response.data;
    } catch (error) {
      const duration = Date.now() - startTime;
      const axiosError = error as AxiosError;

      // Log failure
      await logIntegration({
        storeId: this.storeId,
        marketplace: this.marketplace,
        operation,
        method,
        endpoint: url,
        requestPayload: data,
        responsePayload: axiosError.response?.data,
        statusCode: axiosError.response?.status,
        success: false,
        errorMessage: axiosError.message,
        errorStack: axiosError.stack,
        duration
      });

      throw error;
    }
  }

  /**
   * Handle and transform errors
   */
  private handleError(error: AxiosError): Promise<never> {
    if (!error.response) {
      // Network error
      return Promise.reject(
        new MarketplaceError(
          `Network error: ${error.message}`,
          this.marketplace,
          undefined,
          error
        )
      );
    }

    const { status, data } = error.response;

    // 401 - Authentication error
    if (status === 401) {
      return Promise.reject(
        new AuthenticationError(this.marketplace, data)
      );
    }

    // 429 - Rate limit
    if (status === 429) {
      const retryAfter = parseInt(
        error.response.headers['retry-after'] || '60'
      );
      return Promise.reject(
        new RateLimitError(this.marketplace, retryAfter, data)
      );
    }

    // Other errors
    return Promise.reject(
      new MarketplaceError(
        `HTTP ${status}: ${JSON.stringify(data)}`,
        this.marketplace,
        status,
        data
      )
    );
  }

  /**
   * Get raw axios instance (for special cases)
   */
  getRawClient(): AxiosInstance {
    return this.client;
  }
}
