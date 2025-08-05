export async function fetchWithRetry(
  input: RequestInfo,
  init?: RequestInit,
  retries = 3,
  backoffMs = 500
): Promise<Response> {
  let attempt = 0;

  while (attempt <= retries) {
    try {
      const res = await fetch(input, init);
      if (res.status !== 429) {
        return res;
      }
    } catch (error) {
      if (attempt === retries) {
        throw error;
      }
    }

    if (attempt === retries) {
      break;
    }

    await new Promise((resolve) => setTimeout(resolve, backoffMs * (attempt + 1)));
    attempt++;
  }

  throw new Error('リクエストが失敗しました');
}
