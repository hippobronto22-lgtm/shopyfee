import { db as dexieDb } from '../db';
import { db as firestoreDb } from '../firebase';
import { 
  collection, 
  addDoc, 
  getDocs, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  where, 
  orderBy,
  setDoc
} from 'firebase/firestore';
import { Capacitor } from '@capacitor/core';

const isNative = Capacitor.isNativePlatform();

export const storageService = {
  // TABLE NAMES
  TABLES: {
    INVENTORY: 'inventory',
    TRANSACTIONS: 'transactions',
    ASSETS: 'assets',
    SETTINGS_GENERAL: 'settings_general',
    SETTINGS_SHOPEE: 'settings_shopee',
    SETTINGS_PROGRAM: 'settings_program'
  },

  async getAll(tableName, ownerId = null) {
    if (isNative) {
      return await dexieDb[tableName].toArray();
    } else {
      if (!ownerId) return [];
      const q = query(
        collection(firestoreDb, tableName), 
        where('ownerId', '==', ownerId)
      );
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }
  },

  async add(tableName, data, ownerId = null) {
    if (isNative) {
      return await dexieDb[tableName].add(data);
    } else {
      if (!ownerId) throw new Error('OwnerId required for cloud storage');
      const docData = { ...data, ownerId, createdAt: Date.now() };
      if (data.id) {
        const docRef = doc(firestoreDb, tableName, data.id.toString());
        await setDoc(docRef, docData);
        return data.id;
      } else {
        const docRef = await addDoc(collection(firestoreDb, tableName), docData);
        return docRef.id;
      }
    }
  },

  async update(tableName, id, data, ownerId = null) {
    if (isNative) {
      return await dexieDb[tableName].update(id, data);
    } else {
      if (!ownerId) throw new Error('OwnerId required for cloud storage');
      const docRef = doc(firestoreDb, tableName, id);
      return await updateDoc(docRef, data);
    }
  },

  async put(tableName, data, ownerId = null) {
    if (isNative) {
      return await dexieDb[tableName].put(data);
    } else {
      if (!ownerId) throw new Error('OwnerId required for cloud storage');
      const id = data.id;
      if (id) {
        const docRef = doc(firestoreDb, tableName, id.toString());
        return await setDoc(docRef, { ...data, ownerId }, { merge: true });
      } else {
        return await this.add(tableName, data, ownerId);
      }
    }
  },

  async delete(tableName, id, ownerId = null) {
    if (isNative) {
      return await dexieDb[tableName].delete(id);
    } else {
      if (!ownerId) throw new Error('OwnerId required for cloud storage');
      const docRef = doc(firestoreDb, tableName, id);
      return await deleteDoc(docRef);
    }
  },

  // Specialized bulk operations if needed
  async bulkAdd(tableName, dataArray, ownerId = null) {
    if (isNative) {
      return await dexieDb[tableName].bulkAdd(dataArray);
    } else {
      // For simplicity in Firestore, we can loop, but ideally use batches
      const promises = dataArray.map(item => this.add(tableName, item, ownerId));
      return await Promise.all(promises);
    }
  },

  async clear(tableName, ownerId = null) {
    if (isNative) {
      return await dexieDb[tableName].clear();
    } else {
      // In Firestore, clear means delete all docs with ownerId
      const q = query(collection(firestoreDb, tableName), where('ownerId', '==', ownerId));
      const querySnapshot = await getDocs(q);
      const deletePromises = querySnapshot.docs.map(doc => deleteDoc(doc.ref));
      return await Promise.all(deletePromises);
    }
  }
};
