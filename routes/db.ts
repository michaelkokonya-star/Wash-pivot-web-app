import admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import path from 'path';
import { readFileSync } from 'fs';

let firestoreDatabaseId: string | undefined = process.env.FIREBASE_DATABASE_ID;

if (!firestoreDatabaseId) {
  try {
    const firebaseConfigPath = path.join(process.cwd(), 'firebase-applet-config.json');
    const firebaseConfig = JSON.parse(readFileSync(firebaseConfigPath, 'utf-8'));
    firestoreDatabaseId = firebaseConfig.firestoreDatabaseId;
  } catch (error) {
    // If we can't find the config file, we'll just fall back to '(default)' in the export
  }
}

export const getDb = () => {
    // In firebase-admin, we can get a named database via getFirestore
    return getFirestore(admin.app(), firestoreDatabaseId || '(default)');
};
