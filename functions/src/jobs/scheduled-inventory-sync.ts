/**
 * Scheduled Inventory Sync Job
 * Runs every 30 minutes
 */

import { getFirestore } from 'firebase-admin/firestore';
import { getConnectorForStore } from '../connectors';
import { createLogger } from '../utils/logger';

const db = getFirestore();
const logger = createLogger('ScheduledInventorySync');

export async function scheduledInventorySync() {
  try {
    logger.info('Starting scheduled inventory sync');

    // Get all active stores with autoSyncInventory enabled
    const storesSnapshot = await db.collection('stores')
      .where('isActive', '==', true)
      .where('syncSettings.autoSyncInventory', '==', true)
      .get();

    logger.info(`Found ${storesSnapshot.size} stores to sync`);

    for (const storeDoc of storesSnapshot.docs) {
      const storeId = storeDoc.id;
      const store = storeDoc.data();

      try {
        // Get products for this merchant
        const productsSnapshot = await db.collection('products')
          .where('merchantId', '==', store.merchantId)
          .where('isActive', '==', true)
          .get();

        if (productsSnapshot.empty) {
          logger.info(`Store ${storeId}: No products to sync`);
          continue;
        }

        // Get product mappings for this store
        const mappingsSnapshot = await db.collection('productMappings')
          .where('storeId', '==', storeId)
          .where('status', '==', 'active')
          .get();

        const mappingsMap = new Map();
        mappingsSnapshot.docs.forEach(doc => {
          const mapping = doc.data();
          mappingsMap.set(mapping.productId, mapping);
        });

        // Build inventory update items
        const items = productsSnapshot.docs
          .filter(doc => mappingsMap.has(doc.id))
          .map(doc => {
            const product = doc.data();
            return {
              sku: product.sku,
              quantity: product.quantity,
              listPrice: product.listPrice,
              salePrice: product.salePrice
            };
          });

        if (items.length === 0) {
          logger.info(`Store ${storeId}: No mapped products to sync`);
          continue;
        }

        const connector = await getConnectorForStore(storeId);

        const result = await connector.updateInventory(items);

        if (result.success) {
          logger.success(`Store ${storeId}: Updated ${items.length} items`, {
            taskId: result.taskId
          });
        } else {
          logger.error(`Store ${storeId}: Inventory sync failed`, { error: result.error });
        }

      } catch (error) {
        logger.error(`Failed to sync inventory for store ${storeId}`, error);
      }
    }

    logger.success('Scheduled inventory sync completed');
  } catch (error) {
    logger.error('Scheduled inventory sync failed', error);
  }
}
