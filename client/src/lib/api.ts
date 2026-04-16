const BASE_URL = '/api';

class ApiClient {
  private token: string | null = null;

  setToken(token: string | null) {
    this.token = token;
  }

  getToken(): string | null {
    return this.token;
  }

  private async request(method: string, path: string, body?: any) {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const res = await fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(error.error || error.message || 'Request failed');
    }

    if (res.status === 204) return null;
    return res.json();
  }

  get(path: string) { return this.request('GET', path); }
  post(path: string, body?: any) { return this.request('POST', path, body); }
  put(path: string, body?: any) { return this.request('PUT', path, body); }
  patch(path: string, body?: any) { return this.request('PATCH', path, body); }
  delete(path: string) { return this.request('DELETE', path); }
}

export const api = new ApiClient();
export default api;
