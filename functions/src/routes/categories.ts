/**
 * Categories Routes
 */

import { Router } from 'express';
import { getConnectorForStore } from '../connectors';

const router = Router();

// GET /api/categories - Get categories for a marketplace
router.get('/', async (req, res) => {
  try {
    const { storeId } = req.query;

    if (!storeId) {
      return res.status(400).json({ error: 'storeId is required' });
    }

    const connector = await getConnectorForStore(storeId as string);

    const categories = await connector.getCategories();

    res.json({ categories });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/categories/:id/attributes - Get category attributes
router.get('/:id/attributes', async (req, res) => {
  try {
    const { id } = req.params;
    const { storeId } = req.query;

    if (!storeId) {
      return res.status(400).json({ error: 'storeId is required' });
    }

    const connector = await getConnectorForStore(storeId as string);

    const attributes = await connector.getCategoryAttributes(id);

    res.json({ attributes });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export { router as categoriesRouter };
