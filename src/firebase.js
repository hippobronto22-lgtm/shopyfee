import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyAQqzDcHYU_G6_26TiICRXjMseawMaECBM",
  authDomain: "kalkulator-ecommerce.firebaseapp.com",
  projectId: "kalkulator-ecommerce",
  storageBucket: "kalkulator-ecommerce.firebasestorage.app",
  messagingSenderId: "539760061007",
  appId: "1:539760061007:web:682d0bd84d44ae4e75983a"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
