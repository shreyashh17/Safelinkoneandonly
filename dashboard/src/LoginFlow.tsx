import React, { useState } from 'react';
import api from './api';

type Step = 'landing' | 'admin-login' | 'admin-register' | 'user-login' | 'user-register';

interface Props {
    onLogin: (token: string, role: string, userInfo: any) => void;
}

export default function LoginFlow({ onLogin }: Props) {
    const [step, setStep] = useState<Step>('landing');
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPw, setShowPw] = useState(false);

    // If an existing citizen user attempts to login on the admin portal
    const [citizenConflictUser, setCitizenConflictUser] = useState<any | null>(null);

    const reset = (next: Step) => {
        setName(''); setEmail(''); setPassword(''); setConfirmPassword('');
        setError(''); setSuccess(''); setLoading(false); setShowPw(false);
        setCitizenConflictUser(null);
        setStep(next);
    };

    const finishLogin = (data: any) => {
        localStorage.setItem('token', data.token);
        localStorage.setItem('role', data.role);
        localStorage.setItem('userInfo', JSON.stringify({ name: data.name, email: data.email }));
        onLogin(data.token, data.role, { name: data.name, email: data.email });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setSuccess('');
        setCitizenConflictUser(null);

        const isRegister = step === 'admin-register' || step === 'user-register';
        const isAdmin = step === 'admin-login' || step === 'admin-register';
        const cleanEmail = email.trim().toLowerCase();
        const cleanName = name.trim();

        if (!cleanEmail) {
            setError('Please enter your email address.');
            setLoading(false);
            return;
        }
        if (!password) {
            setError('Please enter your password.');
            setLoading(false);
            return;
        }

        if (isRegister) {
            if (!cleanName) {
                setError('Full name is required.');
                setLoading(false);
                return;
            }
            if (password.length < 6) {
                setError('Password must be at least 6 characters.');
                setLoading(false);
                return;
            }
            if (password !== confirmPassword) {
                setError("Passwords do not match. Please verify.");
                setLoading(false);
                return;
            }
        }

        try {
            const endpoint = isRegister ? '/api/auth/register' : '/api/auth/login';
            const body: any = isRegister
                ? { name: cleanName, email: cleanEmail, password, role: isAdmin ? 'admin' : 'user' }
                : { email: cleanEmail, password };

            const res = await api.post(endpoint, body);

            // If logging into admin portal but the user is registered as a citizen
            if (isAdmin && res.data.role !== 'admin') {
                setCitizenConflictUser({
                    email: res.data.email,
                    name: res.data.name,
                    token: res.data.token,
                    role: res.data.role,
                });
                setLoading(false);
                return;
            }

            if (isRegister) {
                const msg = res.data.message || (isAdmin ? 'Admin account created! Launching Command Center…' : 'Citizen account created! Entering Portal…');
                setSuccess(msg);
                setTimeout(() => finishLogin(res.data), 700);
            } else {
                setSuccess('Authentication verified! Redirecting…');
                setTimeout(() => finishLogin(res.data), 350);
            }
        } catch (err: any) {
            const msg = err?.response?.data?.error || (isRegister ? 'Registration failed. Please check your information.' : 'Invalid email or password.');
            setError(msg);
            setLoading(false);
        }
    };

    const handleUpgradeToAdmin = async () => {
        if (!citizenConflictUser) return;
        setLoading(true);
        setError('');
        try {
            const res = await api.post('/api/auth/upgrade', {
                email: citizenConflictUser.email,
                password,
            });
            setSuccess('Account elevated to Admin! Launching Dashboard…');
            setCitizenConflictUser(null);
            setTimeout(() => finishLogin(res.data), 700);
        } catch (err: any) {
            setError(err?.response?.data?.error || 'Failed to elevate account.');
            setLoading(false);
        }
    };

    const handleContinueAsCitizen = () => {
        if (citizenConflictUser) {
            finishLogin(citizenConflictUser);
        }
    };

    /* ─── 1. Landing View (Portal Selection) ─────────────────────────────────── */
    if (step === 'landing') {
        return (
            <div style={styles.landingPage}>
                {/* Background ambient lighting */}
                <div style={styles.ambientGlowRed} />
                <div style={styles.ambientGlowBlue} />

                <div style={styles.landingContent}>
                    {/* Status Pill */}
                    <div style={styles.liveBadgeWrap}>
                        <span style={styles.liveDot} />
                        <span style={styles.liveBadgeText}>Emergency Response Network · 100% Operational</span>
                    </div>

                    {/* Logo & Headline */}
                    <div style={styles.heroSection}>
                        <div style={styles.logoBadge}>
                            <img src="/logo2.png" alt="SafeLink Logo" style={styles.logoImg} />
                        </div>
                        <h1 style={styles.heroTitle}>SafeLink</h1>
                        <p style={styles.heroSubtitle}>
                            Next-Generation Real-Time Emergency Help &amp; Disaster Response Platform
                        </p>
                    </div>

                    {/* Two Portal Cards */}
                    <div style={styles.portalGrid}>
                        {/* 1. Admin Command Center Card */}
                        <div style={styles.portalCardAdmin}>
                            <div style={styles.cardTopRow}>
                                <div style={styles.cardIconBoxRed}>🛡️</div>
                                <span style={styles.cardTagRed}>AUTHORITY DISPATCH</span>
                            </div>
                            <h2 style={styles.cardHeading}>Admin Command Center</h2>
                            <p style={styles.cardText}>
                                Central command for Police, Fire, Ambulance dispatch &amp; Disaster Management Authorities.
                            </p>
                            
                            <div style={styles.featureList}>
                                <div style={styles.featureItem}>
                                    <span style={styles.checkIconRed}>✓</span> Live SOS alerts stream with sound alert
                                </div>
                                <div style={styles.featureItem}>
                                    <span style={styles.checkIconRed}>✓</span> Real-time citizen GPS mapping &amp; density
                                </div>
                                <div style={styles.featureItem}>
                                    <span style={styles.checkIconRed}>✓</span> Instant government warning broadcasts
                                </div>
                            </div>

                            <div style={styles.cardBtnRow}>
                                <button style={styles.btnPrimaryRed} onClick={() => reset('admin-login')}>
                                    Sign In as Admin →
                                </button>
                                <button style={styles.btnSecondaryRed} onClick={() => reset('admin-register')}>
                                    ➕ Create Admin Account
                                </button>
                            </div>
                        </div>

                        {/* 2. Citizen Emergency Portal Card */}
                        <div style={styles.portalCardUser}>
                            <div style={styles.cardTopRow}>
                                <div style={styles.cardIconBoxBlue}>🆘</div>
                                <span style={styles.cardTagBlue}>CITIZEN LIFELINE</span>
                            </div>
                            <h2 style={styles.cardHeading}>Citizen Emergency Portal</h2>
                            <p style={styles.cardText}>
                                Instant protection for individuals, families &amp; public safety during crises and emergencies.
                            </p>

                            <div style={styles.featureList}>
                                <div style={styles.featureItem}>
                                    <span style={styles.checkIconBlue}>✓</span> 1-tap SOS trigger with live GPS sharing
                                </div>
                                <div style={styles.featureItem}>
                                    <span style={styles.checkIconBlue}>✓</span> Real-time nearest Police, Hospital, Fire
                                </div>
                                <div style={styles.featureItem}>
                                    <span style={styles.checkIconBlue}>✓</span> AI voice distress &amp; quick disaster alerts
                                </div>
                            </div>

                            <div style={styles.cardBtnRow}>
                                <button style={styles.btnPrimaryBlue} onClick={() => reset('user-login')}>
                                    Sign In as Citizen →
                                </button>
                                <button style={styles.btnSecondaryBlue} onClick={() => reset('user-register')}>
                                    ➕ Register as Citizen
                                </button>
                            </div>
                        </div>
                    </div>

                    <div style={styles.footerNote}>
                        🔒 256-Bit Encrypted · Real-Time WebSockets · OpenStreetMap Verified Navigation
                    </div>
                </div>
            </div>
        );
    }

    /* ─── 2. Auth Form View (Admin or Citizen) ───────────────────────────────── */
    const isAdmin = step === 'admin-login' || step === 'admin-register';
    const isRegister = step === 'admin-register' || step === 'user-register';
    const accentColor = isAdmin ? '#ff3849' : '#3b82f6';
    const accentGrad = isAdmin
        ? 'linear-gradient(135deg, #ff4458 0%, #d8142b 100%)'
        : 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)';
    const portalTitle = isAdmin ? 'Admin Command Center' : 'Citizen Emergency Portal';
    const portalSub = isAdmin ? 'Sign in to access authority dispatch tools' : 'Sign in to access your personal emergency lifeline';

    return (
        <div style={styles.formPage}>
            <div style={styles.formCard}>
                {/* Back button */}
                <button style={styles.backButton} onClick={() => reset('landing')}>
                    ← Back to Portals
                </button>

                {/* Form Header */}
                <div style={styles.formHeader}>
                    <div style={{ ...styles.portalBadgeIcon, background: `${accentColor}18`, borderColor: `${accentColor}33`, color: accentColor }}>
                        {isAdmin ? '🛡️' : '🆘'}
                    </div>
                    <h2 style={styles.formTitle}>{portalTitle}</h2>
                    <p style={styles.formSubtitle}>{portalSub}</p>
                </div>

                {/* Tabs */}
                <div style={styles.tabsWrap}>
                    <button
                        type="button"
                        style={{
                            ...styles.tabBtn,
                            ...(isRegister ? {} : { background: accentGrad, color: '#fff', boxShadow: `0 4px 14px ${accentColor}44` }),
                        }}
                        onClick={() => reset(isAdmin ? 'admin-login' : 'user-login')}>
                        🔑 Sign In
                    </button>
                    <button
                        type="button"
                        style={{
                            ...styles.tabBtn,
                            ...(isRegister ? { background: accentGrad, color: '#fff', boxShadow: `0 4px 14px ${accentColor}44` } : {}),
                        }}
                        onClick={() => reset(isAdmin ? 'admin-register' : 'user-register')}>
                        ➕ {isAdmin ? 'Create Admin' : 'Register'}
                    </button>
                </div>

                {/* Conflict Notice (Citizen attempting admin login) */}
                {citizenConflictUser && (
                    <div style={styles.conflictCard}>
                        <div style={styles.conflictHeader}>
                            <span>⚠️ Citizen Account Detected</span>
                        </div>
                        <p style={styles.conflictText}>
                            <strong>{citizenConflictUser.email}</strong> is registered as a Citizen. You can elevate it to Admin or proceed to the Citizen Portal.
                        </p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            <button
                                type="button"
                                style={{ ...styles.btnPrimary, background: 'var(--grad-red)' }}
                                onClick={handleUpgradeToAdmin}
                                disabled={loading}>
                                🚀 Upgrade to Admin &amp; Enter Dashboard
                            </button>
                            <button
                                type="button"
                                style={styles.btnSecondary}
                                onClick={handleContinueAsCitizen}>
                                🚪 Proceed to Citizen Emergency Portal
                            </button>
                        </div>
                    </div>
                )}

                {/* Form */}
                <form onSubmit={handleSubmit} style={styles.formElement} noValidate>
                    {isRegister && (
                        <div style={styles.fieldGroup}>
                            <label style={styles.fieldLabel}>Full Name</label>
                            <input
                                style={styles.fieldInput}
                                type="text"
                                placeholder={isAdmin ? "Officer / Administrator Name" : "Your Full Name"}
                                value={name}
                                onChange={e => setName(e.target.value)}
                                autoFocus={isRegister}
                                required
                            />
                        </div>
                    )}

                    <div style={styles.fieldGroup}>
                        <label style={styles.fieldLabel}>Email Address</label>
                        <input
                            style={styles.fieldInput}
                            type="email"
                            placeholder={isAdmin ? "admin@safelink.com or any email" : "yourname@example.com"}
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            autoFocus={!isRegister}
                            required
                        />
                    </div>

                    <div style={styles.fieldGroup}>
                        <label style={styles.fieldLabel}>Password</label>
                        <div style={{ position: 'relative' }}>
                            <input
                                style={{ ...styles.fieldInput, paddingRight: 48 }}
                                type={showPw ? 'text' : 'password'}
                                placeholder={isRegister ? "Minimum 6 characters" : "Enter your password"}
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                required
                            />
                            <button
                                type="button"
                                style={styles.passwordEyeBtn}
                                onClick={() => setShowPw(!showPw)}
                                title={showPw ? "Hide password" : "Show password"}>
                                {showPw ? '🙈' : '👁️'}
                            </button>
                        </div>
                    </div>

                    {isRegister && (
                        <div style={styles.fieldGroup}>
                            <label style={styles.fieldLabel}>Confirm Password</label>
                            <input
                                style={styles.fieldInput}
                                type={showPw ? 'text' : 'password'}
                                placeholder="Re-type your password"
                                value={confirmPassword}
                                onChange={e => setConfirmPassword(e.target.value)}
                                required
                            />
                        </div>
                    )}

                    {/* Messages */}
                    {error && (
                        <div style={styles.errorAlert}>
                            <span>❌</span>
                            <span>{error}</span>
                        </div>
                    )}

                    {success && (
                        <div style={styles.successAlert}>
                            <span>✅</span>
                            <span>{success}</span>
                        </div>
                    )}

                    {/* Submit Button */}
                    <button
                        type="submit"
                        disabled={loading}
                        style={{ ...styles.btnPrimary, background: accentGrad, opacity: loading ? 0.7 : 1 }}>
                        {loading ? '⏳ Verifying credentials…' : isRegister
                            ? (isAdmin ? '🛡️ Create Admin Account & Sign In' : '➕ Create Account & Sign In')
                            : (isAdmin ? '🛡️ Sign In to Command Center' : '🆘 Enter Emergency Portal')}
                    </button>
                </form>

                {/* Alternate link */}
                <div style={styles.altSwitchRow}>
                    <button
                        type="button"
                        style={styles.altSwitchBtn}
                        onClick={() => reset(isRegister
                            ? (isAdmin ? 'admin-login' : 'user-login')
                            : (isAdmin ? 'admin-register' : 'user-register'))}>
                        {isRegister ? 'Already registered? Sign in instead →' : (isAdmin ? 'Need a new admin account? Create here →' : 'New citizen? Register here →')}
                    </button>
                </div>
            </div>
        </div>
    );
}

/* ─── Styles ────────────────────────────────────────────────────────────────── */
const styles: Record<string, React.CSSProperties> = {
    landingPage: {
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '36px 20px',
        position: 'relative',
        overflow: 'hidden',
    },
    ambientGlowRed: {
        position: 'absolute',
        top: '10%',
        left: '20%',
        width: 480,
        height: 480,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(255, 56, 73, 0.12) 0%, transparent 70%)',
        filter: 'blur(50px)',
        pointerEvents: 'none',
    },
    ambientGlowBlue: {
        position: 'absolute',
        bottom: '10%',
        right: '20%',
        width: 480,
        height: 480,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(59, 130, 246, 0.12) 0%, transparent 70%)',
        filter: 'blur(50px)',
        pointerEvents: 'none',
    },
    landingContent: {
        width: '100%',
        maxWidth: 960,
        zIndex: 10,
        textAlign: 'center',
    },
    liveBadgeWrap: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        background: 'rgba(16, 185, 129, 0.1)',
        border: '1px solid rgba(16, 185, 129, 0.3)',
        borderRadius: 30,
        padding: '6px 16px',
        marginBottom: 20,
    },
    liveDot: {
        width: 8,
        height: 8,
        borderRadius: '50%',
        background: '#10b981',
        boxShadow: '0 0 10px #10b981',
    },
    liveBadgeText: {
        color: '#34d399',
        fontSize: 12.5,
        fontWeight: 700,
        letterSpacing: 0.3,
    },
    heroSection: {
        marginBottom: 36,
    },
    logoBadge: {
        width: 80,
        height: 80,
        borderRadius: 24,
        background: 'linear-gradient(135deg, rgba(255, 56, 73, 0.2) 0%, rgba(14, 19, 34, 0.8) 100%)',
        border: '1px solid rgba(255, 255, 255, 0.12)',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
        boxShadow: '0 12px 30px rgba(0, 0, 0, 0.4)',
    },
    logoImg: {
        width: 52,
        height: 52,
        objectFit: 'contain',
    },
    heroTitle: {
        fontSize: 48,
        fontWeight: 900,
        letterSpacing: -1,
        color: '#fff',
        margin: '0 0 8px',
        background: 'linear-gradient(180deg, #ffffff 40%, #cbd5e1 100%)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
    },
    heroSubtitle: {
        fontSize: 16,
        color: 'var(--text-muted)',
        maxWidth: 620,
        margin: '0 auto',
        lineHeight: 1.6,
    },

    portalGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        gap: 24,
        marginBottom: 36,
        textAlign: 'left',
    },
    portalCardAdmin: {
        background: 'linear-gradient(180deg, rgba(26, 18, 28, 0.7) 0%, rgba(14, 19, 34, 0.95) 100%)',
        border: '1px solid rgba(255, 56, 73, 0.3)',
        borderRadius: 24,
        padding: '32px 28px',
        boxShadow: '0 20px 45px rgba(0, 0, 0, 0.5), 0 0 30px rgba(255, 56, 73, 0.1)',
        display: 'flex',
        flexDirection: 'column',
        transition: 'transform 0.25s ease, border-color 0.25s ease',
    },
    portalCardUser: {
        background: 'linear-gradient(180deg, rgba(16, 24, 44, 0.7) 0%, rgba(14, 19, 34, 0.95) 100%)',
        border: '1px solid rgba(59, 130, 246, 0.3)',
        borderRadius: 24,
        padding: '32px 28px',
        boxShadow: '0 20px 45px rgba(0, 0, 0, 0.5), 0 0 30px rgba(59, 130, 246, 0.1)',
        display: 'flex',
        flexDirection: 'column',
        transition: 'transform 0.25s ease, border-color 0.25s ease',
    },
    cardTopRow: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    cardIconBoxRed: {
        fontSize: 32,
    },
    cardIconBoxBlue: {
        fontSize: 32,
    },
    cardTagRed: {
        background: 'rgba(255, 56, 73, 0.15)',
        border: '1px solid rgba(255, 56, 73, 0.35)',
        color: '#ff5e6d',
        padding: '4px 12px',
        borderRadius: 20,
        fontSize: 11,
        fontWeight: 800,
        letterSpacing: 0.8,
    },
    cardTagBlue: {
        background: 'rgba(59, 130, 246, 0.15)',
        border: '1px solid rgba(59, 130, 246, 0.35)',
        color: '#60a5fa',
        padding: '4px 12px',
        borderRadius: 20,
        fontSize: 11,
        fontWeight: 800,
        letterSpacing: 0.8,
    },
    cardHeading: {
        fontSize: 22,
        fontWeight: 800,
        color: '#fff',
        margin: '0 0 8px',
    },
    cardText: {
        fontSize: 13.5,
        color: 'var(--text-muted)',
        lineHeight: 1.6,
        marginBottom: 20,
    },
    featureList: {
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        marginBottom: 28,
        flex: 1,
    },
    featureItem: {
        fontSize: 13,
        color: '#cbd5e1',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
    },
    checkIconRed: {
        color: '#ff4458',
        fontWeight: 900,
        fontSize: 14,
    },
    checkIconBlue: {
        color: '#3b82f6',
        fontWeight: 900,
        fontSize: 14,
    },
    cardBtnRow: {
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
    },
    btnPrimaryRed: {
        background: 'var(--grad-red)',
        color: '#fff',
        border: 'none',
        borderRadius: 14,
        padding: '14px',
        fontSize: 14.5,
        fontWeight: 800,
        cursor: 'pointer',
        boxShadow: '0 6px 20px rgba(255, 56, 73, 0.3)',
        transition: 'transform 0.2s',
        textAlign: 'center',
    },
    btnSecondaryRed: {
        background: 'rgba(255, 56, 73, 0.08)',
        border: '1px solid rgba(255, 56, 73, 0.3)',
        color: '#ff5e6d',
        borderRadius: 14,
        padding: '12px',
        fontSize: 13.5,
        fontWeight: 700,
        cursor: 'pointer',
        textAlign: 'center',
    },
    btnPrimaryBlue: {
        background: 'var(--grad-blue)',
        color: '#fff',
        border: 'none',
        borderRadius: 14,
        padding: '14px',
        fontSize: 14.5,
        fontWeight: 800,
        cursor: 'pointer',
        boxShadow: '0 6px 20px rgba(59, 130, 246, 0.3)',
        transition: 'transform 0.2s',
        textAlign: 'center',
    },
    btnSecondaryBlue: {
        background: 'rgba(59, 130, 246, 0.08)',
        border: '1px solid rgba(59, 130, 246, 0.3)',
        color: '#60a5fa',
        borderRadius: 14,
        padding: '12px',
        fontSize: 13.5,
        fontWeight: 700,
        cursor: 'pointer',
        textAlign: 'center',
    },
    footerNote: {
        color: 'var(--text-dim)',
        fontSize: 12.5,
        fontWeight: 600,
    },

    /* Form Card Styles */
    formPage: {
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 16px',
    },
    formCard: {
        background: 'var(--grad-surface)',
        border: '1px solid var(--border)',
        borderRadius: 28,
        padding: '36px 32px',
        width: '100%',
        maxWidth: 460,
        boxShadow: 'var(--shadow-lg)',
        position: 'relative',
    },
    backButton: {
        background: 'none',
        border: 'none',
        color: 'var(--text-muted)',
        fontSize: 13,
        fontWeight: 700,
        cursor: 'pointer',
        marginBottom: 16,
        padding: 0,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
    },
    formHeader: {
        textAlign: 'center',
        marginBottom: 24,
    },
    portalBadgeIcon: {
        width: 56,
        height: 56,
        borderRadius: 18,
        border: '1px solid',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 26,
        marginBottom: 12,
    },
    formTitle: {
        fontSize: 24,
        fontWeight: 900,
        color: '#fff',
        margin: '0 0 6px',
        letterSpacing: -0.3,
    },
    formSubtitle: {
        fontSize: 13.5,
        color: 'var(--text-muted)',
        margin: 0,
    },
    tabsWrap: {
        display: 'flex',
        gap: 8,
        background: 'var(--surface2)',
        padding: 5,
        borderRadius: 16,
        marginBottom: 24,
        border: '1px solid var(--border)',
    },
    tabBtn: {
        flex: 1,
        background: 'transparent',
        border: 'none',
        borderRadius: 12,
        padding: '10px 0',
        fontSize: 13.5,
        fontWeight: 700,
        color: 'var(--text-muted)',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
    },
    conflictCard: {
        background: 'rgba(245, 158, 11, 0.1)',
        border: '1px solid rgba(245, 158, 11, 0.3)',
        borderRadius: 16,
        padding: '16px',
        marginBottom: 20,
    },
    conflictHeader: {
        color: '#f59e0b',
        fontWeight: 800,
        fontSize: 14,
        marginBottom: 6,
    },
    conflictText: {
        color: '#e2e8f0',
        fontSize: 13,
        lineHeight: 1.5,
        marginBottom: 14,
    },
    formElement: {
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
    },
    fieldGroup: {
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
    },
    fieldLabel: {
        fontSize: 13,
        fontWeight: 700,
        color: '#cbd5e1',
    },
    fieldInput: {
        background: 'var(--surface2)',
        border: '1px solid var(--border)',
        borderRadius: 12,
        padding: '13px 16px',
        color: '#fff',
        fontSize: 14.5,
        outline: 'none',
        width: '100%',
        transition: 'border-color 0.2s',
    },
    passwordEyeBtn: {
        position: 'absolute',
        right: 14,
        top: '50%',
        transform: 'translateY(-50%)',
        background: 'none',
        border: 'none',
        color: 'var(--text-muted)',
        fontSize: 18,
        cursor: 'pointer',
    },
    errorAlert: {
        background: 'rgba(255, 56, 73, 0.12)',
        border: '1px solid rgba(255, 56, 73, 0.35)',
        color: '#ff6b78',
        borderRadius: 12,
        padding: '12px 14px',
        fontSize: 13.5,
        display: 'flex',
        alignItems: 'center',
        gap: 10,
    },
    successAlert: {
        background: 'rgba(16, 185, 129, 0.12)',
        border: '1px solid rgba(16, 185, 129, 0.35)',
        color: '#34d399',
        borderRadius: 12,
        padding: '12px 14px',
        fontSize: 13.5,
        display: 'flex',
        alignItems: 'center',
        gap: 10,
    },
    btnPrimary: {
        color: '#fff',
        border: 'none',
        borderRadius: 14,
        padding: '14px',
        fontSize: 15,
        fontWeight: 800,
        cursor: 'pointer',
        boxShadow: 'var(--shadow-sm)',
        transition: 'transform 0.2s',
        marginTop: 4,
    },
    btnSecondary: {
        background: 'transparent',
        border: '1px solid var(--border)',
        color: 'var(--text-muted)',
        borderRadius: 14,
        padding: '12px',
        fontSize: 13.5,
        fontWeight: 700,
        cursor: 'pointer',
    },
    altSwitchRow: {
        marginTop: 20,
        textAlign: 'center',
    },
    altSwitchBtn: {
        background: 'none',
        border: 'none',
        color: 'var(--text-muted)',
        fontSize: 13,
        fontWeight: 600,
        cursor: 'pointer',
        textDecoration: 'underline',
    },
};
