import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import localStore from '../services/localStore';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'safelink_dev_secret';

// Helper to check if Firebase is properly configured
function isFirebaseConfigured(): boolean {
    const p = process.env.FIREBASE_PROJECT_ID;
    return !!p && p !== 'your_firebase_project_id';
}

async function findUserByEmail(email: string): Promise<any | null> {
    const clean = (email || '').trim().toLowerCase();
    if (!clean) return null;

    if (isFirebaseConfigured()) {
        try {
            const { firestore } = await import('../services/firebase');
            if (firestore) {
                const snap = await firestore.collection('users').get();
                for (const doc of snap.docs) {
                    const d = doc.data();
                    if (d.email?.trim().toLowerCase() === clean) {
                        return { uid: doc.id, ...d };
                    }
                }
            }
        } catch (err: any) {
            console.warn('⚠️ Firestore read warning, using localStore fallback:', err.message);
        }
    }

    const allUsers = localStore.getAll<any>('users');
    return allUsers.find(u => u.email?.trim().toLowerCase() === clean) ?? null;
}

async function saveUser(uid: string, data: object): Promise<void> {
    localStore.set('users', uid, data);
    if (isFirebaseConfigured()) {
        try {
            const { firestore } = await import('../services/firebase');
            if (firestore) {
                await firestore.collection('users').doc(uid).set(data, { merge: true });
            }
        } catch (err: any) {
            console.warn('⚠️ Firestore sync warning:', err.message);
        }
    }
}

// ── Register (Citizen or Admin) ──────────────────────────────────────────────
router.post('/register', async (req: Request, res: Response): Promise<void> => {
    const { name, email, password, phone, emergencyContact, role } = req.body;

    if (!name || !name.trim()) {
        res.status(400).json({ error: 'Full name is required' });
        return;
    }
    if (!email || !email.trim()) {
        res.status(400).json({ error: 'Email address is required' });
        return;
    }
    if (!password || password.length < 6) {
        res.status(400).json({ error: 'Password must be at least 6 characters' });
        return;
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanName = name.trim();
    // Determine role: if explicitly requested as 'admin', or ends with @admin.safelink
    const targetRole = (role === 'admin' || cleanEmail.endsWith('@admin.safelink')) ? 'admin' : 'user';

    const existing = await findUserByEmail(cleanEmail);
    if (existing) {
        // If account exists, test if credentials match so user isn't stuck
        const passwordMatches = await bcrypt.compare(password, existing.passwordHash);
        if (passwordMatches) {
            // If they are registering from admin portal, upgrade role if needed
            if (targetRole === 'admin' && existing.role !== 'admin') {
                existing.role = 'admin';
                existing.name = cleanName || existing.name;
                await saveUser(existing.uid, existing);
            }
            const token = jwt.sign(
                { uid: existing.uid, email: existing.email, role: existing.role },
                JWT_SECRET,
                { expiresIn: '30d' }
            );
            res.status(200).json({
                token,
                uid: existing.uid,
                name: existing.name,
                email: existing.email,
                role: existing.role,
                message: existing.role === 'admin'
                    ? 'Account upgraded to Admin and signed in successfully!'
                    : 'Account already exists. Signed in successfully!'
            });
            return;
        }

        res.status(409).json({
            error: 'An account with this email already exists. Please sign in or use another email.'
        });
        return;
    }

    const hashed = await bcrypt.hash(password, 12);
    const uid = localStore.newId();
    const userData = {
        uid,
        name: cleanName,
        email: cleanEmail,
        phone: phone ? String(phone).trim() : '',
        emergencyContact: emergencyContact ? String(emergencyContact).trim() : '',
        passwordHash: hashed,
        role: targetRole,
        createdAt: new Date().toISOString(),
    };

    await saveUser(uid, userData);

    const token = jwt.sign(
        { uid, email: cleanEmail, role: targetRole },
        JWT_SECRET,
        { expiresIn: '30d' }
    );

    res.status(201).json({
        token,
        uid,
        name: userData.name,
        email: userData.email,
        role: userData.role,
        message: 'Account created successfully!'
    });
});

// ── Login ────────────────────────────────────────────────────────────────────
router.post('/login', async (req: Request, res: Response): Promise<void> => {
    const { email, password } = req.body;
    if (!email || !password) {
        res.status(400).json({ error: 'Email and password are required' });
        return;
    }

    const cleanEmail = email.trim().toLowerCase();
    const user = await findUserByEmail(cleanEmail);
    if (!user) {
        res.status(401).json({ error: 'No account found with this email. Please check your email or register.' });
        return;
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
        res.status(401).json({ error: 'Incorrect password. Please try again.' });
        return;
    }

    const token = jwt.sign(
        { uid: user.uid, email: user.email, role: user.role },
        JWT_SECRET,
        { expiresIn: '30d' }
    );

    res.json({
        token,
        uid: user.uid,
        name: user.name,
        email: user.email,
        role: user.role,
    });
});

// ── Upgrade Account to Admin ──────────────────────────────────────────────────
router.post('/upgrade', async (req: Request, res: Response): Promise<void> => {
    const { email, password } = req.body;
    if (!email) {
        res.status(400).json({ error: 'Email is required' });
        return;
    }

    const cleanEmail = email.trim().toLowerCase();
    const user = await findUserByEmail(cleanEmail);
    if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
    }

    // Verify password if provided
    if (password) {
        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) {
            res.status(401).json({ error: 'Incorrect password' });
            return;
        }
    }

    user.role = 'admin';
    await saveUser(user.uid, user);

    const token = jwt.sign(
        { uid: user.uid, email: user.email, role: 'admin' },
        JWT_SECRET,
        { expiresIn: '30d' }
    );

    res.json({
        token,
        uid: user.uid,
        name: user.name,
        email: user.email,
        role: 'admin',
        message: 'Account successfully upgraded to Admin!'
    });
});

// ── Verify Token & Get Current User ──────────────────────────────────────────
router.get('/me', async (req: Request, res: Response): Promise<void> => {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
        res.status(401).json({ error: 'No token provided' });
        return;
    }

    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, JWT_SECRET) as { uid: string; email: string; role: string };
        const user = await findUserByEmail(decoded.email);
        if (!user) {
            res.status(404).json({ error: 'User not found' });
            return;
        }
        res.json({
            uid: user.uid,
            name: user.name,
            email: user.email,
            role: user.role,
            phone: user.phone || '',
        });
    } catch {
        res.status(401).json({ error: 'Invalid or expired token' });
    }
});

export default router;
