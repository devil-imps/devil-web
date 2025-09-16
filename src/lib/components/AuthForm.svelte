<script lang="ts">
	import { appState, loadCredentials } from '$lib/stores/appState';
	import { apiService } from '$lib/services/api';
	import { navigateTo } from '$lib/utils';
	import { onMount } from 'svelte';

	let domain = '';
	let token = '';
	let isSubmitting = false;

	onMount(() => {
		// Check if we have saved credentials
		const savedCreds = loadCredentials();
		if (savedCreds) {
			domain = savedCreds.domain;
			token = savedCreds.token;
		}
	});

	async function handleSubmit() {
		if (!domain.trim() || !token.trim()) {
			return;
		}

		// Prevent multiple simultaneous connection attempts
		if (isSubmitting || $appState.isConnected || $appState.isLoading) {
			return;
		}

		isSubmitting = true;

		try {
			const connected = await apiService.connectToApi(domain.trim(), token.trim());
			if (connected) {
				// Redirect to dashboard on successful connection
				navigateTo('/dashboard');
			}
		} catch {
			// Error handling is done in the API service
		} finally {
			isSubmitting = false;
		}
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Enter') {
			handleSubmit();
		}
	}
</script>

<div class="min-h-screen flex items-center justify-center px-4">
	<div class="card w-full max-w-md">
		<div class="text-center mb-8">
			<h1 class="text-3xl font-bold text-white mb-2">devil WEB</h1>
			<p class="text-gray-400">Connect to your devil API</p>
		</div>

		<form on:submit|preventDefault={handleSubmit} class="space-y-6">
			<div>
				<label for="domain" class="block text-sm font-medium text-gray-300 mb-2">
					API Domain
				</label>
				<input
					id="domain"
					type="url"
					bind:value={domain}
					placeholder="https://api.example.com"
					class="input-field w-full"
					required
					disabled={isSubmitting}
					on:keydown={handleKeydown}
					aria-describedby="domain-help"
				/>
				<p id="domain-help" class="text-xs text-gray-500 mt-1">
					Enter the base URL of your devil API
				</p>
			</div>

			<div>
				<label for="token" class="block text-sm font-medium text-gray-300 mb-2">
					Bearer Token
				</label>
				<input
					id="token"
					type="password"
					bind:value={token}
					placeholder="Your API token"
					class="input-field w-full"
					required
					disabled={isSubmitting}
					on:keydown={handleKeydown}
					aria-describedby="token-help"
				/>
				<p id="token-help" class="text-xs text-gray-500 mt-1">
					Your authentication token for the API
				</p>
			</div>

			{#if $appState.error}
				<div
					class="bg-red-900 border border-red-700 text-red-100 px-4 py-3 rounded-lg"
					role="alert"
				>
					<p class="text-sm">{$appState.error}</p>
				</div>
			{/if}

			<button
				type="submit"
				class="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
				disabled={isSubmitting || !domain.trim() || !token.trim()}
			>
				{#if isSubmitting}
					<span class="flex items-center justify-center">
						<svg
							class="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
							xmlns="http://www.w3.org/2000/svg"
							fill="none"
							viewBox="0 0 24 24"
						>
							<circle
								class="opacity-25"
								cx="12"
								cy="12"
								r="10"
								stroke="currentColor"
								stroke-width="4"
							></circle>
							<path
								class="opacity-75"
								fill="currentColor"
								d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
							></path>
						</svg>
						Connecting...
					</span>
				{:else}
					Connect to API
				{/if}
			</button>
		</form>

		<div class="mt-6 text-center">
			<p class="text-xs text-gray-500">Your credentials will be stored locally for convenience</p>
		</div>
	</div>
</div>
