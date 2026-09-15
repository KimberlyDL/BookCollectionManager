import { getCurrentUser } from './auth';

const WORKER_URL = import.meta.env.VITE_WORKER_URL;
const R2_PUBLIC_URL = import.meta.env.VITE_R2_PUBLIC_URL;

export function coverUrl(key: string): string {
  return `${R2_PUBLIC_URL}/${key}`;
}

async function requireIdToken(): Promise<string> {
  const user = await getCurrentUser();
  if (!user) throw new Error('Not authenticated');
  return user.getIdToken();
}

export async function uploadCover(file: File): Promise<string> {
  const idToken = await requireIdToken();

  const formData = new FormData();
  formData.append('idToken', idToken);
  formData.append('file', file);

  const response = await fetch(`${WORKER_URL}/upload`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || 'Cover upload failed');
  }

  const { key } = (await response.json()) as { key: string };
  return key;
}

export async function deleteCover(key: string): Promise<void> {
  const idToken = await requireIdToken();

  const response = await fetch(`${WORKER_URL}/delete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken, key }),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || 'Cover delete failed');
  }
}
