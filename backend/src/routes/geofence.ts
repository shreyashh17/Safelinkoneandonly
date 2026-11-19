import { Router } from 'express';
import { authenticate, AuthRequest, requireAdmin } from '../middleware/auth';
import localStore from '../services/localStore';

const router = Router();

// Create a geofence zone
router.post('/zones', authenticate, requireAdmin, async (req: AuthRequest, res) => {
    const { name, latitude, longitude, radius, type = 'event' } = req.body;
    const zone = {
        name, latitude, longitude, radius, type,
        createdBy: req.user!.uid, createdAt: new Date().toISOString(), active: true,
    };
    const id = localStore.newId();
    localStore.set('geofenceZones', id, { ...zone, id });
    res.status(201).json({ id, ...zone });
});

// Get all active zones
router.get('/zones', authenticate, async (_req, res) => {
    res.json(localStore.getAll<any>('geofenceZones').filter((z) => z.active));
});

// User entered/exited geofence zone
router.post('/event', authenticate, async (req: AuthRequest, res) => {
    const { zoneId, zoneName, eventType, latitude, longitude } = req.body;
    const uid = req.user!.uid;
    const event = { uid, zoneId, zoneName, eventType, latitude, longitude, timestamp: new Date().toISOString() };
    localStore.set('geofenceEvents', localStore.newId(), event);
    res.status(201).json({ success: true, event });
});

export default router;
