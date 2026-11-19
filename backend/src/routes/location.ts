import { Router, Request, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import localStore from '../services/localStore';
import { broadcast } from '../services/websocket';
import { findNearestStations } from '../services/stationFinder';

const router = Router();

// ── Update Location (Real-time tracking) ──────────────────────────────────────
router.post('/update', authenticate, async (req: AuthRequest, res: Response) => {
    const { latitude, longitude, accuracy } = req.body;
    const uid = req.user!.uid;
    const locationData = {
        uid,
        latitude: Number(latitude) || 0,
        longitude: Number(longitude) || 0,
        accuracy: accuracy || 0,
        updatedAt: new Date().toISOString(),
    };

    localStore.set('locations', uid, locationData);
    broadcast('LOCATION_UPDATE', locationData);
    res.json({ success: true, location: locationData });
});

// ── Active Locations (Admin feed) ─────────────────────────────────────────────
router.get('/active', authenticate, async (_req, res: Response) => {
    res.json(localStore.getAll('locations'));
});

// ── Real-Time Nearest Stations (Police, Ambulance, Fire, Disaster, etc.) ──────
async function handleNearestStations(req: Request, res: Response) {
    try {
        let lat = parseFloat((req.query.latitude || req.body.latitude || '') as string);
        let lng = parseFloat((req.query.longitude || req.body.longitude || '') as string);
        const type = (req.query.type || req.body.type || 'police') as string;

        // Fallback to recent known location if lat/lng is 0 or NaN
        if (isNaN(lat) || isNaN(lng) || (lat === 0 && lng === 0)) {
            const allLocs = localStore.getAll<any>('locations', 'updatedAt');
            if (allLocs.length > 0 && allLocs[0].latitude) {
                lat = allLocs[0].latitude;
                lng = allLocs[0].longitude;
            } else {
                lat = 21.1598; // Default to current project city
                lng = 79.1043;
            }
        }

        const stations = await findNearestStations(lat, lng, type);
        res.json({
            success: true,
            userLocation: { latitude: lat, longitude: lng },
            serviceType: type,
            count: stations.length,
            closest: stations[0] || null,
            stations,
        });
    } catch (err: any) {
        res.status(500).json({ error: 'Failed to find nearest stations', details: err.message });
    }
}

router.get('/nearest', handleNearestStations);
router.post('/nearest', handleNearestStations);

export default router;
