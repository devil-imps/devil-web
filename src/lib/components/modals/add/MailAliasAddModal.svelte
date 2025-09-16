<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { addToast } from '$lib/stores/appState';

	export let showModal: boolean = false;
	export let loading: boolean = false;

	let emailFrom: string = '';
	let emailTo: string = '';

	const dispatch = createEventDispatcher();

	// Reset form when modal is first opened
	$: if (showModal && !loading) {
		resetForm();
	}

	function closeModal() {
		if (!loading) {
			resetForm();
			dispatch('cancel');
		}
	}

	function resetForm() {
		emailFrom = '';
		emailTo = '';
	}

	function handleSubmit() {
		if (!emailFrom.trim() || !emailTo.trim()) {
			addToast({
				type: 'error',
				message: 'Please fill in all required fields'
			});
			return;
		}

		dispatch('submit', {
			email_from: emailFrom.trim(),
			email_to: emailTo.trim(),
			type: 'normal'
		});
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Enter' && !loading && emailFrom.trim() && emailTo.trim()) {
			handleSubmit();
		}
	}
</script>

<svelte:window on:keydown={handleKeydown} />

{#if showModal}
	<div class="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
		<div class="bg-white dark:bg-dark-800 rounded-lg max-w-md w-full">
			<div class="p-6">
				<div class="flex justify-between items-center mb-4">
					<h2 class="text-xl font-bold text-gray-900 dark:text-white">Add Email Alias</h2>
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

				<form on:submit|preventDefault={handleSubmit} class="space-y-4">
					<div>
						<label
							for="emailFrom"
							class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
						>
							E-mail address (from)
						</label>
						<input
							type="text"
							id="emailFrom"
							bind:value={emailFrom}
							placeholder="alias@domain.com or @domain.com"
							class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-hidden focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
							disabled={loading}
							required
							on:keydown={handleKeydown}
						/>
						<p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
							For normal aliases use <strong>alias@domain.com</strong>. For catch-all aliases use
							<strong>@domain.com</strong>
						</p>
					</div>

					<div>
						<label
							for="emailTo"
							class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
						>
							E-mail address (to)
						</label>
						<input
							type="email"
							id="emailTo"
							bind:value={emailTo}
							placeholder="destination@domain.com"
							class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-hidden focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
							disabled={loading}
							required
							on:keydown={handleKeydown}
						/>
						<p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
							Where emails should be forwarded to
						</p>
					</div>
				</form>

				<div class="flex justify-end space-x-3 mt-6">
					<button on:click={closeModal} disabled={loading} class="btn-secondary"> Cancel </button>
					<button
						on:click={handleSubmit}
						disabled={loading || !emailFrom.trim() || !emailTo.trim()}
						class="btn-primary {loading || !emailFrom.trim() || !emailTo.trim()
							? 'opacity-50 cursor-not-allowed'
							: ''}"
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
						Add Alias
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}
