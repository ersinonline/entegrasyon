/**
 * Firestore Trigger: On Product Updated
 * Optionally sync inventory when product stock/price changes
 */

import { Change, QueryDocumentSnapshot } from 'firebase-admin/firestore';
import { getFirestore } from 'firebase-admin/firestore';
import { getConnectorForStore } from '../connectors';
import { createLogger } from '../utils/logger';

const db = getFirestore();
const logger = createLogger('OnProductUpdated');

export async function onProductUpdated(change: Change<QueryDocumentSnapshot>) {
  const before = change.before.data();
  const after = change.after.data();
  const productId = change.after.id;

  try {
    // Check if quantity or price changed
    const quantityChanged = before.quantity !== after.quantity;
    const priceChanged = before.salePrice !== after.salePrice || before.listPrice !== after.listPrice;

    if (!quantityChanged && !priceChanged) {
      return; // No relevant changes
    }

    logger.info(`Product ${productId} updated`, {
      quantityChanged,
      priceChanged
    });

    // Get product mappings
    const mappingsSnapshot = await db.collection('productMappings')
      .where('productId', '==', productId)
      .where('status', '==', 'active')
      .get();

    if (mappingsSnapshot.empty) {
      logger.info(`Product ${productId}: No active mappings`);
      return;
    }

    // Update inventory for each mapped store
    for (const mappingDoc of mappingsSnapshot.docs) {
      const mapping = mappingDoc.data();

      try {
        // Check if store has auto-sync enabled
        const storeDoc = await db.collection('stores').doc(mapping.storeId).get();
        const store = storeDoc.data();

        if (!store?.syncSettings?.autoSyncInventory) {
          continue;
        }

        const connector = await getConnectorForStore(mapping.storeId);

        const result = await connector.updateInventory([{
          sku: after.sku,
          quantity: after.quantity,
          listPrice: after.listPrice,
          salePrice: after.salePrice
        }]);

        if (result.success) {
          logger.success(`Product ${productId} synced to store ${mapping.storeId}`);
        } else {
          logger.error(`Failed to sync product ${productId} to store ${mapping.storeId}`, {
            error: result.error
          });
        }

      } catch (error) {
        logger.error(`Error syncing product ${productId} to store ${mapping.storeId}`, error);
      }
    }

  } catch (error) {
    logger.error(`Error processing product update for ${productId}`, error);
  }
}
