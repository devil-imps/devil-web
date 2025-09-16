<script lang="ts">
	import { createEventDispatcher } from 'svelte';

	export let showModal: boolean = false;
	export let website: Record<string, unknown> | null = null;
	export let loading: boolean = false;

	const dispatch = createEventDispatcher();

	function closeModal() {
		if (!loading) {
			dispatch('cancel');
		}
	}

	function handleDelete() {
		dispatch('delete');
	}

	function handleDeleteWithFiles() {
		dispatch('deleteWithFiles');
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape' && !loading) {
			closeModal();
		}
	}
</script>

<svelte:window on:keydown={handleKeydown} />

{#if showModal}
	<div class="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
		<div class="bg-white dark:bg-dark-800 rounded-lg max-w-md w-full">
			<div class="p-6">
				<div class="flex justify-between items-center mb-4">
					<h2 class="text-xl font-bold text-gray-900 dark:text-white">Delete Website</h2>
					{#if !loading}
						<button
							on:click={closeModal}
							class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
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

				<div class="mb-6">
					<p class="text-gray-600 dark:text-gray-400 mb-4">
						Are you sure you want to delete website <strong>{website?.domain}</strong>?
					</p>
					<div
						class="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4"
					>
						<div class="flex">
							<svg
								class="w-5 h-5 text-yellow-400 mr-3 shrink-0"
								fill="currentColor"
								viewBox="0 0 20 20"
							>
								<path
									fill-rule="evenodd"
									d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
									clip-rule="evenodd"
								></path>
							</svg>
							<div>
								<h3 class="text-sm font-medium text-yellow-800 dark:text-yellow-200">
									Choose deletion method:
								</h3>
								<div class="mt-2 text-sm text-yellow-700 dark:text-yellow-300">
									<ul class="list-disc list-inside space-y-1">
										<li><strong>Delete:</strong> Removes website configuration only</li>
										<li>
											<strong>Delete (purge website files):</strong> Removes configuration AND all website
											files
										</li>
									</ul>
								</div>
							</div>
						</div>
					</div>
				</div>

				<div class="flex justify-end space-x-3">
					<button on:click={closeModal} disabled={loading} class="btn-secondary"> Cancel </button>
					<button
						on:click={handleDelete}
						disabled={loading}
						class="btn-secondary {loading ? 'opacity-50 cursor-not-allowed' : ''}"
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
						Delete
					</button>
					<button
						on:click={handleDeleteWithFiles}
						disabled={loading}
						class="btn-danger {loading ? 'opacity-50 cursor-not-allowed' : ''}"
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
						Delete (purge website files)
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}
