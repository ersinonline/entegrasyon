/**
 * Order Management Routes
 */

import { Router } from 'express';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { getConnectorForStore } from '../connectors';

const router = Router();
const db = getFirestore();

// GET /api/orders - List orders
router.get('/', async (req, res) => {
  try {
    const { merchantId, storeId, status } = req.query;

    let query: any = db.collection('orders');

    if (merchantId) query = query.where('merchantId', '==', merchantId);
    if (storeId) query = query.where('storeId', '==', storeId);
    if (status) query = query.where('status', '==', status);

    const snapshot = await query.orderBy('createdAt', 'desc').limit(100).get();

    const orders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json({ orders });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/orders/sync - Sync orders from marketplace
router.post('/sync', async (req, res) => {
  try {
    const { storeId, startDate, endDate } = req.body;

    const connector = await getConnectorForStore(storeId);

    const orders = await connector.getOrders({
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined
    });

    // Save orders to Firestore
    const batch = db.batch();
    let count = 0;

    for (const order of orders) {
      // Check if order already exists
      const existing = await db.collection('orders')
        .where('storeId', '==', storeId)
        .where('marketplaceOrderNumber', '==', order.marketplaceOrderNumber)
        .get();

      if (existing.empty) {
        const orderRef = db.collection('orders').doc();
        batch.set(orderRef, {
          ...order,
          storeId,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now()
        });
        count++;
      }
    }

    await batch.commit();

    res.json({ success: true, newOrders: count, total: orders.length });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export { router as ordersRouter };
