import { get } from 'svelte/store';
import { appState } from '$lib/stores/appState';

/**
 * Get the base URL for API calls, ensuring no trailing slash
 */
export function getApiBaseUrl(): string {
	const state = get(appState);
	let domain = state.domain || '';
	if (domain.endsWith('/')) {
		domain = domain.slice(0, -1);
	}
	return domain;
}

/**
 * Get the authorization headers for API calls
 */
export function getAuthHeaders(): Record<string, string> {
	const state = get(appState);
	return {
		Authorization: `Bearer ${state.token}`,
		'Content-Type': 'application/json'
	};
}

/**
 * Make an API request with standard error handling
 */
export async function apiRequest<T = unknown>(
	endpoint: string,
	options: RequestInit = {}
): Promise<T> {
	// Input validation
	if (!endpoint || typeof endpoint !== 'string') {
		throw new Error('Invalid endpoint provided');
	}

	if (!endpoint.startsWith('/')) {
		throw new Error('Endpoint must start with forward slash');
	}

	const state = get(appState);

	// Check if user is authenticated
	if (!state.isConnected || !state.domain || !state.token) {
		throw new Error('Not authenticated');
	}

	const baseUrl = getApiBaseUrl();
	const headers = getAuthHeaders();

	const response = await fetch(`${baseUrl}${endpoint}`, {
		headers: {
			...headers,
			...options.headers
		},
		// Set reasonable timeout defaults if not provided
		signal: options.signal ?? AbortSignal.timeout(30000), // 30 second timeout
		...options
	});

	if (!response.ok) {
		// Provide more detailed error information
		let errorMessage = `API request failed: ${response.status} ${response.statusText}`;

		// Try to get error details from response body
		try {
			const errorData = await response.text();
			if (errorData) {
				errorMessage += ` - ${errorData}`;
			}
		} catch {
			// Ignore parsing errors, use default message
		}

		throw new Error(errorMessage);
	}

	const contentType = response.headers.get('content-type');
	if (contentType && contentType.includes('application/json')) {
		return response.json();
	}

	return response.text() as T;
}

/**
 * Make a GET request to the API
 */
export async function apiGet<T = unknown>(endpoint: string): Promise<T> {
	return apiRequest<T>(endpoint, { method: 'GET' });
}

/**
 * Make a POST request to the API
 */
export async function apiPost<T = unknown>(endpoint: string, data?: unknown): Promise<T> {
	return apiRequest<T>(endpoint, {
		method: 'POST',
		body: data ? JSON.stringify(data) : undefined
	});
}

/**
 * Make a PUT request to the API
 */
export async function apiPut<T = unknown>(endpoint: string, data?: unknown): Promise<T> {
	return apiRequest<T>(endpoint, {
		method: 'PUT',
		body: data ? JSON.stringify(data) : undefined
	});
}

/**
 * Make a DELETE request to the API
 */
export async function apiDelete<T = unknown>(endpoint: string, data?: unknown): Promise<T> {
	return apiRequest<T>(endpoint, {
		method: 'DELETE',
		body: data ? JSON.stringify(data) : undefined
	});
}
