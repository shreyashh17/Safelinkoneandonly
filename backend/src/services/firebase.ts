import admin from 'firebase-admin';
import path from 'path';
import fs from 'fs';

// Helper to check whether Firebase service account credentials exist
export function isFirebaseConfigured(): boolean {
    const jsonPath = path.resolve(__dirname, '../../firebase-service-account.json');
    const rootJsonPath = path.resolve(process.cwd(), 'firebase-service-account.json');
    if (fs.existsSync(jsonPath) || fs.existsSync(rootJsonPath)) {
        return true;
    }
    const p = process.env.FIREBASE_PROJECT_ID;
    return !!p && p !== 'your_firebase_project_id';
}

if (!admin.apps.length && isFirebaseConfigured()) {
    try {
        const jsonPath = path.resolve(__dirname, '../../firebase-service-account.json');
        const rootJsonPath = path.resolve(process.cwd(), 'firebase-service-account.json');

        let credential;
        let projectId = process.env.FIREBASE_PROJECT_ID;

        if (fs.existsSync(jsonPath)) {
            const raw = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
            credential = admin.credential.cert(raw);
            projectId = raw.project_id;
        } else if (fs.existsSync(rootJsonPath)) {
            const raw = JSON.parse(fs.readFileSync(rootJsonPath, 'utf8'));
            credential = admin.credential.cert(raw);
            projectId = raw.project_id;
        } else {
            credential = admin.credential.cert({
                projectId: process.env.FIREBASE_PROJECT_ID,
                clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
            });
        }

        admin.initializeApp({
            credential,
            databaseURL: `https://${projectId}-default-rtdb.firebaseio.com`,
        });
        console.log(`🔥 Firebase Admin SDK initialized successfully for project [${projectId}]`);
    } catch (err) {
        console.error('⚠️ Failed to initialize Firebase Admin SDK:', err);
    }
}

// Safely export services with fallbacks to avoid crashing if RTDB is unprovisioned
export const firestore = admin.apps.length ? admin.firestore() : (null as any);

export const db = admin.apps.length
    ? (() => {
          try {
              return admin.database();
          } catch {
              return null as any;
          }
      })()
    : (null as any);

export const messaging = admin.apps.length
    ? (() => {
          try {
              return admin.messaging();
          } catch {
              return null as any;
          }
      })()
    : (null as any);

export default admin;
