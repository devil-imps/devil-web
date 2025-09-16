import { writable, derived } from 'svelte/store';
import { browser } from '$app/environment';
import { apiGet } from '$lib/utils';

export interface Toast {
	id: string;
	type: 'success' | 'error' | 'info' | 'warning';
	message: string;
	duration?: number;
}

export interface AppState {
	isConnected: boolean;
	domain: string;
	token: string;
	isLoading: boolean;
	error: string | null;
	account: AccountInfo | null;
}

export interface AccountInfo {
	account_username?: string;
	account_plan?: string;
	account_expires?: string;
}

// Create writable stores
export const appState = writable<AppState>({
	isConnected: false,
	domain: '',
	token: '',
	isLoading: false,
	error: null,
	account: null
});

export const toasts = writable<Toast[]>([]);

// Derived stores
export const isAuthenticated = derived(
	appState,
	($appState) => $appState.isConnected && $appState.domain && $appState.token
);

// Toast management functions
export function addToast(toast: Omit<Toast, 'id'>) {
	const id = Math.random().toString(36).substring(2, 11);
	const newToast: Toast = {
		...toast,
		id,
		duration: toast.duration ?? 5000
	};

	toasts.update((current) => [...current, newToast]);

	if (newToast.duration && newToast.duration > 0) {
		setTimeout(() => {
			removeToast(id);
		}, newToast.duration);
	}
}

export function removeToast(id: string) {
	toasts.update((current) => current.filter((toast) => toast.id !== id));
}

// Environment and persistence functions
export function getEnvCredentials(): { domain: string; token: string } | null {
	// Don't store credentials in code - user must enter them
	return null;
}

export function saveCredentials(domain: string, token: string) {
	if (browser) {
		localStorage.setItem('devil-web-domain', domain);
		localStorage.setItem('devil-web-token', token);
	}
}

export function loadCredentials(): { domain: string; token: string } | null {
	if (browser) {
		const domain = localStorage.getItem('devil-web-domain');
		const token = localStorage.getItem('devil-web-token');

		if (domain && token) {
			return { domain, token };
		}
	}

	// No fallback - user must enter credentials
	return null;
}

export function clearCredentials() {
	if (browser) {
		localStorage.removeItem('devil-web-domain');
		localStorage.removeItem('devil-web-token');
	}

	appState.update((state) => ({
		...state,
		isConnected: false,
		domain: '',
		token: '',
		error: null,
		account: null
	}));
}

export async function fetchAccountInfo(): Promise<AccountInfo | null> {
	try {
		const accountData = await apiGet<{ account?: AccountInfo }>('/info/account');

		// Update the global state with account info
		appState.update((state) => ({
			...state,
			account: accountData.account || null
		}));

		return accountData.account || null;
	} catch (error) {
		console.error('Error fetching account info:', error);

		// Don't show toast for authentication errors to avoid noise
		if (!(error instanceof Error && error.message === 'Not authenticated')) {
			addToast({
				type: 'warning',
				message: 'Failed to load account information'
			});
		}

		return null;
	}
}
