const BASE_URL = (import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api/v1').replace(/\/api\/v1\/?$/, '');

export function avatarUrl(path?: string | null): string | undefined {
  if (!path) return undefined;
  if (path.startsWith('http')) return path;
  const filename = path.split(/[/\\]/).pop();
  if (!filename) return undefined;
  return `${BASE_URL}/uploads/avatars/${filename}`;
}
