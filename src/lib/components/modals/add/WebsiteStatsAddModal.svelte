<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { fade, scale } from 'svelte/transition';
	import { addToast } from '$lib/stores/appState';
	import { apiGet } from '$lib/utils';

	export let showModal: boolean = false;
	export let loading: boolean = false;

	let websites: Record<string, unknown>[] = [];
	let selectedWebsite: string = '';
	let modalLoading = false;

	const dispatch = createEventDispatcher();

	// Reactive statement for button state
	$: buttonEnabled = selectedWebsite && selectedWebsite.trim() !== '';

	function closeModal() {
		if (!loading) {
			resetForm();
			dispatch('cancel');
		}
	}

	// Reset form when modal is closed (showModal becomes false)
	$: if (!showModal) {
		resetForm();
	}

	function resetForm() {
		selectedWebsite = '';
		// Don't reset hasLoadedWebsites to keep the loaded state
	}

	function handleSubmit() {
		if (!selectedWebsite) return;

		const websiteData = {
			domain: selectedWebsite
		};

		dispatch('submit', websiteData);
	}

	// Load websites when modal opens
	let hasLoadedWebsites = false;
	let isLoadingWebsites = false;

	// Use a separate flag to trigger loading
	let shouldLoadWebsites = false;

	$: if (showModal && !hasLoadedWebsites && !isLoadingWebsites) {
		shouldLoadWebsites = true;
	}

	$: if (shouldLoadWebsites) {
		shouldLoadWebsites = false;
		loadWebsites();
	}

	async function loadWebsites() {
		if (hasLoadedWebsites || isLoadingWebsites) return; // Prevent multiple calls

		isLoadingWebsites = true;
		modalLoading = true;
		try {
			const data = await apiGet<Record<string, unknown>>('/www/list');
			websites = (data.websites as Record<string, unknown>[]) || [];
			hasLoadedWebsites = true;
		} catch (error) {
			console.error('Error loading websites:', error);
			addToast({
				type: 'error',
				message: 'Failed to load websites list'
			});
		} finally {
			modalLoading = false;
			isLoadingWebsites = false;
		}
	}
</script>

{#if showModal}
	<!-- Backdrop -->
	<div
		class="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4"
		role="dialog"
		aria-modal="true"
		aria-labelledby="modal-title"
		transition:fade={{ duration: 200 }}
	>
		<!-- Modal -->
		<div
			class="bg-white dark:bg-dark-800 rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-hidden"
			role="document"
			transition:scale={{ duration: 200, start: 0.95 }}
		>
			<!-- Header -->
			<div
				class="flex items-center justify-between p-6 border-b border-gray-200 dark:border-dark-700"
			>
				<h2 id="modal-title" class="text-xl font-bold text-gray-900 dark:text-white">
					Add Website to Statistics
				</h2>
				<button
					on:click={closeModal}
					disabled={loading}
					class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed p-1 rounded-full hover:bg-gray-100 dark:hover:bg-dark-700 transition-colors"
					type="button"
					aria-label="Close modal"
				>
					<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M6 18L18 6M6 6l12 12"
						></path>
					</svg>
				</button>
			</div>

			<!-- Body -->
			<div class="p-6 space-y-4">
				<div>
					<label
						for="website-select"
						class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
					>
						Select Website
					</label>
					<select
						id="website-select"
						bind:value={selectedWebsite}
						disabled={loading || modalLoading}
						class="w-full px-3 py-2 border border-gray-300 dark:border-dark-600 rounded-md shadow-xs focus:outline-hidden focus:ring-2 focus:ring-devil-500 focus:border-devil-500 bg-white dark:bg-dark-700 text-gray-900 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed"
					>
						<option value="">Choose a website...</option>
						{#each websites as website (website.domain)}
							<option value={website.domain}>
								{website.domain} ({website.www_type})
							</option>
						{/each}
					</select>
					{#if modalLoading}
						<p class="text-sm text-gray-500 dark:text-gray-400 mt-2">Loading websites...</p>
					{/if}
				</div>
			</div>

			<!-- Footer -->
			<div
				class="flex items-center justify-end gap-3 p-6 border-t border-gray-200 dark:border-dark-700"
			>
				<button
					on:click={closeModal}
					disabled={loading}
					class="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-dark-700 border border-gray-300 dark:border-dark-600 rounded-md hover:bg-gray-50 dark:hover:bg-dark-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
					type="button"
				>
					Cancel
				</button>
				<button
					on:click={handleSubmit}
					disabled={loading || !buttonEnabled}
					class="px-4 py-2 text-sm font-medium text-white bg-devil-500 hover:bg-devil-600 disabled:bg-gray-400 rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
					type="button"
				>
					{#if loading}
						<svg
							class="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
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
					{/if}
					Add to Statistics
				</button>
			</div>
		</div>
	</div>
{/if}

<style>
	/* Custom scrollbar for select */
	select::-webkit-scrollbar {
		width: 8px;
	}

	select::-webkit-scrollbar-track {
		background: #f1f1f1;
		border-radius: 4px;
	}

	select::-webkit-scrollbar-thumb {
		background: #c1c1c1;
		border-radius: 4px;
	}

	select::-webkit-scrollbar-thumb:hover {
		background: #a8a8a8;
	}
</style>
