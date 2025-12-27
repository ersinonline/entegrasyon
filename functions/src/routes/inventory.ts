/**
 * Inventory Management Routes
 */

import { Router } from 'express';
import { getConnectorForStore } from '../connectors';

const router = Router();

// POST /api/inventory/sync - Update inventory on marketplace
router.post('/sync', async (req, res) => {
  try {
    const { storeId, items } = req.body;

    if (!storeId || !items || !Array.isArray(items)) {
      return res.status(400).json({ error: 'Invalid request' });
    }

    const connector = await getConnectorForStore(storeId);

    const result = await connector.updateInventory(items);

    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/inventory/status/:taskId - Check async inventory update status
router.get('/status/:taskId', async (req, res) => {
  try {
    const { taskId } = req.params;
    const { storeId } = req.query;

    if (!storeId) {
      return res.status(400).json({ error: 'storeId is required' });
    }

    const connector = await getConnectorForStore(storeId as string);

    if (!connector.checkInventoryStatus) {
      return res.json({ completed: true, success: true });
    }

    const status = await connector.checkInventoryStatus(taskId);

    res.json(status);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export { router as inventoryRouter };
