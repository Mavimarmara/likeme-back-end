import * as admin from 'firebase-admin';

let firebaseApp: admin.app.App | null = null;

export function getFirebaseAdmin(): admin.app.App {
  if (firebaseApp) {
    return firebaseApp;
  }

  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

  if (serviceAccountJson) {
    try {
      const serviceAccount = JSON.parse(serviceAccountJson);
      firebaseApp = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
    } catch (error) {
      console.error('[Firebase] Erro ao parsear FIREBASE_SERVICE_ACCOUNT_JSON:', error);
      throw new Error('Configuração do Firebase Admin inválida');
    }
  } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    firebaseApp = admin.initializeApp({
      credential: admin.credential.applicationDefault(),
    });
  } else {
    console.warn('[Firebase] Nenhuma credencial configurada. Push notifications desabilitadas.');
    firebaseApp = admin.initializeApp();
  }

  return firebaseApp;
}

export function getMessaging(): admin.messaging.Messaging {
  return getFirebaseAdmin().messaging();
}
