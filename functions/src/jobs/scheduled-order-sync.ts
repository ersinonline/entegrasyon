/**
 * Scheduled Order Sync Job
 * Runs every 10 minutes
 */

import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { getConnectorForStore } from '../connectors';
import { createLogger } from '../utils/logger';

const db = getFirestore();
const logger = createLogger('ScheduledOrderSync');

export async function scheduledOrderSync() {
  try {
    logger.info('Starting scheduled order sync');

    // Get all active stores with autoSyncOrders enabled
    const storesSnapshot = await db.collection('stores')
      .where('isActive', '==', true)
      .where('syncSettings.autoSyncOrders', '==', true)
      .get();

    logger.info(`Found ${storesSnapshot.size} stores to sync`);

    for (const storeDoc of storesSnapshot.docs) {
      const storeId = storeDoc.id;
      const store = storeDoc.data();

      try {
        // Get last sync time
        const lastSyncAt = store.lastSyncAt?.toDate() || new Date(Date.now() - 24 * 60 * 60 * 1000);

        // Add 10-minute overlap to avoid missing orders
        const startDate = new Date(lastSyncAt.getTime() - 10 * 60 * 1000);
        const endDate = new Date();

        const connector = await getConnectorForStore(storeId);

        const orders = await connector.getOrders({
          startDate,
          endDate
        });

        logger.info(`Store ${storeId}: Retrieved ${orders.length} orders`);

        // Save orders
        const batch = db.batch();
        let newCount = 0;

        for (const order of orders) {
          const existing = await db.collection('orders')
            .where('storeId', '==', storeId)
            .where('marketplaceOrderNumber', '==', order.marketplaceOrderNumber)
            .get();

          if (existing.empty) {
            const orderRef = db.collection('orders').doc();
            batch.set(orderRef, {
              ...order,
              storeId,
              merchantId: store.merchantId,
              marketplace: store.marketplace,
              createdAt: Timestamp.now(),
              updatedAt: Timestamp.now()
            });
            newCount++;
          } else {
            // Update existing order
            const orderRef = existing.docs[0].ref;
            batch.update(orderRef, {
              ...order,
              updatedAt: Timestamp.now()
            });
          }
        }

        await batch.commit();

        // Update last sync time
        await db.collection('stores').doc(storeId).update({
          lastSyncAt: Timestamp.now()
        });

        logger.success(`Store ${storeId}: Saved ${newCount} new orders, updated ${orders.length - newCount}`);

      } catch (error) {
        logger.error(`Failed to sync orders for store ${storeId}`, error);
      }
    }

    logger.success('Scheduled order sync completed');
  } catch (error) {
    logger.error('Scheduled order sync failed', error);
  }
}
