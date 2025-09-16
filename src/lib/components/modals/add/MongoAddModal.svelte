<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { generateAndCopyPassword } from '$lib/utils';
	import { addToast } from '$lib/stores/appState';

	export let showModal: boolean = false;
	export let loading: boolean = false;

	let databaseName: string = '';
	let password: string = '';
	let showPassword: boolean = false;
	let isFirstOpen: boolean = true;

	const dispatch = createEventDispatcher();

	// Reset form only when modal is first opened, not when reopening after error
	$: if (showModal && !loading && isFirstOpen) {
		resetForm();
		isFirstOpen = false;
	}

	// Reset first open flag when modal is closed
	$: if (!showModal) {
		isFirstOpen = true;
	}

	function closeModal() {
		if (!loading) {
			resetForm();
			dispatch('cancel');
		}
	}

	function resetForm() {
		databaseName = '';
		password = '';
		showPassword = false;
	}

	function togglePasswordVisibility(): void {
		showPassword = !showPassword;
	}

	function passwordInput(node: HTMLInputElement, show: boolean) {
		node.type = show ? 'text' : 'password';
		return {
			update(show: boolean) {
				node.type = show ? 'text' : 'password';
			}
		};
	}

	async function generateRandomPassword(): Promise<void> {
		try {
			const generatedPassword = await generateAndCopyPassword(16);
			password = generatedPassword;

			addToast({
				type: 'success',
				message: 'Random password generated and copied to clipboard!'
			});
		} catch (error) {
			console.error('Failed to generate password:', error);
			addToast({
				type: 'error',
				message: 'Failed to generate password'
			});
		}
	}

	function handleSubmit() {
		if (databaseName.trim() && password.trim()) {
			dispatch('submit', {
				database_name: databaseName.trim(),
				password: password.trim()
			});
		}
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Enter' && !loading && databaseName.trim() && password.trim()) {
			handleSubmit();
		}
	}
</script>

{#if showModal}
	<div class="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
		<div
			class="bg-white dark:bg-dark-800 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700 max-w-md w-full max-h-[90vh] overflow-y-auto"
		>
			<div class="p-6">
				<div class="flex justify-between items-center mb-6">
					<h2 class="text-xl font-bold text-gray-900 dark:text-white">Add MongoDB Database</h2>
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
					<div>
						<label
							for="databaseName"
							class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
						>
							Database Name
						</label>
						<input
							type="text"
							id="databaseName"
							bind:value={databaseName}
							placeholder="Enter database name"
							class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-hidden focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
							disabled={loading}
							required
							on:keydown={handleKeydown}
						/>
						<p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
							Choose a unique name for your MongoDB database
						</p>
					</div>

					<div>
						<label
							for="password"
							class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
						>
							Password
						</label>
						<div class="flex gap-2">
							<div class="relative flex-1">
								<input
									bind:value={password}
									placeholder="Enter password for database user"
									class="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-hidden focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
									disabled={loading}
									required
									on:keydown={handleKeydown}
									use:passwordInput={showPassword}
								/>
								<button
									type="button"
									on:click={togglePasswordVisibility}
									class="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
									disabled={loading}
								>
									{#if showPassword}
										<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												stroke-width="2"
												d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
											></path>
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												stroke-width="2"
												d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
											></path>
										</svg>
									{:else}
										<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												stroke-width="2"
												d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.543-2.29-9.542-7a9.978 9.978 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21"
											></path>
										</svg>
									{/if}
								</button>
							</div>
							<button
								type="button"
								on:click={generateRandomPassword}
								disabled={loading}
								class="px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors duration-200 text-sm font-medium whitespace-nowrap"
							>
								Generate
							</button>
						</div>
						<p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
							Password for the auto-created database user
						</p>
					</div>
				</form>

				<div class="flex justify-end space-x-3 mt-6">
					<button on:click={closeModal} disabled={loading} class="btn-secondary"> Cancel </button>
					<button
						on:click={handleSubmit}
						disabled={loading || !databaseName.trim() || !password.trim()}
						class="btn-primary {loading || !databaseName.trim() || !password.trim()
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
						Add Database
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}
