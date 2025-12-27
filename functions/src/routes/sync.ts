/**
 * Sync Routes - Manual sync triggers
 */

import { Router } from 'express';
import { getFirestore } from 'firebase-admin/firestore';
import { getConnectorForStore } from '../connectors';

const router = Router();
const db = getFirestore();

// POST /api/sync/orders - Trigger order sync for a store
router.post('/orders', async (req, res) => {
  try {
    const { storeId } = req.body;

    const connector = await getConnectorForStore(storeId);

    const orders = await connector.getOrders({});

    // Save to Firestore (simplified)
    let newCount = 0;
    for (const order of orders) {
      const existing = await db.collection('orders')
        .where('storeId', '==', storeId)
        .where('marketplaceOrderNumber', '==', order.marketplaceOrderNumber)
        .get();

      if (existing.empty) {
        await db.collection('orders').add({
          ...order,
          storeId
        });
        newCount++;
      }
    }

    res.json({ success: true, total: orders.length, new: newCount });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/sync/inventory - Trigger inventory sync
router.post('/inventory', async (req, res) => {
  try {
    const { storeId, productIds } = req.body;

    // Get products
    const productsSnapshot = await db.collection('products')
      .where(admin.firestore.FieldPath.documentId(), 'in', productIds)
      .get();

    const items = productsSnapshot.docs.map(doc => {
      const product = doc.data();
      return {
        sku: product.sku,
        quantity: product.quantity,
        listPrice: product.listPrice,
        salePrice: product.salePrice
      };
    });

    const connector = await getConnectorForStore(storeId);

    const result = await connector.updateInventory(items);

    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export { router as syncRouter };
