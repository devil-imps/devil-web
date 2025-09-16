<script lang="ts">
	import { createEventDispatcher } from 'svelte';

	export let showModal: boolean = false;
	export let loading: boolean = false;

	let portType: 'tcp' | 'udp' = 'tcp';
	let portNumber: number | string = '';
	let isRandom: boolean = false;
	let description: string = '';

	const dispatch = createEventDispatcher();

	// Reactive statement for button state
	$: buttonEnabled = isRandom || (portNumber && String(portNumber).trim() !== '');

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
		portType = 'tcp';
		portNumber = '';
		isRandom = false;
		description = '';
	}

	function handleSubmit() {
		const portData = {
			type: portType,
			port: isRandom ? null : portNumber ? parseInt(String(portNumber)) : null,
			random: isRandom,
			description: description.trim() || null
		};

		dispatch('submit', portData);
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape' && !loading) {
			closeModal();
		}
		if (event.key === 'Enter' && !loading && canSubmit()) {
			handleSubmit();
		}
	}

	function canSubmit(): boolean {
		if (isRandom) {
			return true;
		}
		const portStr = String(portNumber);
		return (
			portStr.trim() !== '' &&
			!isNaN(Number(portNumber)) &&
			Number(portNumber) > 1024 &&
			Number(portNumber) <= 64000
		);
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
					<h2 class="text-xl font-bold text-gray-900 dark:text-white">Add Port</h2>
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
					<!-- Port Type Selection -->
					<fieldset>
						<legend class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
							Port Type
						</legend>
						<div class="flex space-x-6">
							<label class="flex items-center cursor-pointer select-none">
								<div class="relative">
									<input
										type="radio"
										name="portType"
										value="tcp"
										bind:group={portType}
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
								<span class="ml-3 text-sm text-gray-700 dark:text-gray-300">TCP</span>
							</label>
							<label class="flex items-center cursor-pointer select-none">
								<div class="relative">
									<input
										type="radio"
										name="portType"
										value="udp"
										bind:group={portType}
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
								<span class="ml-3 text-sm text-gray-700 dark:text-gray-300">UDP</span>
							</label>
						</div>
					</fieldset>

					<!-- Random Port Checkbox -->
					<div class="flex items-center">
						<div class="relative">
							<input
								type="checkbox"
								id="random"
								bind:checked={isRandom}
								class="sr-only peer"
								disabled={loading}
							/>
							<div
								class="w-4 h-4 bg-gray-200 dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 rounded-sm peer-checked:bg-blue-600 peer-checked:border-blue-600 peer-focus:ring-2 peer-focus:ring-blue-500 peer-focus:ring-offset-2 dark:peer-focus:ring-offset-gray-800 transition-colors duration-200"
							></div>
							<div
								class="absolute inset-0 flex items-center justify-center text-white opacity-0 peer-checked:opacity-100 transition-opacity duration-200"
							>
								<svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
									<path
										fill-rule="evenodd"
										d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
										clip-rule="evenodd"
									></path>
								</svg>
							</div>
						</div>
						<label
							for="random"
							class="ml-3 text-sm text-gray-700 dark:text-gray-300 cursor-pointer select-none"
						>
							Use random available port
						</label>
					</div>

					<!-- Port Number Input -->
					{#if !isRandom}
						<div>
							<label
								for="portNumber"
								class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
							>
								Port Number
							</label>
							<input
								type="number"
								id="portNumber"
								bind:value={portNumber}
								placeholder="Enter port number (1024-64000)"
								min="1024"
								max="64000"
								class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-hidden focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
								disabled={loading}
								required={!isRandom}
							/>
						</div>
					{/if}

					<!-- Description Input -->
					<div>
						<label
							for="description"
							class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
						>
							Description (Optional)
						</label>
						<input
							type="text"
							id="description"
							bind:value={description}
							placeholder="Enter a description for this port"
							class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-hidden focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
							disabled={loading}
						/>
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
						Add Port
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}
