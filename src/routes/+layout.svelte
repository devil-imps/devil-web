<script lang="ts">
	import '../app.css';
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { appState, fetchAccountInfo } from '$lib/stores/appState';
	import { theme } from '$lib/stores/theme';
	import { navigateTo } from '$lib/utils';
	import Toast from '$lib/components/Toast.svelte';
	import Sidebar from '$lib/components/Sidebar.svelte';

	// Accept params prop to suppress SvelteKit warning
	export const params: Record<string, string> = {};

	let sidebarOpen = false;

	onMount(() => {
		// Initialize theme on app load
		theme.init();

		// Subscribe to theme changes to update document class
		const unsubscribeTheme = theme.subscribe((currentTheme) => {
			if (typeof document !== 'undefined') {
				theme.save(currentTheme);
			}
		});

		// Check authentication for protected routes and fetch account info
		const unsubscribeAppState = appState.subscribe(async (state) => {
			const currentPath = $page.url.pathname;
			const isProtectedRoute = currentPath !== '/' && String(currentPath) !== '/login';

			if (isProtectedRoute && !state.isConnected) {
				navigateTo('/');
			}

			// Fetch account info when connected and account data is not yet loaded
			if (state.isConnected && !state.account) {
				await fetchAccountInfo();
			}
		});

		return () => {
			unsubscribeTheme();
			unsubscribeAppState();
		};
	});

	function toggleSidebar() {
		sidebarOpen = !sidebarOpen;
	}

	$: isAuthPage = $page.url.pathname === '/';
	$: showLayout = $appState.isConnected && !isAuthPage;
</script>

{#if showLayout}
	<div class="flex h-screen bg-gray-50 dark:bg-dark-900">
		<!-- Sidebar -->
		<Sidebar bind:isOpen={sidebarOpen} />

		<!-- Main content -->
		<div class="flex-1 flex flex-col overflow-hidden lg:ml-0">
			<!-- Top bar -->
			<header
				class="bg-white dark:bg-dark-800 border-b border-gray-200 dark:border-dark-700 px-4 py-4 lg:px-6"
			>
				<div class="flex items-center justify-between">
					<div class="flex items-center">
						<!-- Mobile menu button -->
						<button
							class="lg:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-700 mr-4"
							on:click={toggleSidebar}
							aria-label="Open sidebar"
						>
							<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M4 6h16M4 12h16M4 18h16"
								></path>
							</svg>
						</button>

						<h1 class="text-xl font-semibold text-gray-900 dark:text-white">
							<slot name="title">devil WEB</slot>
						</h1>
					</div>

					<div
						class="flex flex-col space-y-2 md:flex-row md:items-center md:space-x-4 md:space-y-0"
					>
						<!-- Connection status -->
						{#if $appState.isConnected}
							<div class="flex items-center space-x-2">
								<div class="w-2 h-2 bg-green-500 rounded-full"></div>
								<span class="text-xs md:text-sm text-gray-600 dark:text-gray-400">Connected</span>
							</div>
						{/if}

						<!-- Username -->
						{#if $appState.account?.account_username}
							<div class="flex items-center space-x-2">
								<svg
									class="w-4 h-4 text-gray-500 dark:text-gray-400"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
									></path>
								</svg>
								<span class="text-xs md:text-sm text-gray-600 dark:text-gray-400">
									{$appState.account.account_username}
								</span>
							</div>
						{/if}
					</div>
				</div>
			</header>

			<!-- Page content -->
			<main class="flex-1 overflow-y-auto p-4 lg:p-6">
				<slot />
			</main>
		</div>
	</div>

	<!-- Loading overlay -->
	{#if $appState.isLoading}
		<div class="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50">
			<div class="bg-white dark:bg-dark-800 rounded-lg p-6 flex items-center space-x-3 shadow-lg">
				<svg
					class="animate-spin h-6 w-6 text-devil-500"
					xmlns="http://www.w3.org/2000/svg"
					fill="none"
					viewBox="0 0 24 24"
				>
					<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"
					></circle>
					<path
						class="opacity-75"
						fill="currentColor"
						d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
					></path>
				</svg>
				<span class="text-gray-900 dark:text-white">Loading...</span>
			</div>
		</div>
	{/if}
{:else}
	<slot />
{/if}

<Toast />
