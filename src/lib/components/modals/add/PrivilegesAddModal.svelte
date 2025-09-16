<script lang="ts">
	import { createEventDispatcher } from 'svelte';

	export let showModal: boolean;
	export let databaseName: string;
	export let allUsers: Record<string, unknown>[] = [];
	export let databaseUsers: Record<string, unknown>[] = [];
	export let loading: boolean = false;

	const dispatch = createEventDispatcher();

	function handleUserSelect(user: Record<string, unknown>) {
		dispatch('addPrivileges', { user });
	}

	function handleCancel() {
		dispatch('cancel');
	}
</script>

{#if showModal}
	<div class="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
		<div
			class="bg-white dark:bg-dark-800 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700 max-w-md w-full max-h-[90vh] overflow-y-auto"
		>
			<div class="p-6">
				<div class="flex justify-between items-center mb-6">
					<h2 class="text-xl font-bold text-gray-900 dark:text-white">Add Database Privileges</h2>
					{#if !loading}
						<button
							on:click={handleCancel}
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

				<div class="mb-4">
					<p class="text-sm text-gray-600 dark:text-gray-400 mb-4">
						Select a MySQL user to grant access to database <strong>{databaseName}</strong>:
					</p>
				</div>

				<div class="space-y-2 max-h-60 overflow-y-auto">
					{#each allUsers as user (`${user.User}@${user.Host || '%'}`)}
						{@const username = String(user.User || '')}
						{@const isAlreadyAdded = databaseUsers.some((dbUser) => dbUser.User === username)}
						<button
							type="button"
							on:click={() => handleUserSelect(user)}
							disabled={loading || isAlreadyAdded}
							class="w-full text-left px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 {isAlreadyAdded
								? 'bg-gray-100 dark:bg-gray-800'
								: ''}"
						>
							<div class="flex items-center justify-between">
								<div>
									<span class="font-medium text-gray-900 dark:text-white">{username}</span>
									<span class="text-sm text-gray-500 dark:text-gray-400 ml-2">({user.Host})</span>
								</div>
								{#if isAlreadyAdded}
									<span class="text-xs text-green-600 dark:text-green-400 font-medium"
										>Already added</span
									>
								{:else}
									<svg
										class="w-5 h-5 text-gray-400"
										fill="none"
										stroke="currentColor"
										viewBox="0 0 24 24"
									>
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="2"
											d="M9 5l7 7-7 7"
										></path>
									</svg>
								{/if}
							</div>
						</button>
					{/each}
				</div>

				{#if allUsers.length === 0}
					<div class="text-center py-8">
						<p class="text-gray-500 dark:text-gray-400">No MySQL users available</p>
					</div>
				{/if}

				<div class="flex justify-end mt-6">
					<button
						type="button"
						on:click={handleCancel}
						disabled={loading}
						class="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
					>
						Cancel
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}
