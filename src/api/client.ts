/** HTTP 클라이언트. 실패하면 서버가 내려준 문장(text/plain)을 그대로 ApiError 메시지로 쓴다. */

export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000').replace(
  /\/$/,
  '',
);

const TIMEOUT_MS = 15_000;

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

let authToken: string | null = null;
let onUnauthorized: (() => void) | null = null;

export function setAuthToken(token: string | null) {
  authToken = token;
}

/** 토큰이 만료됐거나 권한이 사라져 서버가 401 을 돌려줬을 때 부를 함수 */
export function setUnauthorizedHandler(handler: (() => void) | null) {
  onUnauthorized = handler;
}

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PATCH';
  body?: unknown;
  query?: Record<string, string | number | undefined>;
};

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, query } = options;

  const url = new URL(`${API_BASE_URL}${path}`);
  Object.entries(query ?? {}).forEach(([key, value]) => {
    if (value !== undefined && value !== '') url.searchParams.set(key, String(value));
  });

  const sentToken = authToken;
  let response: Response;
  try {
    response = await fetch(url, {
      method,
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: {
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
        ...(sentToken ? { Authorization: `Bearer ${sentToken}` } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch (error) {
    if (error instanceof Error && error.name === 'TimeoutError') {
      throw new ApiError('서버 응답이 지연되고 있습니다. 다시 시도해 주세요.', 408);
    }
    throw new ApiError(`서버(${API_BASE_URL})에 연결할 수 없습니다.`, 0);
  }

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    if (response.status === 401 && sentToken && sentToken === authToken) onUnauthorized?.();
    throw new ApiError(text || `요청이 실패했습니다 (${response.status})`, response.status);
  }
  return (await response.json()) as T;
}

export function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.';
}
