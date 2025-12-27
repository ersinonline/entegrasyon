/**
 * Firestore Trigger: On Store Created
 * Validates credentials when a new store is added
 */

import { QueryDocumentSnapshot } from 'firebase-admin/firestore';
import { createConnector } from '../connectors';
import { createLogger } from '../utils/logger';

const logger = createLogger('OnStoreCreated');

export async function onStoreCreated(snapshot: QueryDocumentSnapshot) {
  const storeId = snapshot.id;
  const store = snapshot.data();

  try {
    logger.info(`New store created: ${storeId}`, {
      marketplace: store.marketplace,
      storeName: store.storeName
    });

    // Test credentials
    const connector = createConnector(
      store.marketplace,
      storeId,
      store.credentials
    );

    const authResult = await connector.authenticate();

    if (!authResult) {
      logger.warn(`Store ${storeId}: Credential validation failed`);

      // Mark store as inactive
      await snapshot.ref.update({
        isActive: false,
        validationError: 'Credential validation failed'
      });
    } else {
      logger.success(`Store ${storeId}: Credentials validated successfully`);
    }

  } catch (error) {
    logger.error(`Error validating store ${storeId}`, error);

    await snapshot.ref.update({
      isActive: false,
      validationError: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
