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
  // Guard: ensure at least one Firebase app has been initialized before proceeding.
  // If admin.apps is empty the SDK throws "The default Firebase app does not exist"
  // which surfaces as a confusing 500 to callers.
  if (admin.apps.length === 0) {
    throw new Error(
      'Firebase Admin is not initialized. ' +
      'Set the FIREBASE_SERVICE_ACCOUNT environment variable to a valid service account JSON, ' +
      'or ensure Application Default Credentials (ADC) are available in this environment.'
    );
  }

  try {
    // In firebase-admin, we can get a named database via getFirestore
    return getFirestore(admin.app(), firestoreDatabaseId || '(default)');
  } catch (error: any) {
    if (error.message?.includes('Could not load the default credentials')) {
      throw new Error(
        'Firebase Admin Authentication Error: Could not load credentials. ' +
        'Please provide a service account JSON in the FIREBASE_SERVICE_ACCOUNT environment variable via the Secrets panel.'
      );
    }
    if (error.message?.includes('does not exist')) {
      throw new Error(
        'Firebase Admin is not initialized. ' +
        'Set the FIREBASE_SERVICE_ACCOUNT environment variable to a valid service account JSON.'
      );
    }
    throw error;
  }
};
