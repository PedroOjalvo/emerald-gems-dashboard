interface OpenClawResponse {
  ok: boolean;
  status: number;
  data: any;
}

function buildAuthHeaders(authToken?: string): Record<string, string> {
  const token = authToken?.trim();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request(baseUrl: string, path: string, options?: RequestInit): Promise<OpenClawResponse> {
  const normalizedBaseUrl = baseUrl.trim();

  if (!normalizedBaseUrl) {
    return { ok: false, status: 0, data: { error: 'URL del servidor no configurada' } };
  }

  const url = `${normalizedBaseUrl.replace(/\/+$/, '')}${path}`;

  try {
    const res = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options?.headers || {}),
      },
    });
    let data: any;
    try {
      data = await res.json();
    } catch {
      data = await res.text().catch(() => null);
    }
    return { ok: res.ok, status: res.status, data };
  } catch (err: any) {
    return { ok: false, status: 0, data: { error: err.message } };
  }
}

export async function ping(baseUrl: string): Promise<OpenClawResponse> {
  return request(baseUrl, '/healthz');
}

export async function getStatus(baseUrl: string): Promise<OpenClawResponse> {
  return request(baseUrl, '/');
}

export async function sendTelegramMessage(baseUrl: string, chatId: string | number, text: string, authToken?: string): Promise<OpenClawResponse> {
  return request(baseUrl, '/telegram/send', {
    method: 'POST',
    headers: buildAuthHeaders(authToken),
    body: JSON.stringify({ chat_id: chatId, text }),
  });
}

export async function syncData(baseUrl: string, authToken?: string): Promise<OpenClawResponse> {
  return request(baseUrl, '/sync', {
    method: 'POST',
    headers: buildAuthHeaders(authToken),
  });
}
