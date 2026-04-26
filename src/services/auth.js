import { auth, db } from '../firebase';
import { 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged 
} from 'firebase/auth';
import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  serverTimestamp 
} from 'firebase/firestore';

export const loginUser = async (email, password) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    // Fetch additional user data from Firestore
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    if (userDoc.exists()) {
      return { ...user, ...userDoc.data() };
    }
    return user;
  } catch (error) {
    throw error;
  }
};

export const logoutUser = async () => {
  return await signOut(auth);
};

export const getUserData = async (user) => {
  const uid = user.uid;
  const email = user.email;
  
  // 1. Try fetching by UID (Standard)
  const userDoc = await getDoc(doc(db, 'users', uid));
  if (userDoc.exists()) {
    return userDoc.data();
  }
  
  // 2. If not found, try fetching by Email (SaaS Migration/First Login)
  if (email) {
    const emailDoc = await getDoc(doc(db, 'users', email));
    if (emailDoc.exists()) {
      const data = emailDoc.data();
      // Auto-migrate to UID for future logins
      await setDoc(doc(db, 'users', uid), data);
      // Optional: delete the old email-based doc or keep it as a legacy ref
      return data;
    }
  }
  
  return null;
};

export const checkSubscriptionStatus = (userData) => {
  if (!userData) return { active: false, expired: false, warning: false };
  if (userData.role === 'superadmin') return { active: true, expired: false, warning: false };
  if (!userData.isActive) return { active: false, expired: false, warning: false };

  const now = Date.now();
  const expiry = userData.subscriptionEnd?.seconds ? userData.subscriptionEnd.seconds * 1000 : userData.subscriptionEnd;
  
  if (!expiry) return { active: false, expired: true, warning: false };
  
  const diffDays = (expiry - now) / (1000 * 60 * 60 * 24);
  
  if (diffDays <= 0) return { active: false, expired: true, warning: false };
  if (diffDays <= 7) return { active: true, expired: false, warning: true, daysLeft: Math.ceil(diffDays) };
  
  return { active: true, expired: false, warning: false };
};
