export interface Env {
  COVERS_BUCKET: R2Bucket;
  FIREBASE_API_KEY: string;
}

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  });
}

async function verifyIdToken(idToken: string, apiKey: string): Promise<string> {
  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken }),
    }
  );

  if (!response.ok) {
    throw new Error('Invalid ID token');
  }

  const data = (await response.json()) as { users?: { localId: string }[] };
  const uid = data.users?.[0]?.localId;

  if (!uid) {
    throw new Error('Invalid ID token');
  }

  return uid;
}

async function handleUpload(request: Request, env: Env): Promise<Response> {
  const formData = await request.formData();
  const idToken = formData.get('idToken');
  const file = formData.get('file');

  if (typeof idToken !== 'string' || !(file instanceof File)) {
    return jsonResponse({ error: 'Missing idToken or file' }, 400);
  }

  const uid = await verifyIdToken(idToken, env.FIREBASE_API_KEY);
  const key = `${uid}/${Date.now()}-${file.name}`;

  await env.COVERS_BUCKET.put(key, await file.arrayBuffer(), {
    httpMetadata: { contentType: file.type || 'application/octet-stream' },
  });

  return jsonResponse({ key });
}

async function handleDelete(request: Request, env: Env): Promise<Response> {
  const { idToken, key } = (await request.json()) as { idToken?: string; key?: string };

  if (!idToken || !key) {
    return jsonResponse({ error: 'Missing idToken or key' }, 400);
  }

  const uid = await verifyIdToken(idToken, env.FIREBASE_API_KEY);

  if (!key.startsWith(`${uid}/`)) {
    return jsonResponse({ error: 'Forbidden' }, 403);
  }

  await env.COVERS_BUCKET.delete(key);
  return jsonResponse({ success: true });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS_HEADERS });
    }

    const { pathname } = new URL(request.url);

    try {
      if (pathname === '/upload' && request.method === 'POST') {
        return await handleUpload(request, env);
      }

      if (pathname === '/delete' && request.method === 'POST') {
        return await handleDelete(request, env);
      }

      return jsonResponse({ error: 'Not found' }, 404);
    } catch (error) {
      return jsonResponse(
        { error: error instanceof Error ? error.message : 'Server error' },
        401
      );
    }
  },
};
