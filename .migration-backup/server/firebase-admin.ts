import admin from 'firebase-admin';

let firebaseApp: admin.app.App | null = null;

export function initializeFirebaseAdmin(): admin.app.App | null {
  if (firebaseApp) {
    return firebaseApp;
  }

  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT;
  
  if (!serviceAccountJson) {
    console.log('[FIREBASE] No service account configured - push notifications disabled');
    return null;
  }

  try {
    const serviceAccount = JSON.parse(serviceAccountJson);
    
    firebaseApp = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    
    console.log('[FIREBASE] Admin SDK initialized successfully');
    return firebaseApp;
  } catch (error) {
    console.error('[FIREBASE] Failed to initialize Admin SDK:', error);
    return null;
  }
}

export function getFirebaseMessaging(): admin.messaging.Messaging | null {
  const app = initializeFirebaseAdmin();
  if (!app) {
    return null;
  }
  return admin.messaging(app);
}

export { firebaseApp };
