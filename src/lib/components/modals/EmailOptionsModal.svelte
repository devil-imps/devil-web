<script lang="ts">
	import { createEventDispatcher } from 'svelte';

	export let showModal: boolean = false;
	export let loading: boolean = false;
	export let domain: string = '';
	export let originalOptionValues: Record<string, string> = {};

	// Email options state
	export let optionRbl: boolean = false;
	export let optionSpamfilter: boolean = false;
	export let optionRestrictspf: string = 'off';
	export let optionMovespam: boolean = false;
	export let optionAllownets: string = '';
	export let optionHidesenderip: boolean = false;

	const dispatch = createEventDispatcher();

	function closeModal() {
		if (!loading) {
			dispatch('cancel');
		}
	}

	function handleSubmit() {
		// Get current values - convert to API-expected format
		const currentValues = {
			rbl: optionRbl ? 'on' : 'off',
			spamfilter: optionSpamfilter ? 'on' : 'off',
			restrictspf: optionRestrictspf, // already 'on', 'off', or 'reject'
			movespam: optionMovespam ? 'on' : 'off',
			allownets: optionAllownets,
			hidesenderip: optionHidesenderip ? 'on' : 'off'
		};

		// Only include options that have changed and are not empty (except for allownets which can be empty)
		const changedOptions = Object.entries(currentValues)
			.filter(([key, value]) => {
				const originalValue = originalOptionValues[key];
				const hasChanged = value !== originalValue;
				const isNotEmpty = key === 'allownets' ? true : value.trim() !== '';
				return hasChanged && isNotEmpty;
			})
			.map(([option, value]) => ({ option, value }));

		// Only submit if there are changes
		if (changedOptions.length > 0) {
			dispatch('submit', {
				domain,
				options: changedOptions
			});
		} else {
			// No changes made, still dispatch submit with empty options
			dispatch('submit', {
				domain,
				options: []
			});
		}
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
		<div class="bg-white dark:bg-dark-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
			<div class="p-6">
				<div class="flex justify-between items-center mb-6">
					<h2 class="text-xl font-bold text-gray-900 dark:text-white">Email Options - {domain}</h2>
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

				<form on:submit|preventDefault={handleSubmit} class="space-y-6">
					<!-- RBL Option -->
					<div class="flex items-center justify-between p-4 bg-gray-50 dark:bg-dark-700 rounded-lg">
						<div>
							<label
								for="optionRbl"
								class="text-sm font-medium text-gray-900 dark:text-white cursor-pointer"
								>RBL (Real-time Blackhole List)</label
							>
							<p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
								Enable RBL checking for incoming emails
							</p>
						</div>
						<label class="relative inline-flex items-center cursor-pointer">
							<input
								type="checkbox"
								id="optionRbl"
								bind:checked={optionRbl}
								class="sr-only peer"
								disabled={loading}
							/>
							<div
								class="w-11 h-6 bg-gray-200 peer-focus:outline-hidden peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"
							></div>
						</label>
					</div>

					<!-- Spam Filter Option -->
					<div class="flex items-center justify-between p-4 bg-gray-50 dark:bg-dark-700 rounded-lg">
						<div>
							<label
								for="optionSpamfilter"
								class="text-sm font-medium text-gray-900 dark:text-white cursor-pointer"
								>Spam Filter</label
							>
							<p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
								Enable spam filtering for incoming emails
							</p>
						</div>
						<label class="relative inline-flex items-center cursor-pointer">
							<input
								type="checkbox"
								id="optionSpamfilter"
								bind:checked={optionSpamfilter}
								class="sr-only peer"
								disabled={loading}
							/>
							<div
								class="w-11 h-6 bg-gray-200 peer-focus:outline-hidden peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"
							></div>
						</label>
					</div>

					<!-- Restrict SPF Option -->
					<fieldset class="p-4 bg-gray-50 dark:bg-dark-700 rounded-lg">
						<legend class="text-sm font-medium text-gray-900 dark:text-white block mb-3"
							>Restrict SPF</legend
						>
						<p class="text-xs text-gray-500 dark:text-gray-400 mb-3">
							Control SPF validation behavior
						</p>
						<div class="space-y-2">
							<label class="flex items-center">
								<input
									type="radio"
									name="restrictSpf"
									bind:group={optionRestrictspf}
									value="off"
									disabled={loading}
									class="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
								/>
								<span class="ml-2 text-sm text-gray-900 dark:text-gray-300">Off</span>
							</label>
							<label class="flex items-center">
								<input
									type="radio"
									name="restrictSpf"
									bind:group={optionRestrictspf}
									value="on"
									disabled={loading}
									class="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
								/>
								<span class="ml-2 text-sm text-gray-900 dark:text-gray-300">On</span>
							</label>
							<label class="flex items-center">
								<input
									type="radio"
									name="restrictSpf"
									bind:group={optionRestrictspf}
									value="reject"
									disabled={loading}
									class="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
								/>
								<span class="ml-2 text-sm text-gray-900 dark:text-gray-300">Reject</span>
							</label>
						</div>
					</fieldset>

					<!-- Move Spam Option -->
					<div class="flex items-center justify-between p-4 bg-gray-50 dark:bg-dark-700 rounded-lg">
						<div>
							<label
								for="optionMovespam"
								class="text-sm font-medium text-gray-900 dark:text-white cursor-pointer"
								>Move Spam</label
							>
							<p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
								Move detected spam to spam folder
							</p>
						</div>
						<label class="relative inline-flex items-center cursor-pointer">
							<input
								type="checkbox"
								id="optionMovespam"
								bind:checked={optionMovespam}
								class="sr-only peer"
								disabled={loading}
							/>
							<div
								class="w-11 h-6 bg-gray-200 peer-focus:outline-hidden peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"
							></div>
						</label>
					</div>

					<!-- Allow Nets Option -->
					<div class="p-4 bg-gray-50 dark:bg-dark-700 rounded-lg">
						<label
							for="allowNets"
							class="text-sm font-medium text-gray-900 dark:text-white block mb-2"
							>Allow Networks</label
						>
						<p class="text-xs text-gray-500 dark:text-gray-400 mb-3">
							Comma-separated list of IP addresses/networks to allow
						</p>
						<input
							type="text"
							id="allowNets"
							bind:value={optionAllownets}
							placeholder="192.168.1.0/24, 10.0.0.1"
							disabled={loading}
							class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-hidden focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
						/>
					</div>

					<!-- Hide Sender IP Option -->
					<div class="flex items-center justify-between p-4 bg-gray-50 dark:bg-dark-700 rounded-lg">
						<div>
							<label
								for="optionHidesenderip"
								class="text-sm font-medium text-gray-900 dark:text-white cursor-pointer"
								>Hide Sender IP</label
							>
							<p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
								Hide sender IP address in outgoing emails
							</p>
						</div>
						<label class="relative inline-flex items-center cursor-pointer">
							<input
								type="checkbox"
								id="optionHidesenderip"
								bind:checked={optionHidesenderip}
								class="sr-only peer"
								disabled={loading}
							/>
							<div
								class="w-11 h-6 bg-gray-200 peer-focus:outline-hidden peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"
							></div>
						</label>
					</div>
				</form>

				<div class="flex justify-end space-x-3 mt-6">
					<button on:click={closeModal} disabled={loading} class="btn-secondary"> Cancel </button>
					<button
						on:click={handleSubmit}
						disabled={loading}
						class="btn-primary {loading ? 'opacity-50 cursor-not-allowed' : ''}"
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
						Update Options
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}
