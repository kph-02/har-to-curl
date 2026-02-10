import type { ApiError } from "./types";

// Always use the Next.js proxy for API requests
const API_BASE_URL = "/api";

export class ApiClientError extends Error {
  constructor(
    public statusCode: number,
    public error: string,
    public details?: string
  ) {
    super(error);
    this.name = "ApiClientError";
  }
}

/**
 * Unified fetch wrapper with error handling
 * All requests go through Next.js proxy: /api/* → ${BACKEND_URL}/*
 */
export async function apiRequest<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  // Ensure endpoint starts with /
  const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = `${API_BASE_URL}${normalizedEndpoint}`;

  const headers: HeadersInit = (() => {
    const nextHeaders: Record<string, string> = {};
    const hasBody: boolean = !!options?.body;
    const isFormDataBody: boolean =
      typeof FormData !== "undefined" && options?.body instanceof FormData;
    if (hasBody && !isFormDataBody) {
      nextHeaders["Content-Type"] = "application/json";
    }
    return { ...nextHeaders, ...(options?.headers || {}) };
  })();

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const errorData: ApiError = await response.json().catch(() => ({
        statusCode: response.status,
        message: response.statusText,
      }));

      throw new ApiClientError(
        errorData.statusCode,
        errorData.message,
        errorData.error
      );
    }

    // Assumes backend returns JSON - validated by backend
    return (await response.json()) as T;
  } catch (error) {
    if (error instanceof ApiClientError) {
      throw error;
    }

    throw new ApiClientError(
      500,
      "Network error",
      error instanceof Error ? error.message : "Unknown error"
    );
  }
}
