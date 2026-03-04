/**
 * Shared API request utility that standardizes fetch calls, error parsing, and return types.
 */

export interface ApiResult<T = unknown> {
    success: boolean;
    data?: T;
    error?: string;
    status?: number;
}

/**
 * Makes an API request and returns a standardized result.
 * Handles JSON parsing, error extraction, and network failures uniformly.
 */
export async function apiRequest<T = unknown>(
    url: string,
    options: RequestInit = {}
): Promise<ApiResult<T>> {
    try {
        const res = await fetch(url, options);
        const status = res.status;

        if (status === 204) {
            return { success: true, status };
        }

        let data: any;
        const text = await res.text();
        try {
            data = text ? JSON.parse(text) : {};
        } catch {
            data = { error: text || res.statusText || `Request failed (${status})` };
        }

        if (res.ok) {
            return { success: true, data: data as T, status };
        }

        const errorMessage = typeof data?.error === 'string'
            ? data.error
            : `Request failed (${status})`;
        return { success: false, error: errorMessage, status };
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Network error';
        return { success: false, error: message };
    }
}

/**
 * Convenience wrapper for JSON POST/PUT/DELETE requests.
 */
export function apiJson<T = unknown>(
    url: string,
    method: 'POST' | 'PUT' | 'DELETE',
    body?: unknown
): Promise<ApiResult<T>> {
    const options: RequestInit = {
        method,
        headers: { 'Content-Type': 'application/json' },
    };
    if (body !== undefined) {
        options.body = JSON.stringify(body);
    }
    return apiRequest<T>(url, options);
}
