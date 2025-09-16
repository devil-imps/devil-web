<script lang="ts">
	import { createEventDispatcher } from 'svelte';

	export let showModal: boolean = false;
	export let loading: boolean = false;

	let repoName: string = '';
	let repoType: 'git' | 'svn' | 'hg' = 'git';
	let repoVisibility: 'Private' | 'Public' = 'Private';

	const dispatch = createEventDispatcher();

	function closeModal() {
		if (!loading) {
			resetForm();
			dispatch('cancel');
		}
	}

	function resetForm() {
		repoName = '';
		repoType = 'git';
		repoVisibility = 'Private';
	}

	function handleSubmit() {
		// Convert display values to API values
		const visibilityMap = {
			Private: 'priv',
			Public: 'pub'
		};

		const repoData = {
			repo_name: repoName.trim(),
			repo_type: repoType,
			repo_visibility: visibilityMap[repoVisibility]
		};

		dispatch('submit', repoData);
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape' && !loading) {
			closeModal();
		}
		if (event.key === 'Enter' && !loading && buttonEnabled) {
			handleSubmit();
		}
	}

	// Reset form when modal is closed
	$: if (!showModal) {
		resetForm();
	}

	// Reactive statement for button state
	$: buttonEnabled = repoName.trim().length > 0;
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
					<h2 class="text-xl font-bold text-gray-900 dark:text-white">Add Repository</h2>
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
					<!-- Repository Name Input -->
					<div>
						<label
							for="repoName"
							class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
						>
							Repository Name
						</label>
						<input
							type="text"
							id="repoName"
							bind:value={repoName}
							placeholder="my-awesome-repo"
							class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-hidden focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
							disabled={loading}
							required
						/>
					</div>

					<!-- Repository Type Selection -->
					<fieldset>
						<legend class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
							Repository Type
						</legend>
						<div class="flex space-x-6">
							<label class="flex items-center cursor-pointer select-none">
								<div class="relative">
									<input
										type="radio"
										name="repoType"
										value="git"
										bind:group={repoType}
										class="sr-only peer"
										disabled={loading}
									/>
									<div
										class="w-4 h-4 bg-gray-200 dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 rounded-full peer-checked:bg-blue-600 peer-checked:border-blue-600 peer-focus:ring-2 peer-focus:ring-blue-500 peer-focus:ring-offset-2 dark:peer-focus:ring-offset-gray-800 transition-colors duration-200"
									></div>
									<div
										class="absolute inset-0 flex items-center justify-center opacity-0 peer-checked:opacity-100 transition-opacity duration-200"
									>
										<div class="w-2 h-2 bg-white rounded-full"></div>
									</div>
								</div>
								<span class="ml-3 text-sm text-gray-700 dark:text-gray-300">Git</span>
							</label>
							<label class="flex items-center cursor-pointer select-none">
								<div class="relative">
									<input
										type="radio"
										name="repoType"
										value="svn"
										bind:group={repoType}
										class="sr-only peer"
										disabled={loading}
									/>
									<div
										class="w-4 h-4 bg-gray-200 dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 rounded-full peer-checked:bg-blue-600 peer-checked:border-blue-600 peer-focus:ring-2 peer-focus:ring-blue-500 peer-focus:ring-offset-2 dark:peer-focus:ring-offset-gray-800 transition-colors duration-200"
									></div>
									<div
										class="absolute inset-0 flex items-center justify-center opacity-0 peer-checked:opacity-100 transition-opacity duration-200"
									>
										<div class="w-2 h-2 bg-white rounded-full"></div>
									</div>
								</div>
								<span class="ml-3 text-sm text-gray-700 dark:text-gray-300">Subversion</span>
							</label>
							<label class="flex items-center cursor-pointer select-none">
								<div class="relative">
									<input
										type="radio"
										name="repoType"
										value="hg"
										bind:group={repoType}
										class="sr-only peer"
										disabled={loading}
									/>
									<div
										class="w-4 h-4 bg-gray-200 dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 rounded-full peer-checked:bg-blue-600 peer-checked:border-blue-600 peer-focus:ring-2 peer-focus:ring-blue-500 peer-focus:ring-offset-2 dark:peer-focus:ring-offset-gray-800 transition-colors duration-200"
									></div>
									<div
										class="absolute inset-0 flex items-center justify-center opacity-0 peer-checked:opacity-100 transition-opacity duration-200"
									>
										<div class="w-2 h-2 bg-white rounded-full"></div>
									</div>
								</div>
								<span class="ml-3 text-sm text-gray-700 dark:text-gray-300">Mercurial</span>
							</label>
						</div>
					</fieldset>

					<!-- Repository Visibility Selection -->
					<fieldset>
						<legend class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
							Visibility
						</legend>
						<div class="flex space-x-6">
							<label class="flex items-center cursor-pointer select-none">
								<div class="relative">
									<input
										type="radio"
										name="repoVisibility"
										value="Private"
										bind:group={repoVisibility}
										class="sr-only peer"
										disabled={loading}
									/>
									<div
										class="w-4 h-4 bg-gray-200 dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 rounded-full peer-checked:bg-blue-600 peer-checked:border-blue-600 peer-focus:ring-2 peer-focus:ring-blue-500 peer-focus:ring-offset-2 dark:peer-focus:ring-offset-gray-800 transition-colors duration-200"
									></div>
									<div
										class="absolute inset-0 flex items-center justify-center opacity-0 peer-checked:opacity-100 transition-opacity duration-200"
									>
										<div class="w-2 h-2 bg-white rounded-full"></div>
									</div>
								</div>
								<span class="ml-3 text-sm text-gray-700 dark:text-gray-300">Private</span>
							</label>
							<label class="flex items-center cursor-pointer select-none">
								<div class="relative">
									<input
										type="radio"
										name="repoVisibility"
										value="Public"
										bind:group={repoVisibility}
										class="sr-only peer"
										disabled={loading}
									/>
									<div
										class="w-4 h-4 bg-gray-200 dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 rounded-full peer-checked:bg-blue-600 peer-checked:border-blue-600 peer-focus:ring-2 peer-focus:ring-blue-500 peer-focus:ring-offset-2 dark:peer-focus:ring-offset-gray-800 transition-colors duration-200"
									></div>
									<div
										class="absolute inset-0 flex items-center justify-center opacity-0 peer-checked:opacity-100 transition-opacity duration-200"
									>
										<div class="w-2 h-2 bg-white rounded-full"></div>
									</div>
								</div>
								<span class="ml-3 text-sm text-gray-700 dark:text-gray-300">Public</span>
							</label>
						</div>
					</fieldset>
				</form>

				<div class="flex justify-end space-x-3 mt-6">
					<button on:click={closeModal} disabled={loading} class="btn-secondary"> Cancel </button>
					<button
						on:click={handleSubmit}
						disabled={loading || !buttonEnabled}
						class="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
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
						Add Repository
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}
