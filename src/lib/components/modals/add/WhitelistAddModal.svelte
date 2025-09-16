<script lang="ts">
	import { createEventDispatcher } from 'svelte';

	export let showModal: boolean = false;
	export let loading: boolean = false;

	let domain: string = '';

	const dispatch = createEventDispatcher();

	// Reactive statement for button state
	$: buttonEnabled = domain.trim() !== '';

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
		domain = '';
	}

	function handleSubmit() {
		const whitelistData = {
			domain: domain.trim()
		};

		dispatch('submit', whitelistData);
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape' && !loading) {
			closeModal();
		}
		if (event.key === 'Enter' && !loading && buttonEnabled) {
			handleSubmit();
		}
	}
</script>

<svelte:window on:keydown={handleKeydown} />

{#if showModal}
	<!-- Backdrop -->
	<div
		class="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
		style="z-index: 9999;"
	>
		<!-- Modal Container -->
		<div
			class="bg-white dark:bg-dark-800 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700 max-w-md w-full max-h-[90vh] overflow-y-auto"
		>
			<div class="p-6">
				<div class="flex justify-between items-center mb-6">
					<h2 class="text-xl font-bold text-gray-900 dark:text-white">Add Domain to Whitelist</h2>
					{#if !loading}
						<button
							on:click={closeModal}
							class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200"
							type="button"
							aria-label="Close modal"
						>
							<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M6 18L18 6M6 6l12 12"
								></path>
							</svg>
						</button>
					{/if}
				</div>

				<form on:submit|preventDefault={handleSubmit} class="space-y-4">
					<!-- Domain Input -->
					<div>
						<label
							for="domain"
							class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
						>
							Domain
						</label>
						<input
							type="text"
							id="domain"
							bind:value={domain}
							placeholder="example.com"
							class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-hidden focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
							disabled={loading}
							required
						/>
						<p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
							Enter the domain you want to add to the mail whitelist
						</p>
					</div>
				</form>

				<div class="flex justify-end space-x-3 mt-6">
					<button on:click={closeModal} disabled={loading} class="btn-secondary"> Cancel </button>
					<button
						on:click={handleSubmit}
						disabled={loading || !buttonEnabled}
						class="btn-primary {loading || !buttonEnabled ? 'opacity-50 cursor-not-allowed' : ''}"
					>
						{#if loading}
							<svg class="animate-spin h-4 w-4 mr-2 inline" fill="none" viewBox="0 0 24 24">
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
						Add Domain
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}
