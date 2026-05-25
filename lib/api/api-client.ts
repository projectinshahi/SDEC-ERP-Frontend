import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';
import { API_BASE_URL, API_TIMEOUT, HTTP_STATUS, ERROR_MESSAGES } from '@/lib/constants';
import { ApiError, NetworkError } from '@/lib/api-errors';

/**
 * Centralised Axios client.
 *
 * Key design decisions:
 * - 401 on /auth/login  → throw ApiError with the backend's exact message (never redirect)
 * - 401 on other routes → clear token + redirect to /login (session expired)
 * - All error messages  → extracted from backend response body first, then fall back to constants
 */
class ApiClientService {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: API_TIMEOUT,
      headers: { 'Content-Type': 'application/json' },
    });

    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    // ── Request: inject auth token ──────────────────────────────────────────
    this.client.interceptors.request.use(
      (config: InternalAxiosRequestConfig) => {
        const token =
          typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // ── Response: normalise errors ──────────────────────────────────────────
    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => this.handleError(error)
    );
  }

  private handleError(error: AxiosError): Promise<never> {
    // Pure network failure (no response at all)
    if (!error.response) {
      console.error('[API] Network error:', error.message);
      return Promise.reject(new NetworkError(ERROR_MESSAGES.NETWORK_ERROR));
    }

    const { status, data } = error.response;
    const isLoginRoute = error.config?.url?.includes('/auth/login');

    // Extract the human-readable message the backend sent
    const backendMessage =
      (data as Record<string, unknown>)?.error as string ||
      (data as Record<string, unknown>)?.message as string ||
      null;

    console.log(`[API] HTTP ${status} error on route: ${error.config?.url}`);
    if (backendMessage) console.log(`[API] Backend message: ${backendMessage}`);

    switch (status) {
      case HTTP_STATUS.UNAUTHORIZED:
        // On the login route: just throw — let AuthContext handle the message
        // On any other route: session expired → clear storage and redirect
        if (!isLoginRoute && typeof window !== 'undefined') {
          console.log('[API] Session expired, redirecting to login');
          localStorage.removeItem('authToken');
          localStorage.removeItem('user');
          window.location.href = '/login';
        }
        const unauthorizedMsg = backendMessage ?? ERROR_MESSAGES.UNAUTHORIZED;
        console.log(`[API] 401 Unauthorized: ${unauthorizedMsg}`);
        return Promise.reject(
          new ApiError(
            status,
            unauthorizedMsg,
            data
          )
        );

      case HTTP_STATUS.FORBIDDEN:
        const forbiddenMsg = backendMessage ?? ERROR_MESSAGES.FORBIDDEN;
        console.log(`[API] 403 Forbidden: ${forbiddenMsg}`);
        return Promise.reject(
          new ApiError(
            status,
            forbiddenMsg,
            data
          )
        );

      case HTTP_STATUS.NOT_FOUND:
        console.log(`[API] 404 Not Found`);
        return Promise.reject(
          new ApiError(status, backendMessage ?? ERROR_MESSAGES.NOT_FOUND, data)
        );

      case HTTP_STATUS.BAD_REQUEST:
        const validationMsg = backendMessage ?? ERROR_MESSAGES.VALIDATION_ERROR;
        console.log(`[API] 400 Bad Request: ${validationMsg}`);
        return Promise.reject(
          new ApiError(
            status,
            validationMsg,
            data
          )
        );

      case HTTP_STATUS.INTERNAL_SERVER_ERROR:
      case HTTP_STATUS.SERVICE_UNAVAILABLE:
        const serverMsg = backendMessage ?? ERROR_MESSAGES.SERVER_ERROR;
        console.error(`[API] ${status} Server Error: ${serverMsg}`);
        return Promise.reject(
          new ApiError(status, serverMsg, data)
        );

      default:
        console.error(`[API] Unexpected error ${status}: ${backendMessage}`);
        return Promise.reject(
          new ApiError(status, backendMessage ?? ERROR_MESSAGES.UNKNOWN_ERROR, data)
        );
    }
  }

  public get<T>(url: string, params?: unknown) {
    return this.client.get<T>(url, { params });
  }

  public post<T>(url: string, data?: unknown) {
    return this.client.post<T>(url, data);
  }

  public put<T>(url: string, data?: unknown) {
    return this.client.put<T>(url, data);
  }

  public patch<T>(url: string, data?: unknown) {
    return this.client.patch<T>(url, data);
  }

  public delete<T>(url: string) {
    return this.client.delete<T>(url);
  }
}

export const apiClient = new ApiClientService();
