import { get, off, onValue, push, ref, remove, set, update } from 'firebase/database';
import { db } from '../firebase';
import { getCurrentUser } from './auth';
import type { Book } from '../types/Book';

function booksRef(uid: string) {
  return ref(db, `books/${uid}`);
}

async function requireUid(): Promise<string> {
  const user = await getCurrentUser();
  if (!user) throw new Error('Not authenticated');
  return user.uid;
}

export type BookPayload = Omit<Book, 'id' | 'coverKey'> & { coverKey?: string | null };

export async function addBook(book: BookPayload): Promise<string> {
  const uid = await requireUid();
  const newRef = push(booksRef(uid));
  await set(newRef, book);
  return newRef.key as string;
}

export async function updateBook(id: string, book: BookPayload): Promise<void> {
  const uid = await requireUid();
  await update(ref(db, `books/${uid}/${id}`), book);
}

export async function deleteBook(id: string): Promise<void> {
  const uid = await requireUid();
  await remove(ref(db, `books/${uid}/${id}`));
}

export async function getBook(id: string): Promise<Book | null> {
  const uid = await requireUid();
  const snapshot = await get(ref(db, `books/${uid}/${id}`));
  if (!snapshot.exists()) return null;
  return { id, ...(snapshot.val() as Omit<Book, 'id'>) };
}

export function subscribeBooks(uid: string, callback: (books: Book[]) => void): () => void {
  const listRef = booksRef(uid);
  onValue(listRef, (snapshot) => {
    const val = snapshot.val() || {};
    const books: Book[] = Object.entries(val as Record<string, Omit<Book, 'id'>>).map(
      ([id, data]) => ({ id, ...data })
    );
    callback(books);
  });
  return () => off(listRef, 'value');
}
