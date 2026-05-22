import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';
import { API_BASE_URL, API_TIMEOUT, HTTP_STATUS, ERROR_MESSAGES } from '@/lib/constants';
import { ApiError, NetworkError } from '@/lib/api-errors';

/**
 * API Client with interceptors for error handling
 * Handles token injection, error responses, and retry logic
 */
class ApiClientService {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: API_TIMEOUT,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    // Request Interceptor
    this.client.interceptors.request.use(
      (config: InternalAxiosRequestConfig) => {
        // Inject auth token if available
        const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response Interceptor
    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        return this.handleError(error);
      }
    );
  }

  private handleError(error: AxiosError): Promise<never> {
    // Network error
    if (!error.response) {
      return Promise.reject(
        new NetworkError(ERROR_MESSAGES.NETWORK_ERROR)
      );
    }

    const { status, data } = error.response;

    // Handle specific status codes
    switch (status) {
      case HTTP_STATUS.UNAUTHORIZED:
        if (typeof window !== 'undefined' && !error.config?.url?.includes('/auth/login')) {
          localStorage.removeItem('authToken');
          window.location.href = '/login';
        }
        return Promise.reject(
          new ApiError(status, ERROR_MESSAGES.UNAUTHORIZED, data)
        );

      case HTTP_STATUS.FORBIDDEN:
        return Promise.reject(
          new ApiError(status, ERROR_MESSAGES.FORBIDDEN, data)
        );

      case HTTP_STATUS.NOT_FOUND:
        return Promise.reject(
          new ApiError(status, ERROR_MESSAGES.NOT_FOUND, data)
        );

      case HTTP_STATUS.BAD_REQUEST:
        return Promise.reject(
          new ApiError(status, ERROR_MESSAGES.VALIDATION_ERROR, data)
        );

      case HTTP_STATUS.INTERNAL_SERVER_ERROR:
      case HTTP_STATUS.SERVICE_UNAVAILABLE:
        return Promise.reject(
          new ApiError(status, ERROR_MESSAGES.SERVER_ERROR, data)
        );

      default:
        return Promise.reject(
          new ApiError(status, ERROR_MESSAGES.UNKNOWN_ERROR, data)
        );
    }
  }

  /**
   * GET request
   */
  public get<T>(url: string, params?: unknown) {
    return this.client.get<T>(url, { params });
  }

  /**
   * POST request
   */
  public post<T>(url: string, data?: unknown) {
    return this.client.post<T>(url, data);
  }

  /**
   * PUT request
   */
  public put<T>(url: string, data?: unknown) {
    return this.client.put<T>(url, data);
  }

  /**
   * PATCH request
   */
  public patch<T>(url: string, data?: unknown) {
    return this.client.patch<T>(url, data);
  }

  /**
   * DELETE request
   */
  public delete<T>(url: string) {
    return this.client.delete<T>(url);
  }
}

// Export singleton instance
export const apiClient = new ApiClientService();
