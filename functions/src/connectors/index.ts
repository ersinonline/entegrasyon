/**
 * Connector Factory
 * Creates appropriate marketplace connector based on type
 */

import { MarketplaceType, StoreCredentials } from '../types';
import { BaseConnector } from './base-connector';
import { N11Connector } from './n11/n11-connector';
import { TrendyolConnector } from './trendyol/trendyol-connector';
import { HepsiburadaConnector } from './hepsiburada/hepsiburada-connector';
import { PazaramaConnector } from './pazarama/pazarama-connector';
import { IdefixConnector } from './idefix/idefix-connector';

/**
 * Create a marketplace connector instance
 */
export function createConnector(
  marketplace: MarketplaceType,
  storeId: string,
  credentials: StoreCredentials
): BaseConnector {
  switch (marketplace) {
    case MarketplaceType.N11:
      return new N11Connector(storeId, credentials);

    case MarketplaceType.TRENDYOL:
      return new TrendyolConnector(storeId, credentials);

    case MarketplaceType.HEPSIBURADA:
      return new HepsiburadaConnector(storeId, credentials);

    case MarketplaceType.PAZARAMA:
      return new PazaramaConnector(storeId, credentials);

    case MarketplaceType.IDEFIX:
      return new IdefixConnector(storeId, credentials);

    default:
      throw new Error(`Unknown marketplace type: ${marketplace}`);
  }
}

/**
 * Get connector for a store
 * Fetches credentials from Firestore and creates connector
 */
export async function getConnectorForStore(storeId: string): Promise<BaseConnector> {
  const { getFirestore } = await import('firebase-admin/firestore');
  const db = getFirestore();

  const storeDoc = await db.collection('stores').doc(storeId).get();

  if (!storeDoc.exists) {
    throw new Error(`Store not found: ${storeId}`);
  }

  const store = storeDoc.data()!;

  if (!store.isActive) {
    throw new Error(`Store is not active: ${storeId}`);
  }

  return createConnector(
    store.marketplace,
    storeId,
    store.credentials
  );
}

// Export all connectors
export {
  BaseConnector,
  N11Connector,
  TrendyolConnector,
  HepsiburadaConnector,
  PazaramaConnector,
  IdefixConnector
};

// Export types
export * from '../types';
