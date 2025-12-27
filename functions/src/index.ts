/**
 * Firebase Cloud Functions Entry Point
 * Marketplace Integration Platform
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Initialize Firebase Admin
admin.initializeApp();

// Create Express app
const app = express();

// Middleware
app.use(cors({ origin: true }));
app.use(express.json());

// ============================================================================
// Import Routes
// ============================================================================

import { storesRouter } from './routes/stores';
import { productsRouter } from './routes/products';
import { ordersRouter } from './routes/orders';
import { inventoryRouter } from './routes/inventory';
import { shipmentsRouter } from './routes/shipments';
import { claimsRouter } from './routes/claims';
import { categoriesRouter } from './routes/categories';
import { syncRouter } from './routes/sync';

// ============================================================================
// Routes
// ============================================================================

app.use('/api/stores', storesRouter);
app.use('/api/products', productsRouter);
app.use('/api/orders', ordersRouter);
app.use('/api/inventory', inventoryRouter);
app.use('/api/shipments', shipmentsRouter);
app.use('/api/claims', claimsRouter);
app.use('/api/categories', categoriesRouter);
app.use('/api/sync', syncRouter);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ============================================================================
// Export Functions
// ============================================================================

// Main API
export const api = functions
  .region('europe-west1')
  .runWith({
    timeoutSeconds: 540,
    memory: '1GB'
  })
  .https.onRequest(app);

// ============================================================================
// Scheduled Functions
// ============================================================================

import { scheduledOrderSync } from './jobs/scheduled-order-sync';
import { scheduledInventorySync } from './jobs/scheduled-inventory-sync';

// Order sync - every 10 minutes
export const orderSync = functions
  .region('europe-west1')
  .pubsub.schedule('every 10 minutes')
  .onRun(scheduledOrderSync);

// Inventory sync - every 30 minutes
export const inventorySync = functions
  .region('europe-west1')
  .pubsub.schedule('every 30 minutes')
  .onRun(scheduledInventorySync);

// ============================================================================
// Firestore Triggers
// ============================================================================

import { onStoreCreated } from './triggers/on-store-created';
import { onProductUpdated } from './triggers/on-product-updated';

// When a new store is created, validate credentials
export const onStoreCreate = functions
  .region('europe-west1')
  .firestore.document('stores/{storeId}')
  .onCreate(onStoreCreated);

// When a product is updated, sync to marketplaces
export const onProductUpdate = functions
  .region('europe-west1')
  .firestore.document('products/{productId}')
  .onUpdate(onProductUpdated);
