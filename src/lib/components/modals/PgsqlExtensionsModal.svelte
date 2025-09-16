<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { apiPut } from '$lib/utils';
	import { addToast } from '$lib/stores/appState';

	export let showModal: boolean = false;
	export let loading: boolean = false;
	export let database: Record<string, unknown> | null = null;
	export let availableExtensions: string[] = [];

	// Available PostgreSQL extensions - passed as prop
	let installingExtension: string | null = null;

	const dispatch = createEventDispatcher();

	function closeModal() {
		if (!loading && !installingExtension) {
			dispatch('cancel');
		}
	}

	function isExtensionInstalled(extensionName: string): boolean {
		if (!database?.extensions) return false;
		const extensions = database.extensions as Record<string, unknown>;
		return extensions[extensionName] === true || extensions[extensionName] === 'installed';
	}

	async function installExtension(extensionName: string) {
		if (!database || installingExtension) return;

		installingExtension = extensionName;

		try {
			await apiPut('/pgsql/extensions', {
				database_name: database.name,
				extension: extensionName
			});

			addToast({
				type: 'success',
				message: `Extension ${extensionName} installed successfully`
			});

			// Update the database extensions locally
			if (!database.extensions) {
				database.extensions = {};
			}
			(database.extensions as Record<string, unknown>)[extensionName] = true;

			// Trigger a refresh of the parent component
			dispatch('extensionInstalled', { extension: extensionName });
		} catch (error) {
			console.error('Error installing extension:', error);
			addToast({
				type: 'error',
				message: `Failed to install extension ${extensionName}`
			});
		} finally {
			installingExtension = null;
		}
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape' && !loading && !installingExtension) {
			closeModal();
		}
	}
</script>

<svelte:window on:keydown={handleKeydown} />

{#if showModal}
	<div class="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
		<div
			class="bg-white dark:bg-dark-800 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
		>
			<div class="p-6">
				<div class="flex justify-between items-center mb-6">
					<h2 class="text-xl font-bold text-gray-900 dark:text-white">
						Manage Extensions - {database?.name || 'Database'}
					</h2>
					{#if !loading && !installingExtension}
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

				<div class="mb-6">
					<p class="text-gray-600 dark:text-gray-400 text-sm">
						Install PostgreSQL extensions for this database. Once installed, extensions cannot be
						removed.
					</p>
				</div>

				<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
					{#if !Array.isArray(availableExtensions) || availableExtensions.length === 0}
						<div class="col-span-full text-center py-8 text-gray-500 dark:text-gray-400">
							No extensions available
						</div>
					{:else}
						{#each availableExtensions as extension (extension)}
							<div class="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
								<div class="flex items-center justify-between">
									<div class="flex-1">
										<h3 class="font-medium text-gray-900 dark:text-white">{extension}</h3>
										{#if isExtensionInstalled(extension)}
											<span class="text-xs text-green-600 dark:text-green-400 font-medium"
												>Installed</span
											>
										{:else}
											<span class="text-xs text-gray-500 dark:text-gray-400">Not installed</span>
										{/if}
									</div>
									<div class="ml-4">
										{#if isExtensionInstalled(extension)}
											<span
												class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
											>
												<svg class="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
													<path
														fill-rule="evenodd"
														d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
														clip-rule="evenodd"
													></path>
												</svg>
												Enabled
											</span>
										{:else}
											<button
												on:click={() => installExtension(extension)}
												disabled={!!installingExtension}
												class="btn-primary text-xs px-3 py-1 {installingExtension === extension
													? 'opacity-50 cursor-not-allowed'
													: ''}"
											>
												{#if installingExtension === extension}
													<svg
														class="animate-spin h-3 w-3 mr-1 inline"
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
													Installing...
												{:else}
													Install
												{/if}
											</button>
										{/if}
									</div>
								</div>
							</div>
						{/each}
					{/if}
				</div>

				<div class="flex justify-end mt-6">
					<button
						on:click={closeModal}
						disabled={loading || !!installingExtension}
						class="btn-secondary"
					>
						Close
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}
