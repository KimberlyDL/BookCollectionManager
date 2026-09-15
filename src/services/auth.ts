import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from 'firebase/auth';
import { auth } from '../firebase';

export function register(email: string, password: string) {
  return createUserWithEmailAndPassword(auth, email, password);
}

export function login(email: string, password: string) {
  return signInWithEmailAndPassword(auth, email, password);
}

export function logout() {
  return signOut(auth);
}

export function onAuthChange(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, callback);
}

let currentUser: User | null = null;
let hasResolved = false;
let resolveAuthReady: () => void;
const authReady = new Promise<void>((resolve) => {
  resolveAuthReady = resolve;
});
onAuthStateChanged(auth, (user) => {
  currentUser = user;
  if (!hasResolved) {
    hasResolved = true;
    resolveAuthReady();
  }
});

export async function getCurrentUser(): Promise<User | null> {
  if (!hasResolved) await authReady;
  return currentUser;
}
