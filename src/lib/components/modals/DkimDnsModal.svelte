<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { addToast } from '$lib/stores/appState';

	export let showModal: boolean = false;
	export let domain: string = '';
	export let dnsRecord: string = '';
	export let dnsRecordName: string = '';
	export let dnsRecordContent: string = '';
	export let loading: boolean = false;

	const dispatch = createEventDispatcher();

	function closeModal() {
		if (!loading) {
			dispatch('close');
		}
	}

	function handleUnsign() {
		dispatch('unsign');
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape' && !loading) {
			closeModal();
		}
	}

	function copyToClipboard(text?: string) {
		const textToCopy = text || dnsRecord;
		if (textToCopy) {
			navigator.clipboard
				.writeText(textToCopy)
				.then(() => {
					addToast({
						type: 'success',
						message: 'Copied to clipboard!',
						duration: 2000
					});
				})
				.catch(() => {
					addToast({
						type: 'error',
						message: 'Failed to copy to clipboard',
						duration: 3000
					});
				});
		}
	}
</script>

<svelte:window on:keydown={handleKeydown} />

{#if showModal}
	<div class="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
		<div class="bg-white dark:bg-dark-800 rounded-lg max-w-2xl w-full">
			<div class="p-6">
				<div class="flex justify-between items-center mb-4">
					<h2 class="text-xl font-bold text-gray-900 dark:text-white">DKIM DNS Record</h2>
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
						DKIM is configured for domain: <strong>{domain}</strong>
					</p>
					<p class="text-sm text-gray-500 dark:text-gray-500 mb-4">
						Add the following DNS record to your domain's DNS configuration:
					</p>
				</div>

				<div class="mb-6">
					<div class="space-y-4">
						<!-- DNS Record Name Field -->
						<div class="bg-gray-50 dark:bg-dark-700 rounded-lg p-4 border">
							<div class="flex items-center justify-between mb-2">
								<span class="text-sm font-medium text-gray-700 dark:text-gray-300">DNS Record:</span
								>
								<button
									on:click={() => copyToClipboard(dnsRecordName)}
									class="inline-flex items-center px-2 py-1 text-xs bg-gray-200 hover:bg-gray-300 dark:bg-dark-600 dark:hover:bg-dark-500 text-gray-700 dark:text-gray-300 rounded-sm transition-colors"
									title="Copy DNS record name"
								>
									<svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="2"
											d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
										></path>
									</svg>
									Copy
								</button>
							</div>
							<div class="bg-white dark:bg-dark-800 rounded-sm border p-2">
								<code class="text-sm text-gray-800 dark:text-gray-200 font-mono"
									>{dnsRecordName}</code
								>
							</div>
						</div>

						<!-- DNS Record Content Field -->
						<div class="bg-gray-50 dark:bg-dark-700 rounded-lg p-4 border">
							<div class="flex items-center justify-between mb-2">
								<span class="text-sm font-medium text-gray-700 dark:text-gray-300"
									>DNS Record Content:</span
								>
								<button
									on:click={() => copyToClipboard(dnsRecordContent)}
									class="inline-flex items-center px-2 py-1 text-xs bg-gray-200 hover:bg-gray-300 dark:bg-dark-600 dark:hover:bg-dark-500 text-gray-700 dark:text-gray-300 rounded-sm transition-colors"
									title="Copy DNS record content"
								>
									<svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="2"
											d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
										></path>
									</svg>
									Copy
								</button>
							</div>
							<div class="bg-white dark:bg-dark-800 rounded-sm border p-2">
								<code class="text-xs text-gray-800 dark:text-gray-200 font-mono break-all"
									>{dnsRecordContent}</code
								>
							</div>
						</div>
					</div>
				</div>

				<div class="flex justify-between items-center">
					<button
						on:click={handleUnsign}
						disabled={loading}
						class="inline-flex items-center px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white font-medium text-sm rounded-lg border border-transparent transition-all duration-200 focus:outline-hidden focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-dark-900 shadow-xs hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
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
						Unsign Domain
					</button>

					<button on:click={closeModal} disabled={loading} class="btn-secondary"> Close </button>
				</div>
			</div>
		</div>
	</div>
{/if}
