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

let resolveAuthReady: (user: User | null) => void;
const authReady = new Promise<User | null>((resolve) => {
  resolveAuthReady = resolve;
});
let hasResolved = false;
onAuthStateChanged(auth, (user) => {
  if (!hasResolved) {
    hasResolved = true;
    resolveAuthReady(user);
  }
});

export function getCurrentUser(): Promise<User | null> {
  return authReady;
}
