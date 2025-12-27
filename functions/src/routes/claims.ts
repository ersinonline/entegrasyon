/**
 * Claims/Returns Routes
 */

import { Router } from 'express';
import { getConnectorForStore } from '../connectors';

const router = Router();

// GET /api/claims - Get claims
router.get('/', async (req, res) => {
  try {
    const { storeId, startDate, endDate } = req.query;

    if (!storeId) {
      return res.status(400).json({ error: 'storeId is required' });
    }

    const connector = await getConnectorForStore(storeId as string);

    if (!connector.getClaims) {
      return res.json({ claims: [] });
    }

    const claims = await connector.getClaims({
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined
    });

    res.json({ claims });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/claims/:id/action - Approve/Reject claim
router.post('/:id/action', async (req, res) => {
  try {
    const { id } = req.params;
    const { storeId, action, note } = req.body;

    const connector = await getConnectorForStore(storeId);

    if (!connector.updateClaim) {
      return res.status(400).json({ error: 'Marketplace does not support claim updates' });
    }

    const result = await connector.updateClaim(id, action, note);

    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export { router as claimsRouter };
