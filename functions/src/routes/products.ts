/**
 * Product Management Routes
 */

import { Router } from 'express';
import { getFirestore } from 'firebase-admin/firestore';
import { getConnectorForStore } from '../connectors';

const router = Router();
const db = getFirestore();

// GET /api/products - List products
router.get('/', async (req, res) => {
  try {
    const { merchantId } = req.query;
    const snapshot = await db.collection('products')
      .where('merchantId', '==', merchantId)
      .get();

    const products = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json({ products });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/products/:id/sync
router.post('/:id/sync', async (req, res) => {
  try {
    const { id } = req.params;
    const { storeIds } = req.body;

    const productDoc = await db.collection('products').doc(id).get();
    if (!productDoc.exists) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const product = productDoc.data()!;
    const results = [];

    for (const storeId of storeIds) {
      const connector = await getConnectorForStore(storeId);

      const result = await connector.createProduct({
        sku: product.sku,
        title: product.title,
        description: product.description,
        brand: product.brand,
        barcode: product.barcode,
        categoryId: product.categoryId,
        images: product.images,
        attributes: product.attributes,
        variants: product.variants,
        listPrice: product.listPrice,
        salePrice: product.salePrice,
        quantity: product.quantity,
        vatRate: product.vatRate,
        shipmentTemplate: product.shipmentTemplate,
        currency: product.currency
      });

      results.push({ storeId, ...result });
    }

    res.json({ results });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export { router as productsRouter };
