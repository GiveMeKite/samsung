export async function readJsonResponse<T>(response: Response): Promise<T | null> {
  if (response.status === 204) return null;

  const text = await response.text();
  if (!text.trim()) return null;

  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error('서버 응답 형식이 올바르지 않습니다.');
  }
}

export async function fetchJson<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T | null> {
  const response = await fetch(input, init);
  const data = await readJsonResponse<T>(response);

  if (!response.ok) {
    const message =
      data && typeof data === 'object' && 'error' in data && typeof (data as { error?: unknown }).error === 'string'
        ? (data as { error: string }).error
        : '요청을 처리하지 못했습니다.';
    throw new Error(message);
  }

  return data;
}
