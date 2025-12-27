/**
 * Shipment Routes
 */

import { Router } from 'express';
import { getConnectorForStore } from '../connectors';

const router = Router();

// POST /api/shipments - Create shipment
router.post('/', async (req, res) => {
  try {
    const { storeId, orderNumber, packageNumber, trackingNumber, cargoCompany, shipmentDate } = req.body;

    const connector = await getConnectorForStore(storeId);

    const result = await connector.createShipment({
      orderNumber,
      packageNumber,
      trackingNumber,
      cargoCompany,
      shipmentDate: shipmentDate ? new Date(shipmentDate) : new Date()
    });

    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export { router as shipmentsRouter };
