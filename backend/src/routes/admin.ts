import { Router } from 'express';
import { authenticate, requireAdmin } from '../middleware/auth';
import localStore from '../services/localStore';

const router = Router();

function getDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371000;
    const rad = Math.PI / 180;
    const dLat = (lat2 - lat1) * rad;
    const dLon = (lon2 - lon1) * rad;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

router.get('/alerts', authenticate, requireAdmin, async (_req, res) => {
    res.json(localStore.getAll('alerts', 'timestamp'));
});

router.get('/locations', authenticate, requireAdmin, async (_req, res) => {
    res.json(localStore.getAll('locations'));
});

router.get('/complaints', authenticate, requireAdmin, async (_req, res) => {
    res.json(localStore.getAll('complaints', 'createdAt'));
});

router.get('/crowd-density', authenticate, requireAdmin, async (_req, res) => {
    const locations = localStore.getAll('locations');
    const zones = localStore.getAll<any>('geofenceZones').filter((z) => z.active);

    const density = zones.map((zone: any) => {
        const count = (locations as any[]).filter((loc: any) => {
            const dist = getDistanceMeters(loc.latitude, loc.longitude, zone.latitude, zone.longitude);
            return dist <= zone.radius;
        }).length;
        return { zoneId: zone.id, zoneName: zone.name, count };
    });
    res.json(density);
});

// ── Users list (admin) ────────────────────────────────────────────────────────
router.get('/users', authenticate, requireAdmin, async (_req, res) => {
    const users = localStore.getAll<any>('users');
    res.json(users.map(u => {
        const { passwordHash, ...safe } = u;
        return safe;
    }));
});

// ── Aggregated analytics stats ────────────────────────────────────────────────
router.get('/stats', authenticate, requireAdmin, async (_req, res) => {
    const alerts = localStore.getAll<any>('alerts', 'timestamp');
    const complaints = localStore.getAll<any>('complaints', 'createdAt');
    const users = localStore.getAll<any>('users');
    const callLogs = localStore.getAll<any>('emergency_calls', 'timestamp');

    // Alerts by day (last 7 days)
    const now = Date.now();
    const dayMs = 86400000;
    const alertsByDay = Array.from({ length: 7 }, (_, i) => {
        const dayStart = now - (6 - i) * dayMs;
        const dayEnd = dayStart + dayMs;
        const dateStr = new Date(dayStart).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
        const count = alerts.filter(a => {
            const t = new Date(a.timestamp).getTime();
            return t >= dayStart && t < dayEnd;
        }).length;
        return { date: dateStr, count };
    });

    // Complaint categories
    const catMap: Record<string, number> = {};
    complaints.forEach((c: any) => {
        const cat = c.category || 'general';
        catMap[cat] = (catMap[cat] || 0) + 1;
    });
    const complaintByCategory = Object.entries(catMap).map(([name, value]) => ({ name, value }));

    // Call logs by service type
    const callMap: Record<string, number> = {};
    callLogs.forEach((c: any) => {
        const svc = c.serviceType || 'unknown';
        callMap[svc] = (callMap[svc] || 0) + 1;
    });
    const callsByService = Object.entries(callMap).map(([name, count]) => ({ name, count }));

    // Active SOS right now
    const activeAlerts = alerts.filter(a => a.status === 'active').length;
    const resolvedAlerts = alerts.filter(a => a.status === 'resolved').length;

    res.json({
        totalUsers: users.length,
        totalAlerts: alerts.length,
        activeAlerts,
        resolvedAlerts,
        totalComplaints: complaints.length,
        distressComplaints: complaints.filter((c: any) => c.distress?.isDistress).length,
        totalCallLogs: callLogs.length,
        alertsByDay,
        complaintByCategory,
        callsByService,
    });
});

// ── Emergency call logs ───────────────────────────────────────────────────────
router.get('/call-logs', authenticate, requireAdmin, async (_req, res) => {
    res.json(localStore.getAll('emergency_calls', 'timestamp'));
});

export default router;
