import { Router } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import localStore from '../services/localStore';
import { broadcast } from '../services/websocket';

const router = Router();

// Contact event security
router.post('/contact', authenticate, async (req: AuthRequest, res) => {
    const { zoneId, message, latitude, longitude } = req.body;
    const uid = req.user!.uid;

    const zone = localStore.get<any>('geofenceZones', zoneId);
    if (!zone) { res.status(404).json({ error: 'Zone not found' }); return; }
    const zoneName = zone.name;

    const id = localStore.newId();
    const contact = {
        uid, zoneId, zoneName, message, latitude, longitude,
        status: 'pending', timestamp: new Date().toISOString(),
    };

    localStore.set('eventContacts', id, contact);
    broadcast('EVENT_CONTACT', { id, ...contact });
    res.status(201).json({ id, ...contact });
});

// Get event contacts for a zone
router.get('/contacts/:zoneId', authenticate, async (req, res) => {
    const { zoneId } = req.params;
    res.json(localStore.where<any>('eventContacts', 'zoneId', zoneId));
});

export default router;
