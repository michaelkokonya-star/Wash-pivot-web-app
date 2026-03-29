import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  onAuthStateChanged, 
  User, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInAnonymously,
  sendPasswordResetEmail,
  updatePassword,
  sendEmailVerification
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';

interface AuthContextType {
  user: User | null;
  profile: any | null;
  loading: boolean;
  signIn: (provider?: 'google' | 'facebook' | 'microsoft' | 'email', email?: string, password?: string) => Promise<void>;
  signInAsGuest: () => Promise<void>;
  signUp: (email: string, password: string, displayName: string) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  changePassword: (password: string) => Promise<void>;
  sendVerification: () => Promise<void>;
  refreshUser: () => Promise<void>;
  updateProfile: (data: any) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      if (user) {
        const docRef = doc(db, 'users', user.uid);
        try {
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const data = docSnap.data();
            if (user.email === 'michael.kokonya@washpivot.com' && data.role !== 'admin') {
              const updatedProfile = { ...data, role: 'admin', isApproved: true };
              await setDoc(docRef, updatedProfile);
              setProfile(updatedProfile);
            } else {
              setProfile(data);
            }
          } else {
            const isGoogleUser = user.providerData.some(p => p.providerId === 'google.com');
            // Create initial profile
            const initialProfile = {
              uid: user.uid,
              displayName: user.displayName || 'Anonymous',
              email: user.email || '',
              photoURL: user.photoURL || '',
              role: user.email === 'michael.kokonya@washpivot.com' ? 'admin' : 'user',
              isApproved: user.email === 'michael.kokonya@washpivot.com' || isGoogleUser, // Admin and Google users are auto-approved
              showContacts: true,
              hasSeenWelcome: false,
              createdAt: serverTimestamp(),
            };
            await setDoc(docRef, initialProfile);
            setProfile(initialProfile);
          }
        } catch (error) {
          handleFirestoreError(error, OperationType.GET, `users/${user.uid}`);
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signIn = async (providerType: 'google' | 'facebook' | 'microsoft' | 'email' = 'google', email?: string, password?: string) => {
    if (providerType === 'email' && email && password) {
      await signInWithEmailAndPassword(auth, email, password);
    } else if (providerType === 'google') {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } else if (providerType === 'facebook') {
      const { FacebookAuthProvider } = await import('firebase/auth');
      const provider = new FacebookAuthProvider();
      await signInWithPopup(auth, provider);
    } else if (providerType === 'microsoft') {
      const { OAuthProvider } = await import('firebase/auth');
      const provider = new OAuthProvider('microsoft.com');
      await signInWithPopup(auth, provider);
    }
  };

  const signInAsGuest = async () => {
    await signInAnonymously(auth);
  };

  const signUp = async (email: string, password: string, displayName: string) => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    // Send verification email
    await sendEmailVerification(user);
    
    // Create profile immediately to ensure fields are set
    const docRef = doc(db, 'users', user.uid);
    const initialProfile = {
      uid: user.uid,
      displayName: displayName,
      email: email,
      photoURL: '',
      role: email === 'michael.kokonya@washpivot.com' ? 'admin' : 'user',
      isApproved: email === 'michael.kokonya@washpivot.com',
      showContacts: true,
      hasSeenWelcome: false,
      createdAt: serverTimestamp(),
    };
    await setDoc(docRef, initialProfile);
    setProfile(initialProfile);
  };

  const logout = async () => {
    await signOut(auth);
  };

  const resetPassword = async (email: string) => {
    await sendPasswordResetEmail(auth, email);
  };

  const changePassword = async (password: string) => {
    if (auth.currentUser) {
      await updatePassword(auth.currentUser, password);
    } else {
      throw new Error('No user is currently signed in');
    }
  };

  const sendVerification = async () => {
    if (auth.currentUser) {
      await sendEmailVerification(auth.currentUser);
    }
  };

  const refreshUser = async () => {
    if (auth.currentUser) {
      await auth.currentUser.reload();
      setUser({ ...auth.currentUser });
    }
  };

  const updateProfile = async (data: any) => {
    if (!user) return;
    const docRef = doc(db, 'users', user.uid);
    await updateDoc(docRef, data);
    setProfile((prev: any) => ({ ...prev, ...data }));
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, signIn, signInAsGuest, signUp, logout, resetPassword, changePassword, sendVerification, refreshUser, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
