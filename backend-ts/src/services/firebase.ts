import admin from 'firebase-admin';
import { ENV } from '../config/env';
import path from 'path';

// Initialize Firebase Admin SDK
const initializeFirebase = () => {
  try {
    if (admin.apps.length === 0) {
      // Para desenvolvimento local, usar arquivo service account
      if (process.env.NODE_ENV === 'development') {
        console.log('🔥 Inicializando Firebase Admin SDK para desenvolvimento...');
        
        try {
          // Tentar usar o arquivo service-account-key.json
          const serviceAccountPath = path.join(__dirname, '../../service-account-key.json');
          const serviceAccount = require(serviceAccountPath);
          
          admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
            projectId: 'louvor-ide',
          });
          console.log('✅ Firebase inicializado com service account file');
        } catch (fileError) {
          console.log('⚠️ Service account file não encontrado, tentando credenciais padrão...');
          // Se falhar, tentar sem credenciais (funciona se o usuário está logado no Firebase CLI)
          admin.initializeApp({
            projectId: 'louvor-ide',
          });
          console.log('✅ Firebase inicializado com credenciais padrão do usuário');
        }
      } else {
        // Para produção, usar variáveis de ambiente
        if (!ENV.FIREBASE.CLIENT_EMAIL || !ENV.FIREBASE.PRIVATE_KEY) {
          throw new Error('Firebase credentials not configured for production');
        }

        const serviceAccount = {
          projectId: ENV.FIREBASE.PROJECT_ID,
          clientEmail: ENV.FIREBASE.CLIENT_EMAIL,
          privateKey: ENV.FIREBASE.PRIVATE_KEY,
        };

        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
          projectId: ENV.FIREBASE.PROJECT_ID,
        });
      }

      console.log('✅ Firebase Admin SDK initialized successfully');
    }
  } catch (error) {
    console.error('❌ Error initializing Firebase Admin SDK:', error);
    console.log('💡 Dica: Certifique-se de estar logado no Firebase CLI com "firebase login"');
    throw error;
  }
};

// Initialize Firebase
initializeFirebase();

// Export Firebase services
export const db = admin.firestore();
export const auth = admin.auth();

// Collections constants
export const COLLECTIONS = {
  MUSICS: 'musicas',
  MINISTERS: 'ministros',
  USERS: 'usuarios',
  SETLISTS: 'setlists',
  ROLES: 'roles',
} as const;

export default admin;
