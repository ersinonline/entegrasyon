/**
 * Store Management Routes
 */

import { Router } from 'express';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { Store, MarketplaceType } from '../types';
import { encryptCredentials } from '../utils/encryption';
import { createConnector } from '../connectors';
import { createLogger } from '../utils/logger';

const router = Router();
const db = getFirestore();
const logger = createLogger('StoresRouter');

/**
 * GET /api/stores
 * List all stores for a merchant
 */
router.get('/', async (req, res) => {
  try {
    const { merchantId } = req.query;

    if (!merchantId) {
      return res.status(400).json({ error: 'merchantId is required' });
    }

    const storesSnapshot = await db
      .collection('stores')
      .where('merchantId', '==', merchantId)
      .get();

    const stores = storesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    res.json({ stores });
  } catch (error: any) {
    logger.error('Failed to list stores', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/stores
 * Create a new store
 */
router.post('/', async (req, res) => {
  try {
    const {
      merchantId,
      marketplace,
      storeName,
      credentials,
      syncSettings
    } = req.body;

    // Validate
    if (!merchantId || !marketplace || !storeName || !credentials) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Encrypt credentials
    const encryptedCredentials = encryptCredentials(credentials);

    // Test credentials by creating connector
    try {
      const testConnector = createConnector(
        marketplace as MarketplaceType,
        'test',
        encryptedCredentials as any
      );

      const authResult = await testConnector.authenticate();

      if (!authResult) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }
    } catch (error: any) {
      return res.status(401).json({ error: `Credential validation failed: ${error.message}` });
    }

    // Create store
    const store: Omit<Store, 'id'> = {
      merchantId,
      marketplace: marketplace as MarketplaceType,
      storeName,
      credentials: encryptedCredentials as any,
      isActive: true,
      syncSettings: syncSettings || {
        autoSyncInventory: true,
        inventorySyncInterval: 30,
        autoSyncOrders: true,
        orderSyncInterval: 10,
        useWebhook: false
      },
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    };

    const storeRef = await db.collection('stores').add(store);

    logger.success(`Store created: ${storeRef.id}`, { marketplace, storeName });

    res.status(201).json({
      id: storeRef.id,
      ...store
    });
  } catch (error: any) {
    logger.error('Failed to create store', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/stores/:id
 * Update store
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // If credentials are being updated, encrypt them
    if (updates.credentials) {
      updates.credentials = encryptCredentials(updates.credentials);
    }

    updates.updatedAt = Timestamp.now();

    await db.collection('stores').doc(id).update(updates);

    logger.info(`Store updated: ${id}`);

    res.json({ success: true });
  } catch (error: any) {
    logger.error('Failed to update store', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/stores/:id
 * Delete store
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    await db.collection('stores').doc(id).delete();

    logger.info(`Store deleted: ${id}`);

    res.json({ success: true });
  } catch (error: any) {
    logger.error('Failed to delete store', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/stores/:id/test
 * Test store credentials
 */
router.post('/:id/test', async (req, res) => {
  try {
    const { id } = req.params;

    const storeDoc = await db.collection('stores').doc(id).get();

    if (!storeDoc.exists) {
      return res.status(404).json({ error: 'Store not found' });
    }

    const store = storeDoc.data() as Store;

    const connector = createConnector(
      store.marketplace,
      id,
      store.credentials
    );

    const authResult = await connector.authenticate();

    res.json({
      success: authResult,
      marketplace: store.marketplace
    });
  } catch (error: any) {
    logger.error('Failed to test store credentials', error);
    res.status(500).json({ error: error.message });
  }
});

export { router as storesRouter };
