<script lang="ts">
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import { loadCredentials, addToast, appState } from '$lib/stores/appState';
	import { apiService } from '$lib/services/api';
	import { navigateTo } from '$lib/utils';
	import AuthForm from '$lib/components/AuthForm.svelte';

	// Accept params prop to suppress SvelteKit warning
	export const params: Record<string, string> = {};

	let deferredPrompt:
		| (Event & {
				prompt(): Promise<void>;
				userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
		  })
		| null = null;
	let showInstallButton = false;

	onMount(async () => {
		if (browser) {
			// Check for saved credentials and auto-connect (only if not already connected)
			const credentials = loadCredentials();
			if (credentials && !$appState.isConnected && !$appState.isLoading) {
				const connected = await apiService.connectToApi(credentials.domain, credentials.token);
				if (connected) {
					// Redirect to dashboard if already connected
					navigateTo('/dashboard');
					return;
				}
			}

			// PWA installation prompt handling
			window.addEventListener('beforeinstallprompt', (e) => {
				e.preventDefault();
				deferredPrompt = e as Event & {
					prompt(): Promise<void>;
					userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
				};
				showInstallButton = true;
			});

			// Handle successful PWA installation
			window.addEventListener('appinstalled', () => {
				showInstallButton = false;
				deferredPrompt = null;
				addToast({
					type: 'success',
					message: 'App installed successfully!'
				});
			});

			// Check if app is already installed
			if (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) {
				showInstallButton = false;
			}
		}
	});

	async function handleInstallClick() {
		if (!deferredPrompt) return;

		try {
			deferredPrompt.prompt();
			const { outcome } = await deferredPrompt.userChoice;

			if (outcome === 'accepted') {
				addToast({
					type: 'success',
					message: 'Installing app...'
				});
			}

			deferredPrompt = null;
			showInstallButton = false;
		} catch {
			addToast({
				type: 'error',
				message: 'Failed to install app'
			});
		}
	}
</script>

<svelte:head>
	<title>devil WEB - API Client</title>
	<meta name="description" content="Progressive Web App client for devil API" />
</svelte:head>

<div class="relative min-h-screen">
	<AuthForm />

	<!-- PWA Install Button -->
	{#if showInstallButton}
		<div class="fixed bottom-4 right-4 z-40">
			<button
				on:click={handleInstallClick}
				class="bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg shadow-lg transition-colors duration-200 flex items-center space-x-2"
				aria-label="Install devil WEB app"
			>
				<svg
					class="w-5 h-5"
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
					xmlns="http://www.w3.org/2000/svg"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
					></path>
				</svg>
				<span>Install App</span>
			</button>
		</div>
	{/if}
</div>
