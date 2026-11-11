export type AccessTokenProvider = () => Promise<string | null>;

export class ApiError extends Error {
  constructor(
    readonly code: string,
    readonly status: number,
    message: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

let accessTokenProvider: AccessTokenProvider | undefined;

export function configureAccessTokenProvider(
  provider: AccessTokenProvider | null
): void {
  accessTokenProvider = provider ?? undefined;
}

export async function requestAuthenticated(
  path: string,
  init: RequestInit = {}
): Promise<unknown | null> {
  if (!accessTokenProvider) {
    return null;
  }

  const accessToken = await accessTokenProvider();
  if (!accessToken) {
    return null;
  }

  const baseUrl = process.env.EXPO_PUBLIC_API_URL?.trim();
  if (!baseUrl) {
    throw new Error('EXPO_PUBLIC_API_URL must be configured for API requests.');
  }

  const headers = new Headers(init.headers);
  headers.set('Authorization', `Bearer ${accessToken}`);
  const response = await fetch(`${baseUrl.replace(/\/+$/, '')}${path}`, {
    ...init,
    headers,
  });
  const payload: unknown = await response.json();

  if (!response.ok) {
    const error = isRecord(payload) && isRecord(payload.error) ? payload.error : {};
    const code = typeof error.code === 'string' ? error.code : 'HTTP_ERROR';
    const message = typeof error.message === 'string' ? error.message : 'Request failed.';
    throw new ApiError(code, response.status, message);
  }

  return payload;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
