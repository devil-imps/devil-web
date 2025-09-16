import { appState, addToast, saveCredentials } from '$lib/stores/appState';

export class ApiService {
	private baseUrl = '';
	private token = '';

	async connectToApi(domain: string, token: string): Promise<boolean> {
		this.baseUrl = domain.endsWith('/') ? domain.slice(0, -1) : domain;
		this.token = token;

		appState.update((state) => ({ ...state, isLoading: true, error: null }));

		try {
			// Test connection with health endpoint (no auth required)
			await this.testConnection();

			// Save credentials and update state
			saveCredentials(domain, token);

			appState.update((state) => ({
				...state,
				isConnected: true,
				domain,
				token,
				isLoading: false,
				error: null
			}));

			addToast({
				type: 'success',
				message: 'Successfully connected to API!'
			});

			return true;
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

			appState.update((state) => ({
				...state,
				isLoading: false,
				error: errorMessage
			}));

			addToast({
				type: 'error',
				message: `Connection failed: ${errorMessage}`
			});

			return false;
		}
	}

	private async testConnection(): Promise<void> {
		// Test connection with account info endpoint (requires auth)
		const response = await fetch(`${this.baseUrl}/info/account`, {
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${this.token}`
			}
		});

		if (!response.ok) {
			throw new Error(`Connection to API failed: ${response.status} ${response.statusText}`);
		}

		// Parse the response and check for account_username field
		const data = await response.json();

		if (!data.account || !data.account.account_username) {
			throw new Error('Invalid API response: missing account information');
		}
	}

	disconnect(): void {
		this.baseUrl = '';
		this.token = '';

		// Clear application state when disconnecting
		appState.update((state) => ({
			...state,
			isConnected: false,
			domain: '',
			token: '',
			error: null,
			account: null
		}));
	}
}

export const apiService = new ApiService();
