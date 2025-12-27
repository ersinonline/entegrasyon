/**
 * Logger utility with Firestore integration
 */

import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { IntegrationLog, MarketplaceType, JobType } from '../types';
import { maskSensitiveData } from './encryption';

const db = getFirestore();

export interface LogData {
  storeId: string;
  marketplace: MarketplaceType;
  operation: string;
  jobType?: JobType;
  method: string;
  endpoint: string;
  requestPayload?: any;
  responsePayload?: any;
  statusCode?: number;
  success: boolean;
  errorMessage?: string;
  errorStack?: string;
  duration: number;
}

/**
 * Log integration request/response to Firestore
 */
export async function logIntegration(data: LogData): Promise<void> {
  try {
    const log: Omit<IntegrationLog, 'id'> = {
      storeId: data.storeId,
      marketplace: data.marketplace,
      operation: data.operation,
      jobType: data.jobType,
      method: data.method,
      endpoint: data.endpoint,
      requestPayload: maskSensitiveData(data.requestPayload),
      responsePayload: data.responsePayload,
      statusCode: data.statusCode,
      success: data.success,
      errorMessage: data.errorMessage,
      errorStack: data.errorStack,
      duration: data.duration,
      timestamp: Timestamp.now()
    };

    await db.collection('integrationLogs').add(log);
  } catch (error) {
    console.error('Failed to log integration:', error);
    // Don't throw - logging failure shouldn't break the main flow
  }
}

/**
 * Console logger with timestamps
 */
export class Logger {
  private context: string;

  constructor(context: string) {
    this.context = context;
  }

  private formatMessage(level: string, message: string, meta?: any): string {
    const timestamp = new Date().toISOString();
    const metaStr = meta ? `\n${JSON.stringify(meta, null, 2)}` : '';
    return `[${timestamp}] [${level}] [${this.context}] ${message}${metaStr}`;
  }

  info(message: string, meta?: any): void {
    console.log(this.formatMessage('INFO', message, meta));
  }

  warn(message: string, meta?: any): void {
    console.warn(this.formatMessage('WARN', message, meta));
  }

  error(message: string, error?: any): void {
    const errorMeta = error instanceof Error
      ? { message: error.message, stack: error.stack }
      : error;
    console.error(this.formatMessage('ERROR', message, errorMeta));
  }

  debug(message: string, meta?: any): void {
    if (process.env.NODE_ENV === 'development') {
      console.debug(this.formatMessage('DEBUG', message, meta));
    }
  }

  success(message: string, meta?: any): void {
    console.log(this.formatMessage('SUCCESS', message, meta));
  }
}

/**
 * Create a logger instance for a specific context
 */
export function createLogger(context: string): Logger {
  return new Logger(context);
}
