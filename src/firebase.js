import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
} from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyDcxfBJuArnH0wwOanPbuQJj_G1l1lXhTQ",
  authDomain: "orbit-ai-hackathon.firebaseapp.com",
  projectId: "orbit-ai-hackathon",
  storageBucket: "orbit-ai-hackathon.firebasestorage.app",
  messagingSenderId: "386700800834",
  appId: "1:386700800834:web:b4d97e01ada4ca90780edb",
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Google Login function
export async function loginWithGoogle() {
  const result = await signInWithPopup(auth, googleProvider);
  return result.user;
}

// Email Login function
export async function loginWithEmail(email, password) {
  const result = await signInWithEmailAndPassword(auth, email, password);
  return result.user;
}

// Signup function
export async function signupWithEmail(email, password) {
  const result = await createUserWithEmailAndPassword(auth, email, password);
  return result.user;
}

// Logout function
export async function logout() {
  await signOut(auth);
}
