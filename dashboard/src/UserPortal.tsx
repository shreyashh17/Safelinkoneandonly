import React, { useState, useEffect, useRef } from 'react';
import api from './api';

/* ─────────────────────────────────────────────────────────────────────────────
   SafeLink – USER EMERGENCY PORTAL
   Tabs: Home · Quick Alert · Map · My Alerts · Profile
───────────────────────────────────────────────────────────────────────────── */

interface Alert { id: string; type: string; message: string; status: string; timestamp: string; latitude?: number; longitude?: number; }

interface NearestStation {
    name: string;
    phone: string;
    distance: number; // metres
    lat: number;
    lng: number;
    address?: string;
    fallback: boolean;
}

const EMERGENCY_SERVICES = [
    {
        label: 'Police',
        number: '100',
        color: '#3B82F6',
        icon: '👮',
        gradient: 'linear-gradient(135deg, #1d4ed8, #3B82F6)',
        overpassType: 'amenity=police',
        description: 'Call Police (100)',
        fallbackNumber: '100',
    },
    {
        label: 'Ambulance',
        number: '108',
        color: '#10B981',
        icon: '🚑',
        gradient: 'linear-gradient(135deg, #047857, #10B981)',
        overpassType: 'amenity=hospital',
        description: 'Call Ambulance (108)',
        fallbackNumber: '108',
    },
    {
        label: 'Fire Brigade',
        number: '101',
        color: '#F97316',
        icon: '🚒',
        gradient: 'linear-gradient(135deg, #c2410c, #F97316)',
        overpassType: 'amenity=fire_station',
        description: 'Call Fire Brigade (101)',
        fallbackNumber: '101',
    },
    {
        label: 'Disaster',
        number: '1078',
        color: '#F59E0B',
        icon: '🆘',
        gradient: 'linear-gradient(135deg, #b45309, #F59E0B)',
        overpassType: 'amenity=government',
        description: 'Disaster Helpline (1078)',
        fallbackNumber: '1078',
    },
    {
        label: "Women's Help",
        number: '1091',
        color: '#EC4899',
        icon: '🤝',
        gradient: 'linear-gradient(135deg, #9d174d, #EC4899)',
        overpassType: 'amenity=police',
        description: "Women's Helpline (1091)",
        fallbackNumber: '1091',
    },
    {
        label: 'Child Help',
        number: '1098',
        color: '#8B5CF6',
        icon: '🧒',
        gradient: 'linear-gradient(135deg, #6d28d9, #8B5CF6)',
        overpassType: 'amenity=police',
        description: 'Childline (1098)',
        fallbackNumber: '1098',
    },
];

function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371000;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatDistance(m: number): string {
    if (m < 1000) return `${Math.round(m)} m`;
    return `${(m / 1000).toFixed(1)} km`;
}

/* ─── Nearest Station Modal ──────────────────────────────────────────────── */
function NearestStationModal({
    service,
    location,
    onClose,
    onCallLogged,
}: {
    service: typeof EMERGENCY_SERVICES[0];
    location: { lat: number; lng: number } | null;
    onClose: () => void;
    onCallLogged: () => void;
}) {
    const [station, setStation] = useState<any | null>(null);
    const [allStations, setAllStations] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [callInitiated, setCallInitiated] = useState(false);
    const [selectedIdx, setSelectedIdx] = useState(0);

    useEffect(() => {
        let cancelled = false;
        async function fetchNearest() {
            setLoading(true);
            const serviceKeyMap: Record<string, string> = {
                'Police': 'police',
                'Ambulance': 'ambulance',
                'Fire Brigade': 'fire',
                'Disaster': 'disaster',
                "Women's Help": 'women',
                'Child Help': 'child',
            };
            const sType = serviceKeyMap[service.label] || 'police';

            try {
                const res = await api.get('/api/location/nearest', {
                    params: {
                        latitude: location?.lat,
                        longitude: location?.lng,
                        type: sType,
                    },
                });

                if (cancelled) return;

                if (res.data?.stations && res.data.stations.length > 0) {
                    setAllStations(res.data.stations);
                    setStation(res.data.stations[0]);
                } else if (res.data?.closest) {
                    setAllStations([res.data.closest]);
                    setStation(res.data.closest);
                } else {
                    throw new Error('No station found');
                }
            } catch {
                if (!cancelled) {
                    const fallbackStation = {
                        name: `National ${service.label} Helpline`,
                        phone: service.fallbackNumber,
                        distance: 0,
                        formattedDistance: 'National',
                        lat: 0,
                        lng: 0,
                        address: 'National 24/7 Emergency Dispatch Center',
                        fallback: true,
                        isLiveOSM: false,
                    };
                    setStation(fallbackStation);
                    setAllStations([fallbackStation]);
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        }
        fetchNearest();
        return () => { cancelled = true; };
    }, [service, location]);

    const handleCall = (targetStation = station) => {
        if (!targetStation) return;
        setCallInitiated(true);
        api.post('/api/sos/emergency-call', {
            serviceType: service.label,
            stationName: targetStation.name,
            stationPhone: targetStation.phone,
            latitude: location?.lat ?? 0,
            longitude: location?.lng ?? 0,
            distance: targetStation.distance || 0,
        }).catch(() => { });
        onCallLogged();
        window.location.href = `tel:${targetStation.phone}`;
    };

    const handleSelectStation = (st: any, idx: number) => {
        setSelectedIdx(idx);
        setStation(st);
        setCallInitiated(false);
    };

    return (
        <div style={m.overlay} onClick={onClose}>
            <div style={m.modal} onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div style={{ ...m.modalHeader, background: service.gradient }}>
                    <span style={{ fontSize: 44 }}>{service.icon}</span>
                    <div style={{ flex: 1 }}>
                        <div style={m.modalTitle}>{service.label} Emergency</div>
                        <div style={m.modalSubtitle}>
                            {loading ? 'Locating closest response unit via GPS…' : `Nearest station found for your coordinates`}
                        </div>
                    </div>
                    <button style={m.closeBtn} onClick={onClose}>✕</button>
                </div>

                {/* Body */}
                <div style={m.modalBody}>
                    {loading ? (
                        <div style={m.loadingBox}>
                            <div style={m.spinner} />
                            <div style={m.loadingText}>Searching live {service.label.toLowerCase()} stations…</div>
                            <div style={m.loadingHint}>Scanning OpenStreetMap emergency database around your real-time GPS</div>
                        </div>
                    ) : station ? (
                        <>
                            {/* Verified Live Badge */}
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                                {station.isLiveOSM ? (
                                    <span style={{ background: '#10B98122', color: '#10B981', border: '1px solid #10B98144', padding: '4px 10px', borderRadius: 16, fontSize: 11.5, fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                                        🟢 Live OpenStreetMap Verified
                                    </span>
                                ) : station.fallback ? (
                                    <span style={{ background: '#F59E0B22', color: '#F59E0B', border: '1px solid #F59E0B44', padding: '4px 10px', borderRadius: 16, fontSize: 11.5, fontWeight: 700 }}>
                                        ⚠️ National Emergency Helpline
                                    </span>
                                ) : (
                                    <span style={{ background: '#3B82F622', color: '#3B82F6', border: '1px solid #3B82F644', padding: '4px 10px', borderRadius: 16, fontSize: 11.5, fontWeight: 700 }}>
                                        🏢 Emergency Response Unit
                                    </span>
                                )}

                                {station.distance > 0 && (
                                    <span style={{ background: service.color + '22', color: service.color, border: `1px solid ${service.color}44`, padding: '4px 10px', borderRadius: 16, fontSize: 12, fontWeight: 800 }}>
                                        📏 {station.formattedDistance || `${(station.distance / 1000).toFixed(1)} km`} away
                                    </span>
                                )}
                            </div>

                            {/* Active Station Card */}
                            <div style={m.stationCard}>
                                <div style={{ ...m.stationIcon, background: service.color + '22', color: service.color }}>
                                    {service.icon}
                                </div>
                                <div style={m.stationInfo}>
                                    <div style={m.stationName}>{station.name}</div>
                                    {station.address && <div style={m.stationAddr}>📍 {station.address}</div>}
                                    <div style={{ fontSize: 12, color: '#aaa', marginTop: 4 }}>
                                        Type: <strong style={{ color: '#fff' }}>{service.label} Response</strong>
                                    </div>
                                </div>
                            </div>

                            {/* Phone Section */}
                            <div style={m.phoneSection}>
                                <div style={m.phoneLabel}>📞 Emergency Phone Line</div>
                                <div style={{ ...m.phoneNumber, color: service.color }}>{station.phone}</div>
                            </div>

                            {/* Call Button */}
                            {callInitiated ? (
                                <div style={m.callingBox}>
                                    <div style={{ fontSize: 36 }}>📞</div>
                                    <div style={m.callingText}>Connecting to {station.name}…</div>
                                    <div style={m.callingHint}>Emergency call logged to SafeLink server. Check dialer.</div>
                                </div>
                            ) : (
                                <button
                                    style={{ ...m.callBtn, background: service.gradient, boxShadow: `0 8px 32px ${service.color}66` }}
                                    onClick={() => handleCall(station)}
                                >
                                    <span style={{ fontSize: 26 }}>📞</span>
                                    <span style={m.callBtnLabel}>CALL NOW</span>
                                    <span style={m.callBtnNum}>{station.phone}</span>
                                </button>
                            )}

                            {/* Directions Button */}
                            {station.lat !== 0 && (
                                <a
                                    href={station.navigationUrl || `https://www.google.com/maps/dir/?api=1&destination=${station.lat},${station.lng}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={m.mapsLink}
                                >
                                    🗺️ Get Real-Time Directions on Google Maps →
                                </a>
                            )}

                            {/* Multiple Nearby Stations List */}
                            {allStations.length > 1 && (
                                <div style={{ marginTop: 20 }}>
                                    <div style={{ fontSize: 13, fontWeight: 800, color: '#aaa', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                                        Other Nearby {service.label} Stations ({allStations.length - 1})
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 180, overflowY: 'auto' }}>
                                        {allStations.map((st, idx) => {
                                            if (idx === selectedIdx) return null;
                                            return (
                                                <div
                                                    key={st.id || idx}
                                                    onClick={() => handleSelectStation(st, idx)}
                                                    style={{
                                                        background: '#151928',
                                                        border: '1px solid #252c43',
                                                        borderRadius: 12,
                                                        padding: '10px 14px',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'space-between',
                                                        cursor: 'pointer',
                                                        transition: 'border-color .2s',
                                                    }}
                                                >
                                                    <div style={{ flex: 1, paddingRight: 10 }}>
                                                        <div style={{ color: '#fff', fontSize: 13.5, fontWeight: 700, lineHeight: 1.3 }}>
                                                            {st.name}
                                                        </div>
                                                        <div style={{ color: '#888', fontSize: 11.5, marginTop: 2 }}>
                                                            {st.formattedDistance || `${(st.distance / 1000).toFixed(1)} km`} · {st.phone}
                                                        </div>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        style={{
                                                            background: service.color + '22',
                                                            border: `1px solid ${service.color}55`,
                                                            color: service.color,
                                                            padding: '6px 12px',
                                                            borderRadius: 8,
                                                            fontSize: 12,
                                                            fontWeight: 700,
                                                            cursor: 'pointer',
                                                            whiteSpace: 'nowrap',
                                                        }}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleCall(st);
                                                        }}
                                                    >
                                                        📞 Call
                                                    </button>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </>
                    ) : null}
                </div>
            </div>
        </div>
    );
}

/* ─── Spinner keyframes injected once ───────────────────────────────────── */
const _styleId = 'safelink-portal-styles';
if (!document.getElementById(_styleId)) {
    const spinnerStyle = document.createElement('style');
    spinnerStyle.id = _styleId;
    spinnerStyle.textContent = `
@keyframes spin { to { transform: rotate(360deg); } }
@keyframes ping { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.4;transform:scale(1.15)} }
@keyframes callPulse { 0%,100%{transform:scale(1);box-shadow:0 0 0 0 rgba(255,59,59,.5)} 50%{transform:scale(1.04);box-shadow:0 0 0 16px rgba(255,59,59,0)} }
@keyframes fadeIn { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
@keyframes overlayIn { from{opacity:0} to{opacity:1} }
`;
    document.head.appendChild(spinnerStyle);
}

/* ─── Responsive helper ──────────────────────────────────────────────────── */
const isMobile = window.innerWidth < 600;

const QUICK_MESSAGES = [
    { emoji: '🔥', label: 'Fire Nearby', msg: 'Fire emergency! I need immediate help. Fire nearby.' },
    { emoji: '🌊', label: 'Flood / Disaster', msg: 'Natural disaster! Flooding in my area, need evacuation help.' },
    { emoji: '🤕', label: 'Medical Emergency', msg: 'Medical emergency! Need ambulance immediately.' },
    { emoji: '👊', label: 'Unsafe / Threat', msg: 'I am in an unsafe situation. Please send help immediately.' },
    { emoji: '⚡', label: 'Gas / Electric', msg: 'Hazardous situation — gas leak or electrical danger. Need emergency response.' },
    { emoji: '🚗', label: 'Road Accident', msg: 'Road accident. Need ambulance and emergency services at my location.' },
    { emoji: '🏚️', label: 'Building Collapse', msg: 'Building collapse! People are trapped. Need rescue immediately.' },
    { emoji: '🌪️', label: 'Storm / Cyclone', msg: 'Severe storm / cyclone in my area. Need emergency assistance.' },
];

export default function UserPortal({ userInfo, onLogout }: { userInfo: any; onLogout: () => void }) {
    const [tab, setTab] = useState<'home' | 'alert' | 'map' | 'history' | 'profile'>('home');
    const [location, setLocation] = useState<{ lat: number; lng: number; acc: number } | null>(null);
    const [locError, setLocError] = useState('');
    const [myAlerts, setMyAlerts] = useState<Alert[]>([]);
    const [profile, setProfile] = useState<any>(null);
    const [sosCountdown, setSosCountdown] = useState(0);
    const [sosSending, setSosSending] = useState(false);
    const [sosSent, setSosSent] = useState(false);
    const [customMsg, setCustomMsg] = useState('');
    const [msgSending, setMsgSending] = useState(false);
    const [msgSentText, setMsgSentText] = useState('');
    const [activeService, setActiveService] = useState<typeof EMERGENCY_SERVICES[0] | null>(null);
    const [callNotif, setCallNotif] = useState('');
    const [govAlerts, setGovAlerts] = useState<any[]>([]);
    const [govBanner, setGovBanner] = useState<any | null>(null);
    const timerId = useRef<ReturnType<typeof setInterval> | null>(null);

    /* ── WebSocket for government alerts ───────────────────────────────────── */
    useEffect(() => {
        const wsUrl = (process.env.REACT_APP_API_URL || 'http://localhost:5000').replace('http', 'ws');
        const ws = new WebSocket(wsUrl);
        ws.onmessage = (evt) => {
            try {
                const { type, payload } = JSON.parse(evt.data);
                if (type === 'GOV_ALERT') {
                    setGovAlerts(prev => [payload, ...prev]);
                    setGovBanner(payload);
                    setTimeout(() => setGovBanner(null), 12000);
                }
            } catch { }
        };
        return () => ws.close();
    }, []);

    /* ── Load past broadcasts on mount ──────────────────────────────────────── */
    useEffect(() => {
        api.get('/api/broadcast').then(r => setGovAlerts(r.data)).catch(() => {});
    }, []);

    /* ── GPS init & Real-Time Tracking ────────────────────────────────────── */
    useEffect(() => {
        const defaultFallback = { lat: 21.1598, lng: 79.1043, acc: 50 };

        if (!navigator.geolocation) {
            setLocation(defaultFallback);
            setLocError('GPS not supported — using regional location');
            return;
        }

        const onPos = (pos: GeolocationPosition) => {
            const l = { lat: pos.coords.latitude, lng: pos.coords.longitude, acc: pos.coords.accuracy };
            setLocation(l);
            setLocError('');
            api.post('/api/location/update', { latitude: l.lat, longitude: l.lng, accuracy: l.acc }).catch(() => { });
        };

        const onErr = () => {
            // If GPS permission is pending or denied, fallback to default coordinates so nearest stations always work!
            setLocation(prev => prev || defaultFallback);
            setLocError('Using default city coordinates');
        };

        navigator.geolocation.getCurrentPosition(onPos, onErr, { enableHighAccuracy: true, timeout: 6000 });
        const watchId = navigator.geolocation.watchPosition(onPos, onErr, { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 });

        return () => navigator.geolocation.clearWatch(watchId);
    }, []);

    /* ── Load data ─────────────────────────────────────────────────────────── */
    const loadAlerts = () => api.get('/api/user/alerts').then(r => setMyAlerts(r.data)).catch(() => { });
    const loadProfile = () => api.get('/api/user/me').then(r => setProfile(r.data)).catch(() => { });
    useEffect(() => { loadAlerts(); loadProfile(); }, [sosSent]);

    /* ── SOS countdown logic ────────────────────────────────────────────────── */
    const startSOS = () => {
        if (sosCountdown > 0 || sosSending) return;
        setSosCountdown(3);
        timerId.current = setInterval(() => {
            setSosCountdown(prev => {
                if (prev <= 1) { clearInterval(timerId.current!); fireSOS(); return 0; }
                return prev - 1;
            });
        }, 1000);
    };
    const cancelSOS = () => { clearInterval(timerId.current!); setSosCountdown(0); };
    const fireSOS = async () => {
        setSosSending(true);
        try {
            await api.post('/api/sos/trigger', {
                type: 'SOS', message: 'EMERGENCY SOS — I need immediate help!',
                latitude: location?.lat ?? 0, longitude: location?.lng ?? 0,
            });
            setSosSent(true);
            setTimeout(() => setSosSent(false), 8000);
        } catch { }
        setSosSending(false);
    };

    /* ── Quick/custom message ───────────────────────────────────────────────── */
    const sendAlert = async (msg: string) => {
        setMsgSending(true); setMsgSentText('');
        try {
            await api.post('/api/complaint/submit', {
                text: msg, category: 'emergency',
                latitude: location?.lat ?? 0, longitude: location?.lng ?? 0,
            });
            setMsgSentText(msg); setCustomMsg('');
            loadAlerts();
        } catch { }
        setMsgSending(false);
    };

    const handleCallLogged = () => {
        setCallNotif(`📞 Emergency call logged`);
        setTimeout(() => setCallNotif(''), 4000);
        loadAlerts();
    };

    /* ── Shared helpers ──────────────────────────────────────────────────────── */
    const locLabel = locError
        ? '📵 No GPS'
        : location ? `📍 ${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}` : '⏳ Getting GPS…';

    /* ═══════════════════════════════════════════════════════════════════════════
       RENDER
    ═══════════════════════════════════════════════════════════════════════════ */
    return (
        <div style={c.root}>

            {/* ── Nearest Station Modal ────────────────────────────────────────── */}
            {activeService && (
                <NearestStationModal
                    service={activeService}
                    location={location}
                    onClose={() => setActiveService(null)}
                    onCallLogged={handleCallLogged}
                />
            )}

            {/* ── Call Notification Toast ──────────────────────────────────────── */}
            {callNotif && (
                <div style={c.toast}>{callNotif}</div>
            )}

            {/* ── Government Alert Banner (real-time from admin) ───────────────── */}
            {govBanner && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999,
                    background: govBanner.severity === 'critical' ? '#FF3B3B' : govBanner.severity === 'warning' ? '#F59E0B' : '#3B82F6',
                    padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 14,
                } as React.CSSProperties}>
                    <span style={{ fontSize: 28 }}>
                        {govBanner.severity === 'critical' ? '🚨' : govBanner.severity === 'warning' ? '⚠️' : 'ℹ️'}
                    </span>
                    <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 900, fontSize: 16, color: '#fff' }}>{govBanner.title}</div>
                        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)' }}>{govBanner.message} — {govBanner.area}</div>
                    </div>
                    <button style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff', padding: '6px 14px', borderRadius: 8, cursor: 'pointer', fontWeight: 700 }} onClick={() => setGovBanner(null)}>✕</button>
                </div>
            )}

            {/* ── Top Header ───────────────────────────────────────────────────── */}
            <header style={c.header}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 26 }}>🛡️</span>
                    <div>
                        <div style={c.headerTitle}>SafeLink</div>
                        <div style={c.headerSub}>Emergency Portal</div>
                    </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <span style={locError ? c.gpsBad : location ? c.gpsGood : c.gpsWait}>{locLabel}</span>
                    <span style={c.userChip}>👤 {userInfo?.name || 'User'}</span>
                    <button style={c.logoutBtn} onClick={onLogout}>Logout</button>
                </div>
            </header>

            {/* ── Tab Bar ──────────────────────────────────────────────────────── */}
            <nav style={c.tabBar}>
                {([
                    { id: 'home', icon: '🏠', label: 'Home' },
                    { id: 'alert', icon: '💬', label: 'Send Alert' },
                    { id: 'map', icon: '🗺️', label: 'My Location' },
                    { id: 'history', icon: '📋', label: 'My Alerts' },
                    { id: 'profile', icon: '👤', label: 'Profile' },
                ] as { id: typeof tab; icon: string; label: string }[]).map(t => (
                    <button key={t.id} style={{ ...c.tabBtn, ...(tab === t.id ? c.tabActive : {}) }} onClick={() => setTab(t.id)}>
                        <span style={{ fontSize: 18 }}>{t.icon}</span>
                        <span style={c.tabLabel}>{t.label}</span>
                    </button>
                ))}
            </nav>

            {/* ── Content ──────────────────────────────────────────────────────── */}
            <div style={c.content}>

                {/* ══════════  HOME  ══════════ */}
                {tab === 'home' && (
                    <div style={c.homeGrid}>

                        {/* SOS Hero */}
                        <div style={c.sosSection}>
                            {sosSent ? (
                                <div style={c.sentCard}>
                                    <div style={{ fontSize: 64 }}>✅</div>
                                    <div style={c.sentTitle}>SOS Alert Sent!</div>
                                    <div style={c.sentSub}>Authorities have been notified. Your GPS location has been shared. Stay calm — help is on the way.</div>
                                </div>
                            ) : sosCountdown > 0 ? (
                                <div style={c.countdownWrap}>
                                    <div style={c.countdownNum}>{sosCountdown}</div>
                                    <div style={{ color: '#888', fontSize: 15, marginBottom: 20 }}>Sending SOS in…</div>
                                    <button style={c.cancelBtn} onClick={cancelSOS}>✕ Cancel</button>
                                </div>
                            ) : (
                                <>
                                    <button style={c.sosBtn} onClick={startSOS} disabled={sosSending}>
                                        <div style={c.sosPulse} />
                                        <div style={c.sosBtnInner}>
                                            <span style={{ fontSize: 56 }}>🆘</span>
                                            <span style={c.sosBtnLabel}>SOS</span>
                                            <span style={c.sosBtnHint}>{sosSending ? 'Sending…' : 'Tap to Send'}</span>
                                        </div>
                                    </button>
                                    <p style={c.sosCaption}>Hold — 3 second countdown before sending · Tap again to cancel</p>
                                </>
                            )}
                        </div>

                        {/* ── Emergency Service Buttons ────────────────────────── */}
                        <div style={c.section}>
                            <div style={c.sectionTitle}>🚨 Emergency Services — Tap to Call Nearest</div>
                            <p style={c.hint}>Tap any service to instantly find the nearest station and place a call.</p>
                            <div style={c.serviceGrid}>
                                {EMERGENCY_SERVICES.map(svc => (
                                    <button
                                        key={svc.label}
                                        style={{ ...c.serviceCard, borderColor: svc.color + '44' }}
                                        onClick={() => setActiveService(svc)}
                                    >
                                        <div style={{ ...c.serviceIconWrap, background: svc.gradient }}>
                                            <span style={{ fontSize: 28 }}>{svc.icon}</span>
                                        </div>
                                        <span style={{ ...c.serviceNum, color: svc.color }}>{svc.number}</span>
                                        <span style={c.serviceLabel}>{svc.label}</span>
                                        <span style={{ ...c.serviceCta, color: svc.color }}>Find Nearest →</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* ── Government Alerts Section ───────────── */}
                        {govAlerts.length > 0 && (
                            <div style={c.section}>
                                <div style={c.sectionTitle}>📢 Government / Authority Alerts</div>
                                {govAlerts.slice(0, 5).map((g, i) => (
                                    <div key={i} style={{
                                        background: g.severity === 'critical' ? '#FF3B3B11' : g.severity === 'warning' ? '#F59E0B11' : '#3B82F611',
                                        border: `1px solid ${g.severity === 'critical' ? '#FF3B3B44' : g.severity === 'warning' ? '#F59E0B44' : '#3B82F644'}`,
                                        borderRadius: 14, padding: '14px 16px', marginBottom: 10,
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                                            <span style={{ fontSize: 20 }}>
                                                {g.severity === 'critical' ? '🚨' : g.severity === 'warning' ? '⚠️' : 'ℹ️'}
                                            </span>
                                            <span style={{ fontWeight: 800, fontSize: 15, color: '#fff' }}>{g.title}</span>
                                            <span style={{ marginLeft: 'auto', fontSize: 11, color: '#888' }}>{new Date(g.timestamp).toLocaleString()}</span>
                                        </div>
                                        <div style={{ color: '#ccc', fontSize: 14, lineHeight: 1.5 }}>{g.message}</div>
                                        <div style={{ color: '#888', fontSize: 12, marginTop: 6 }}>📍 {g.area}</div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Status chips */}
                        <div style={c.statusRow}>
                            <div style={c.statusChip}>
                                <span>📡</span>
                                <span>Backend: <strong style={{ color: '#10B981' }}>Online</strong></span>
                            </div>
                            <div style={c.statusChip}>
                                <span>📍</span>
                                <span>GPS: <strong style={{ color: locError ? '#FF3B3B' : location ? '#10B981' : '#F59E0B' }}>{locError ? 'Denied' : location ? 'Active' : 'Loading'}</strong></span>
                            </div>
                            <div style={c.statusChip}>
                                <span>🚨</span>
                                <span>Active Alerts: <strong style={{ color: '#FF3B3B' }}>{myAlerts.filter(a => a.status === 'active').length}</strong></span>
                            </div>
                        </div>
                    </div>
                )}

                {/* ══════════  SEND ALERT  ══════════ */}
                {tab === 'alert' && (
                    <div>
                        {msgSentText && (
                            <div style={c.successBanner}>
                                ✅ Alert sent: "{msgSentText.slice(0, 70)}{msgSentText.length > 70 ? '…' : ''}"
                            </div>
                        )}

                        <div style={c.sectionTitle}>⚡ One-Tap Emergency Alerts</div>
                        <p style={c.hint}>Tap any card below to instantly send a pre-written emergency alert with your GPS location.</p>
                        <div style={c.quickGrid}>
                            {QUICK_MESSAGES.map(q => (
                                <button key={q.label} style={c.quickCard} onClick={() => sendAlert(q.msg)} disabled={msgSending}>
                                    <span style={{ fontSize: 36 }}>{q.emoji}</span>
                                    <span style={c.quickLabel}>{q.label}</span>
                                </button>
                            ))}
                        </div>

                        <div style={{ ...c.sectionTitle, marginTop: 28 }}>✍️ Describe Your Situation</div>
                        <p style={c.hint}>Tell authorities exactly what's happening. Include floor/room, number of people, injuries.</p>
                        <textarea
                            style={c.textarea}
                            rows={5}
                            placeholder={'Example: "Trapped on 3rd floor of XYZ building. Gas smell, window broken. 3 people with me, one injured."'}
                            value={customMsg}
                            onChange={e => setCustomMsg(e.target.value)}
                        />
                        <button
                            style={{ ...c.sendBtn, opacity: (!customMsg.trim() || msgSending) ? 0.5 : 1 }}
                            disabled={!customMsg.trim() || msgSending}
                            onClick={() => sendAlert(customMsg)}>
                            {msgSending ? '📡 Sending alert…' : '📤 Send Emergency Alert'}
                        </button>

                        <div style={c.tipBox}>
                            💡 <strong>Tip:</strong> All alerts include your GPS coordinates automatically. Authorities can see your exact location on the admin map.
                        </div>
                    </div>
                )}

                {/* ══════════  MAP / LOCATION  ══════════ */}
                {tab === 'map' && (
                    <div>
                        <div style={c.sectionTitle}>📍 My Current Location</div>
                        {locError ? (
                            <div style={{ ...c.tipBox, borderColor: '#FF3B3B44', background: '#FF3B3B11', color: '#FF3B3B', marginBottom: 16 }}>
                                ❌ {locError} — Please allow location access in your browser and refresh the page.
                            </div>
                        ) : !location ? (
                            <div style={c.emptyState}><span style={{ fontSize: 40 }}>⏳</span><p>Acquiring GPS signal…</p></div>
                        ) : (
                            <>
                                <div style={c.coordCard}>
                                    <div style={c.coordRow}>
                                        <span style={c.coordLabel}>Latitude</span>
                                        <span style={c.coordValue}>{location.lat.toFixed(6)}°</span>
                                    </div>
                                    <div style={c.coordRow}>
                                        <span style={c.coordLabel}>Longitude</span>
                                        <span style={c.coordValue}>{location.lng.toFixed(6)}°</span>
                                    </div>
                                    <div style={c.coordRow}>
                                        <span style={c.coordLabel}>Accuracy</span>
                                        <span style={c.coordValue}>±{Math.round(location.acc)}m</span>
                                    </div>
                                </div>

                                <div style={c.mapFrame}>
                                    <iframe
                                        title="My Location"
                                        style={{ width: '100%', height: '100%', border: 'none', borderRadius: 12 }}
                                        src={`https://maps.google.com/maps?q=${location.lat},${location.lng}&z=16&output=embed`}
                                        allowFullScreen
                                    />
                                </div>

                                <a
                                    href={`https://maps.google.com/?q=${location.lat},${location.lng}`}
                                    target="_blank" rel="noopener noreferrer"
                                    style={c.openMapsBtn}>
                                    🗺️ Open in Google Maps
                                </a>
                            </>
                        )}
                    </div>
                )}

                {/* ══════════  HISTORY  ══════════ */}
                {tab === 'history' && (
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                            <div style={c.sectionTitle}>📋 My Alert History</div>
                            <button style={c.refreshBtn} onClick={loadAlerts}>↻ Refresh</button>
                        </div>
                        {myAlerts.length === 0 ? (
                            <div style={c.emptyState}>
                                <span style={{ fontSize: 48 }}>✅</span>
                                <p style={{ color: '#888', marginTop: 12 }}>No alerts sent yet</p>
                                <p style={{ color: '#555', fontSize: 13 }}>Use the Home or Send Alert tab to send a one-tap SOS when needed.</p>
                            </div>
                        ) : (
                            myAlerts.map(a => (
                                <div key={a.id} style={{ ...c.alertCard, borderLeftColor: a.status === 'active' ? '#FF3B3B' : '#10B981' }}>
                                    <div style={c.alertTop}>
                                        <span style={{ ...c.alertBadge, background: a.status === 'active' ? '#FF3B3B22' : '#10B98122', color: a.status === 'active' ? '#FF3B3B' : '#10B981' }}>
                                            {a.type}
                                        </span>
                                        <span style={{ fontSize: 13, fontWeight: 600, color: a.status === 'active' ? '#FF3B3B' : '#888' }}>
                                            {a.status === 'active' ? '🔴 Active' : '✅ Resolved'}
                                        </span>
                                        <span style={{ color: '#555', fontSize: 12, marginLeft: 'auto' }}>{new Date(a.timestamp).toLocaleString()}</span>
                                    </div>
                                    <p style={c.alertMsg}>{a.message}</p>
                                    {a.latitude != null && (
                                        <a href={`https://maps.google.com/?q=${a.latitude},${a.longitude}`} target="_blank" rel="noopener noreferrer"
                                            style={{ color: '#3B82F6', fontSize: 12, textDecoration: 'none' }}>
                                            📍 {a.latitude.toFixed(5)}, {a.longitude?.toFixed(5)} · View on map
                                        </a>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                )}

                {/* ══════════  PROFILE  ══════════ */}
                {tab === 'profile' && (
                    <div>
                        <div style={c.sectionTitle}>👤 My Profile</div>
                        <div style={c.profileCard}>
                            <div style={c.profileAvatar}>{(userInfo?.name || 'U')[0].toUpperCase()}</div>
                            <div style={{ flex: 1 }}>
                                <div style={c.profileName}>{userInfo?.name || profile?.name || '—'}</div>
                                <div style={c.profileEmail}>{userInfo?.email || profile?.email || '—'}</div>
                                <div style={c.profileRole}>Role: <strong style={{ color: '#3B82F6' }}>{profile?.role || 'user'}</strong></div>
                                <div style={c.profileRole}>Member since: {profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString() : '—'}</div>
                            </div>
                        </div>

                        {/* Stats */}
                        <div style={c.statsRow}>
                            <div style={c.statCard}>
                                <div style={c.statNum}>{myAlerts.length}</div>
                                <div style={c.statLabel}>Total Alerts</div>
                            </div>
                            <div style={c.statCard}>
                                <div style={{ ...c.statNum, color: '#FF3B3B' }}>{myAlerts.filter(a => a.status === 'active').length}</div>
                                <div style={c.statLabel}>Active</div>
                            </div>
                            <div style={c.statCard}>
                                <div style={{ ...c.statNum, color: '#10B981' }}>{myAlerts.filter(a => a.status === 'resolved').length}</div>
                                <div style={c.statLabel}>Resolved</div>
                            </div>
                        </div>

                        {/* Safety info */}
                        <div style={{ ...c.tipBox, marginTop: 24 }}>
                            <strong>🛡️ Emergency Quick Reference</strong><br /><br />
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 13 }}>
                                {EMERGENCY_SERVICES.map(s => (
                                    <button key={s.label} style={{ ...c.profileEmergBtn, borderColor: s.color + '44', color: s.color }} onClick={() => setActiveService(s)}>
                                        {s.icon} {s.label} · <strong>{s.number}</strong>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <button style={{ ...c.sendBtn, marginTop: 24, background: '#1E2438', color: '#FF3B3B', border: '1px solid #FF3B3B44' }} onClick={onLogout}>
                            🚪 Logout
                        </button>
                    </div>
                )}

            </div>

            {/* ── Always-visible Emergency Strip ──────────────────────────────────── */}
            <div style={c.strip}>
                {EMERGENCY_SERVICES.slice(0, 4).map(n => (
                    <button key={n.label} style={{ ...c.stripBtn, color: n.color, borderColor: n.color + '44', background: n.color + '11' }}
                        onClick={() => setActiveService(n)}>
                        {n.icon} {n.label} · {n.number}
                    </button>
                ))}
            </div>
        </div>
    );
}

/* ─── Portal Styles ──────────────────────────────────────────────────────── */
const c: Record<string, React.CSSProperties> = {
    root: {
        backgroundColor: 'var(--bg)',
        backgroundImage: 'var(--bg-gradient)',
        minHeight: '100vh',
        color: 'var(--text)',
        fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
        paddingBottom: 84,
    },

    // Toast
    toast: {
        position: 'fixed',
        top: 80,
        left: '50%',
        transform: 'translateX(-50%)',
        background: 'var(--grad-green)',
        color: '#fff',
        padding: '12px 28px',
        borderRadius: 30,
        fontWeight: 800,
        fontSize: 14,
        zIndex: 9999,
        boxShadow: '0 8px 30px var(--green-glow)',
        animation: 'fadeIn .3s ease',
        whiteSpace: 'nowrap' as any,
        maxWidth: '90vw',
        textAlign: 'center' as any,
    },

    // Header
    header: {
        background: 'var(--surface-glass)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderBottom: '1px solid var(--border)',
        padding: '14px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 12,
        position: 'sticky',
        top: 0,
        zIndex: 100,
        boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 900,
        background: 'linear-gradient(135deg, #ffffff 30%, #ff4d5e 100%)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        letterSpacing: 1,
    },
    headerSub: {
        fontSize: 11,
        color: 'var(--text-dim)',
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: 0.8,
    },
    gpsGood: {
        background: 'rgba(16, 185, 129, 0.12)',
        border: '1px solid rgba(16, 185, 129, 0.3)',
        color: '#34d399',
        padding: '5px 12px',
        borderRadius: 20,
        fontSize: 11.5,
        fontWeight: 700,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
    },
    gpsBad: {
        background: 'rgba(255, 56, 73, 0.12)',
        border: '1px solid rgba(255, 56, 73, 0.3)',
        color: '#ff5e6d',
        padding: '5px 12px',
        borderRadius: 20,
        fontSize: 11.5,
        fontWeight: 700,
    },
    gpsWait: {
        background: 'rgba(245, 158, 11, 0.12)',
        border: '1px solid rgba(245, 158, 11, 0.3)',
        color: '#fbbf24',
        padding: '5px 12px',
        borderRadius: 20,
        fontSize: 11.5,
        fontWeight: 700,
    },
    userChip: {
        background: 'var(--surface2)',
        border: '1px solid var(--border)',
        padding: '5px 12px',
        borderRadius: 20,
        fontSize: 12.5,
        fontWeight: 700,
        color: '#fff',
    },
    logoutBtn: {
        background: 'rgba(255, 56, 73, 0.1)',
        border: '1px solid rgba(255, 56, 73, 0.3)',
        color: '#ff5e6d',
        padding: '6px 14px',
        borderRadius: 10,
        cursor: 'pointer',
        fontSize: 12.5,
        fontWeight: 700,
        transition: 'all 0.2s',
    },

    // Tab bar — touch-friendly
    tabBar: {
        display: 'flex',
        background: 'var(--surface2)',
        borderBottom: '1px solid var(--border)',
        overflowX: 'auto' as any,
        padding: '4px 8px',
        gap: 6,
    },
    tabBtn: {
        flex: 1,
        minWidth: 64,
        padding: '10px 8px',
        border: 'none',
        borderRadius: 12,
        background: 'transparent',
        color: 'var(--text-muted)',
        fontWeight: 700,
        fontSize: 12,
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 4,
        transition: 'all .2s ease',
        minHeight: 52,
    } as any,
    tabActive: {
        color: '#fff',
        background: 'var(--grad-red)',
        boxShadow: '0 4px 16px var(--red-glow)',
    },
    tabLabel: { fontSize: 10.5, fontWeight: 700 },

    // Content
    content: { padding: '20px 16px', maxWidth: 740, margin: '0 auto' },

    // Home
    homeGrid: { display: 'flex', flexDirection: 'column', gap: 24 },
    hint: { color: 'var(--text-muted)', fontSize: 13.5, lineHeight: 1.6, marginBottom: 16 },

    // SOS
    sosSection: { display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', paddingTop: 10 },
    sosBtn: { background: 'none', border: 'none', cursor: 'pointer', position: 'relative', width: 220, height: 220 },
    sosBtnInner: {
        position: 'absolute',
        inset: 0,
        borderRadius: '50%',
        background: 'radial-gradient(circle at 35% 35%, #ff5264, #e6132d 60%, #990012 100%)',
        boxShadow: '0 0 70px rgba(255, 56, 73, 0.6), 0 0 120px rgba(255, 56, 73, 0.25)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        transition: 'transform 0.15s ease',
    },
    sosPulse: {
        position: 'absolute',
        inset: -16,
        borderRadius: '50%',
        border: '3px solid rgba(255, 56, 73, 0.45)',
        animation: 'ping 2s cubic-bezier(0, 0, 0.2, 1) infinite',
    } as any,
    sosBtnLabel: { color: '#fff', fontWeight: 900, fontSize: 34, letterSpacing: 6 },
    sosBtnHint: { color: 'rgba(255,255,255,0.85)', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 },
    sosCaption: { color: 'var(--text-dim)', fontSize: 12.5, marginTop: 16, maxWidth: 320, fontWeight: 500 },

    // Countdown
    countdownWrap: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 },
    countdownNum: { fontSize: 110, fontWeight: 900, color: '#ff3849', lineHeight: 1, textShadow: '0 0 40px rgba(255,56,73,0.8)' },
    cancelBtn: {
        background: 'var(--surface2)',
        border: '2px solid rgba(255, 56, 73, 0.5)',
        color: '#ff5e6d',
        padding: '14px 36px',
        borderRadius: 14,
        cursor: 'pointer',
        fontWeight: 800,
        fontSize: 16,
        boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
    },

    // SOS sent
    sentCard: {
        background: 'linear-gradient(180deg, rgba(16, 185, 129, 0.15) 0%, rgba(14, 19, 34, 0.95) 100%)',
        border: '1px solid rgba(16, 185, 129, 0.4)',
        borderRadius: 24,
        padding: '32px 24px',
        textAlign: 'center',
        width: '100%',
        boxShadow: '0 12px 40px var(--green-glow)',
    },
    sentTitle: { fontSize: 24, fontWeight: 900, color: '#34d399', marginTop: 12 },
    sentSub: { color: 'var(--text-muted)', fontSize: 14, lineHeight: 1.6, marginTop: 12, maxWidth: 360, margin: '12px auto 0' },

    // Emergency service grid
    section: { display: 'flex', flexDirection: 'column', gap: 14 },
    sectionTitle: { fontSize: 17, fontWeight: 800, color: '#fff', letterSpacing: -0.3 },
    serviceGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 },
    serviceCard: {
        background: 'var(--grad-surface)',
        border: '1px solid var(--border)',
        borderRadius: 18,
        padding: '18px 12px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 8,
        cursor: 'pointer',
        transition: 'all .2s ease',
        boxShadow: 'var(--shadow-sm)',
    } as any,
    serviceIconWrap: { width: 54, height: 54, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26 },
    serviceNum: { fontSize: 17, fontWeight: 900, letterSpacing: 0.5 },
    serviceLabel: { color: '#fff', fontSize: 12, fontWeight: 800 },
    serviceCta: { fontSize: 11, fontWeight: 700, color: 'var(--text-muted)' },

    // Status chips
    statusRow: { display: 'flex', gap: 8, flexWrap: 'wrap' as any },
    statusChip: {
        background: 'var(--surface2)',
        border: '1px solid var(--border)',
        borderRadius: 20,
        padding: '8px 14px',
        fontSize: 12.5,
        display: 'flex',
        gap: 8,
        alignItems: 'center',
        fontWeight: 600,
    },

    // Alert tab
    successBanner: { background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.4)', color: '#34d399', padding: '14px 18px', borderRadius: 14, fontWeight: 700, fontSize: 14, marginBottom: 20 },
    quickGrid: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginBottom: 12 },
    quickCard: {
        background: 'var(--grad-surface)',
        border: '1px solid var(--border)',
        borderRadius: 16,
        padding: '18px 14px',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 10,
        transition: 'all .2s ease',
        boxShadow: 'var(--shadow-sm)',
    },
    quickLabel: { fontSize: 13, fontWeight: 700, color: '#fff', textAlign: 'center' as any },
    textarea: {
        background: 'var(--surface2)',
        border: '1px solid var(--border)',
        borderRadius: 14,
        padding: '16px',
        color: '#fff',
        fontSize: 14.5,
        width: '100%',
        resize: 'vertical' as any,
        lineHeight: 1.6,
        outline: 'none',
        marginBottom: 14,
        boxSizing: 'border-box' as any,
    },
    sendBtn: {
        background: 'var(--grad-red)',
        border: 'none',
        color: '#fff',
        borderRadius: 14,
        padding: '16px',
        fontWeight: 800,
        fontSize: 15,
        cursor: 'pointer',
        width: '100%',
        boxShadow: '0 6px 20px var(--red-glow)',
        transition: 'all .2s ease',
    },
    tipBox: {
        background: 'rgba(59, 130, 246, 0.1)',
        border: '1px solid rgba(59, 130, 246, 0.3)',
        color: '#93c5fd',
        borderRadius: 16,
        padding: '16px 20px',
        fontSize: 13.5,
        lineHeight: 1.6,
        marginTop: 18,
    },

    // Map tab
    coordCard: {
        background: 'var(--grad-surface)',
        border: '1px solid var(--border)',
        borderRadius: 18,
        padding: '18px 20px',
        marginBottom: 16,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
    },
    coordRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: 10, flexWrap: 'wrap' as any, gap: 4 },
    coordLabel: { color: 'var(--text-muted)', fontSize: 13, fontWeight: 600 },
    coordValue: { color: '#fff', fontSize: 14, fontFamily: "'JetBrains Mono', monospace", fontWeight: 700 },
    mapFrame: { height: 320, borderRadius: 16, overflow: 'hidden', border: '1px solid var(--border)', marginBottom: 16 },
    openMapsBtn: { display: 'block', textAlign: 'center' as any, background: 'var(--surface2)', border: '1px solid var(--border)', color: '#60a5fa', borderRadius: 12, padding: '14px', fontWeight: 800, fontSize: 14, textDecoration: 'none' },

    // History tab
    refreshBtn: { background: 'var(--surface2)', border: '1px solid var(--border)', color: '#fff', padding: '8px 16px', borderRadius: 10, cursor: 'pointer', fontSize: 13, fontWeight: 700 },
    emptyState: { background: 'var(--grad-surface)', border: '1px solid var(--border)', borderRadius: 20, padding: '54px 20px', textAlign: 'center' as any, fontSize: 14 },
    alertCard: { background: 'var(--grad-surface)', border: '1px solid var(--border)', borderLeft: '4px solid', borderRadius: 16, padding: '16px 20px', marginBottom: 12 },
    alertTop: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, flexWrap: 'wrap' as any },
    alertBadge: { padding: '4px 12px', borderRadius: 8, fontSize: 11, fontWeight: 800 },
    alertMsg: { color: '#e2e8f0', fontSize: 14, lineHeight: 1.5, margin: '0 0 8px' },

    // Profile tab
    profileCard: {
        background: 'var(--grad-surface)',
        border: '1px solid var(--border)',
        borderRadius: 20,
        padding: '24px',
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        gap: 20,
        alignItems: isMobile ? 'center' : 'flex-start',
        marginBottom: 24,
        textAlign: isMobile ? 'center' : 'left',
    } as any,
    profileAvatar: { width: 64, height: 64, borderRadius: '50%', background: 'var(--grad-red)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, fontWeight: 900, color: '#fff', flexShrink: 0, boxShadow: '0 8px 24px var(--red-glow)' },
    profileName: { fontSize: 20, fontWeight: 900, marginBottom: 4, color: '#fff' },
    profileEmail: { color: 'var(--text-muted)', fontSize: 13.5, marginBottom: 10 },
    profileRole: { color: 'var(--text-dim)', fontSize: 12.5, marginBottom: 4 },
    profileEmergBtn: { background: 'var(--surface2)', border: '1px solid', borderRadius: 10, padding: '10px 14px', cursor: 'pointer', fontSize: 12.5, fontWeight: 700, textAlign: 'left' as any },
    statsRow: { display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(3, 1fr)', gap: 12 } as any,
    statCard: { background: 'var(--grad-surface)', border: '1px solid var(--border)', borderRadius: 16, padding: '18px', textAlign: 'center' as any },
    statNum: { fontSize: 32, fontWeight: 900, marginBottom: 4 },
    statLabel: { color: 'var(--text-muted)', fontSize: 12.5, fontWeight: 700 },

    // Bottom strip
    strip: {
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        background: 'rgba(10, 14, 26, 0.88)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderTop: '1px solid var(--border)',
        padding: '10px 16px',
        display: 'flex',
        gap: 10,
        justifyContent: 'center',
        flexWrap: 'wrap' as any,
        zIndex: 200,
        boxShadow: '0 -8px 24px rgba(0,0,0,0.4)',
    },
    stripBtn: {
        border: '1px solid',
        borderRadius: 24,
        padding: '8px 16px',
        fontSize: 12.5,
        fontWeight: 800,
        whiteSpace: 'nowrap' as any,
        cursor: 'pointer',
        background: 'var(--surface2)',
        transition: 'transform .15s',
    },
};

/* ─── Modal Styles ───────────────────────────────────────────────────────── */
const m: Record<string, React.CSSProperties> = {
    overlay: {
        position: 'fixed',
        inset: 0,
        background: 'rgba(4, 7, 16, 0.82)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        animation: 'overlayIn .25s ease',
    } as any,
    modal: {
        background: 'linear-gradient(180deg, #131a30 0%, #0c1020 100%)',
        border: '1px solid var(--border)',
        borderRadius: '28px 28px 0 0',
        width: '100%',
        maxWidth: 580,
        maxHeight: '90vh',
        overflowY: 'auto',
        animation: 'fadeIn .3s ease',
        boxShadow: '0 -20px 60px rgba(0, 0, 0, 0.7)',
    } as any,

    modalHeader: {
        padding: '24px 22px 20px',
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        borderRadius: '28px 28px 0 0',
        position: 'relative',
        boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
    },
    modalTitle: { fontSize: 21, fontWeight: 900, color: '#fff', letterSpacing: -0.3 },
    modalSubtitle: { fontSize: 13, color: 'rgba(255,255,255,0.85)', marginTop: 2, fontWeight: 600 },
    closeBtn: {
        position: 'absolute',
        top: 18,
        right: 18,
        background: 'rgba(255,255,255,0.2)',
        border: 'none',
        color: '#fff',
        width: 36,
        height: 36,
        borderRadius: '50%',
        cursor: 'pointer',
        fontSize: 16,
        fontWeight: 800,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'background 0.2s',
    },

    modalBody: { padding: '22px' },

    loadingBox: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, padding: '44px 0' },
    spinner: { width: 50, height: 50, border: '4px solid #1E2438', borderTop: '4px solid #3B82F6', borderRadius: '50%', animation: 'spin 0.8s linear infinite' } as any,
    loadingText: { color: '#fff', fontSize: 16.5, fontWeight: 800 },
    loadingHint: { color: 'var(--text-muted)', fontSize: 13 },

    fallbackBanner: { background: 'rgba(245, 158, 11, 0.12)', border: '1px solid rgba(245, 158, 11, 0.35)', color: '#fbbf24', borderRadius: 12, padding: '12px 16px', fontSize: 13, marginBottom: 16, fontWeight: 600 },

    stationCard: {
        background: 'var(--grad-surface)',
        border: '1px solid var(--border)',
        borderRadius: 18,
        padding: '20px',
        display: 'flex',
        gap: 16,
        alignItems: 'flex-start',
        marginBottom: 20,
        boxShadow: 'var(--shadow-sm)',
    },
    stationIcon: {
        width: 58,
        height: 58,
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 28,
        flexShrink: 0,
    },
    stationInfo: { flex: 1 },
    stationName: { fontSize: 18, fontWeight: 900, color: '#fff', marginBottom: 6, lineHeight: 1.3 },
    stationAddr: { color: 'var(--text-muted)', fontSize: 13, marginBottom: 8, lineHeight: 1.5 },
    distanceBadge: { display: 'inline-block', padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 800 },

    phoneSection: {
        background: 'rgba(0, 0, 0, 0.35)',
        border: '1px solid var(--border)',
        borderRadius: 16,
        padding: '18px 20px',
        marginBottom: 20,
        textAlign: 'center' as any,
    },
    phoneLabel: { color: 'var(--text-muted)', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4 },
    phoneNumber: { fontSize: 34, fontWeight: 900, letterSpacing: 2, fontFamily: "'JetBrains Mono', monospace" },

    callBtn: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        width: '100%',
        border: 'none',
        borderRadius: 16,
        padding: '18px',
        cursor: 'pointer',
        marginBottom: 14,
        animation: 'callPulse 2s ease-in-out infinite',
        boxShadow: 'var(--shadow-md)',
    } as any,
    callBtnLabel: { color: '#fff', fontWeight: 900, fontSize: 20, letterSpacing: 2 },
    callBtnNum: { color: 'rgba(255,255,255,0.85)', fontSize: 15, fontFamily: "'JetBrains Mono', monospace", fontWeight: 700 },

    callingBox: {
        background: 'rgba(16, 185, 129, 0.12)',
        border: '1px solid rgba(16, 185, 129, 0.35)',
        borderRadius: 16,
        padding: '24px',
        textAlign: 'center' as any,
        marginBottom: 14,
    },
    callingText: { color: '#34d399', fontWeight: 900, fontSize: 18, marginTop: 8 },
    callingHint: { color: 'var(--text-muted)', fontSize: 13, marginTop: 6 },

    mapsLink: {
        display: 'block',
        textAlign: 'center' as any,
        color: '#60a5fa',
        fontSize: 13.5,
        textDecoration: 'none',
        fontWeight: 800,
        padding: '13px',
        borderRadius: 12,
        border: '1px solid rgba(59, 130, 246, 0.3)',
        background: 'rgba(59, 130, 246, 0.1)',
        transition: 'all 0.2s',
    },
};
