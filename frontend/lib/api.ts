export const API_URL = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';

/**
 * Authenticated fetch wrapper. Retrieves the Clerk session token
 * and attaches it as a Bearer token in the Authorization header.
 *
 * Usage: replace `apiFetch(`/api/...`, opts)` with `apiFetch('/api/...', opts)`.
 * The API_URL prefix is added automatically.
 */
export async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  const headers = new Headers(init?.headers);

  // Get Clerk token from the global Clerk instance
  if (typeof window !== 'undefined') {
    try {
      const clerk = (window as any).Clerk;
      if (clerk?.session) {
        const token = await clerk.session.getToken();
        if (token) {
          headers.set('Authorization', `Bearer ${token}`);
        }
      }
    } catch {
      // Clerk not available, proceed without token
    }
  }

  return fetch(`${API_URL}${path}`, {
    ...init,
    headers,
  });
}
